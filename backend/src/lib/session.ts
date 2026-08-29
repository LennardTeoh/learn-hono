import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { AppEnv, SessionRecord } from '../types'
import { randomToken, sha256Base64Url } from './crypto'

function cookieName(c: Context<AppEnv>): string {
  return c.env.ENVIRONMENT === 'production' ? '__Host-nimble_session' : 'nimble_session'
}

function cookieOptions(c: Context<AppEnv>, maxAge?: number) {
  const production = c.env.ENVIRONMENT === 'production'
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? ('None' as const) : ('Lax' as const),
    partitioned: production,
    path: '/',
    ...(typeof maxAge === 'number' ? { maxAge } : {})
  }
}

function clearSessionCookie(c: Context<AppEnv>): void {
  setCookie(c, cookieName(c), '', cookieOptions(c, 0))
}

export async function createSession(c: Context<AppEnv>, userId: string): Promise<string> {
  const token = randomToken(32)
  const tokenHash = await sha256Base64Url(token)
  const csrfToken = randomToken(24)
  const now = Math.floor(Date.now() / 1000)
  const ttl = Math.min(Math.max(Number(c.env.SESSION_TTL_SECONDS || 604800), 3600), 2592000)

  await c.env.DB
    .prepare(
      'INSERT INTO sessions (token_hash, user_id, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(tokenHash, userId, csrfToken, now + ttl, now)
    .run()

  setCookie(c, cookieName(c), token, cookieOptions(c, ttl))
  return csrfToken
}

export async function getSession(c: Context<AppEnv>): Promise<SessionRecord | null> {
  const token = getCookie(c, cookieName(c))
  if (!token) return null

  const tokenHash = await sha256Base64Url(token)
  const now = Math.floor(Date.now() / 1000)

  const session = await c.env.DB
    .prepare(
      `SELECT s.token_hash, s.user_id, s.csrf_token, s.expires_at, s.created_at,
              u.email, u.email_verified, u.display_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .bind(tokenHash, now)
    .first<SessionRecord>()

  if (!session) {
    clearSessionCookie(c)
    return null
  }

  return session
}

export async function destroySession(c: Context<AppEnv>): Promise<void> {
  const token = getCookie(c, cookieName(c))
  if (token) {
    const tokenHash = await sha256Base64Url(token)
    await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
  }
  clearSessionCookie(c)
}

export function csrfMatches(c: Context<AppEnv>, session: SessionRecord): boolean {
  const supplied = c.req.header('X-CSRF-Token') || ''
  return supplied.length >= 24 && supplied === session.csrf_token
}
