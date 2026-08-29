import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { clientIp, HttpError, readJson, safeText } from '../lib/http'
import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  randomToken,
  sha256Base64Url,
  validatePassword,
  verifyPassword
} from '../lib/crypto'
import { enforceRateLimit } from '../lib/rate-limit'
import { verifyTurnstile } from '../lib/turnstile'
import {
  resetPasswordEmail,
  sendTransactionalEmail,
  verificationEmail
} from '../lib/email'
import {
  createSession,
  csrfMatches,
  destroySession,
  getSession
} from '../lib/session'

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/register', async (c) => {
  const ip = clientIp(c)
  if (!(await enforceRateLimit(c.env.DB, `register:${ip}`, 5, 900))) {
    throw new HttpError(429, 'Too many registration attempts. Try again later.')
  }

  const body = await readJson<{
    email?: string
    password?: string
    displayName?: string
    turnstileToken?: string
  }>(c)

  const email = normalizeEmail(body.email || '')
  const displayName = safeText(body.displayName, 60)
  const password = body.password || ''

  if (!isValidEmail(email)) throw new HttpError(400, 'Enter a valid email address.')
  if (displayName.length < 2) throw new HttpError(400, 'Enter your name.')
  const passwordError = validatePassword(password)
  if (passwordError) throw new HttpError(400, passwordError)

  const turnstileOk = await verifyTurnstile(c.env, body.turnstileToken || '', ip)
  if (!turnstileOk) throw new HttpError(400, 'Human verification failed.')

  const existing = await c.env.DB
    .prepare('SELECT id, email_verified FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email_verified: number }>()

  if (existing) {
    throw new HttpError(409, 'An account already exists for this email.')
  }

  const userId = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const passwordData = await hashPassword(password, c.env)

  await c.env.DB
    .prepare(
      `INSERT INTO users
       (id, email, display_name, password_hash, password_salt, password_iterations, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(
      userId,
      email,
      displayName,
      passwordData.hash,
      passwordData.salt,
      passwordData.iterations,
      now,
      now
    )
    .run()

  await issueVerificationEmail(c.env.DB, c.env, userId, email, displayName)

  return c.json(
    {
      ok: true,
      message: 'Account created. Check your email to verify your address.'
    },
    201
  )
})

authRoutes.post('/resend-verification', async (c) => {
  const ip = clientIp(c)
  if (!(await enforceRateLimit(c.env.DB, `resend:${ip}`, 5, 900))) {
    throw new HttpError(429, 'Too many requests. Try again later.')
  }

  const body = await readJson<{ email?: string; turnstileToken?: string }>(c)
  const email = normalizeEmail(body.email || '')
  const turnstileOk = await verifyTurnstile(c.env, body.turnstileToken || '', ip)

  if (!turnstileOk) throw new HttpError(400, 'Human verification failed.')

  const user = await c.env.DB
    .prepare('SELECT id, display_name, email_verified FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; display_name: string; email_verified: number }>()

  if (user && !user.email_verified) {
    await issueVerificationEmail(c.env.DB, c.env, user.id, email, user.display_name)
  }

  return c.json({ ok: true, message: 'If verification is still required, a new email has been sent.' })
})

authRoutes.post('/verify-email', async (c) => {
  const body = await readJson<{ token?: string }>(c)
  const token = safeText(body.token, 512)
  if (!token) throw new HttpError(400, 'Verification token is required.')

  const tokenHash = await sha256Base64Url(token)
  const now = Math.floor(Date.now() / 1000)

  const record = await c.env.DB
    .prepare(
      `SELECT id, user_id FROM email_verification_tokens
       WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL`
    )
    .bind(tokenHash, now)
    .first<{ id: string; user_id: string }>()

  if (!record) throw new HttpError(400, 'This verification link is invalid or expired.')

  await c.env.DB.batch([
    c.env.DB
      .prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?')
      .bind(now, record.user_id),
    c.env.DB
      .prepare('UPDATE email_verification_tokens SET used_at = ? WHERE id = ?')
      .bind(now, record.id)
  ])

  return c.json({ ok: true, message: 'Email verified. You can now sign in.' })
})

authRoutes.post('/login', async (c) => {
  const ip = clientIp(c)
  if (!(await enforceRateLimit(c.env.DB, `login:${ip}`, 10, 900))) {
    throw new HttpError(429, 'Too many sign-in attempts. Try again later.')
  }

  const body = await readJson<{ email?: string; password?: string; turnstileToken?: string }>(c)
  const email = normalizeEmail(body.email || '')
  const password = body.password || ''
  const turnstileOk = await verifyTurnstile(c.env, body.turnstileToken || '', ip)

  if (!turnstileOk) throw new HttpError(400, 'Human verification failed.')

  const user = await c.env.DB
    .prepare(
      `SELECT id, email, display_name, password_hash, password_salt, password_iterations, email_verified
       FROM users WHERE email = ?`
    )
    .bind(email)
    .first<{
      id: string
      email: string
      display_name: string
      password_hash: string
      password_salt: string
      password_iterations: number
      email_verified: number
    }>()

  if (!user) {
    // Match the expensive password-verification path to reduce timing-based account enumeration.
    await verifyPassword(
      password,
      'AAAAAAAAAAAAAAAAAAAAAA',
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      Math.max(Number(c.env.PBKDF2_ITERATIONS || 600000), 100000),
      c.env
    )
    throw new HttpError(401, 'Invalid email or password.')
  }

  const valid = await verifyPassword(
    password,
    user.password_salt,
    user.password_hash,
    user.password_iterations,
    c.env
  )

  if (!valid) throw new HttpError(401, 'Invalid email or password.')
  if (!user.email_verified) throw new HttpError(403, 'Verify your email before signing in.')

  const csrfToken = await createSession(c, user.id)

  return c.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name
    },
    csrfToken
  })
})

authRoutes.get('/me', async (c) => {
  const session = await getSession(c)
  if (!session) return c.json({ authenticated: false }, 401)

  return c.json({
    authenticated: true,
    user: {
      id: session.user_id,
      email: session.email,
      displayName: session.display_name
    },
    csrfToken: session.csrf_token
  })
})

authRoutes.post('/logout', async (c) => {
  const session = await getSession(c)
  if (session && !csrfMatches(c, session)) throw new HttpError(403, 'Invalid CSRF token.')
  await destroySession(c)
  return c.json({ ok: true })
})

authRoutes.post('/forgot-password', async (c) => {
  const ip = clientIp(c)
  if (!(await enforceRateLimit(c.env.DB, `forgot:${ip}`, 5, 900))) {
    throw new HttpError(429, 'Too many requests. Try again later.')
  }

  const body = await readJson<{ email?: string; turnstileToken?: string }>(c)
  const email = normalizeEmail(body.email || '')
  const turnstileOk = await verifyTurnstile(c.env, body.turnstileToken || '', ip)

  if (!turnstileOk) throw new HttpError(400, 'Human verification failed.')

  const user = await c.env.DB
    .prepare('SELECT id, display_name FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; display_name: string }>()

  if (user) {
    const token = randomToken(32)
    const tokenHash = await sha256Base64Url(token)
    const now = Math.floor(Date.now() / 1000)

    await c.env.DB
      .prepare(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), user.id, tokenHash, now + 1800, now)
      .run()

    const url = `${c.env.APP_ORIGIN}/reset-password.html?token=${encodeURIComponent(token)}`
    const emailBody = resetPasswordEmail(user.display_name, url)
    await sendTransactionalEmail(c.env, { to: email, ...emailBody })
  }

  return c.json({
    ok: true,
    message: 'If an account exists for that address, a reset link has been sent.'
  })
})

authRoutes.post('/reset-password', async (c) => {
  const body = await readJson<{ token?: string; password?: string }>(c)
  const token = safeText(body.token, 512)
  const password = body.password || ''

  const passwordError = validatePassword(password)
  if (passwordError) throw new HttpError(400, passwordError)
  if (!token) throw new HttpError(400, 'Reset token is required.')

  const tokenHash = await sha256Base64Url(token)
  const now = Math.floor(Date.now() / 1000)
  const record = await c.env.DB
    .prepare(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL`
    )
    .bind(tokenHash, now)
    .first<{ id: string; user_id: string }>()

  if (!record) throw new HttpError(400, 'This reset link is invalid or expired.')

  const passwordData = await hashPassword(password, c.env)

  await c.env.DB.batch([
    c.env.DB
      .prepare(
        `UPDATE users
         SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(passwordData.hash, passwordData.salt, passwordData.iterations, now, record.user_id),
    c.env.DB
      .prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?')
      .bind(now, record.id),
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(record.user_id)
  ])

  return c.json({ ok: true, message: 'Password updated. Sign in with your new password.' })
})

async function issueVerificationEmail(
  db: D1Database,
  env: AppEnv['Bindings'],
  userId: string,
  email: string,
  name: string
): Promise<void> {
  const token = randomToken(32)
  const tokenHash = await sha256Base64Url(token)
  const now = Math.floor(Date.now() / 1000)

  await db
    .prepare(
      `INSERT INTO email_verification_tokens
       (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), userId, tokenHash, now + 3600, now)
    .run()

  const url = `${env.APP_ORIGIN}/verify.html?token=${encodeURIComponent(token)}`
  const emailBody = verificationEmail(name, url)
  await sendTransactionalEmail(env, { to: email, ...emailBody })
}
