import { betterAuth } from 'better-auth'
import { captcha } from 'better-auth/plugins'
import type { Bindings } from '../types'
import { sendTransactionalEmail, resetPasswordEmail, verificationEmail } from './email'

export function createAuth(env: Bindings) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: [env.APP_ORIGIN],
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: { sameSite: 'none', secure: true }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendTransactionalEmail(env, { to: user.email, ...resetPasswordEmail(user.name, url) })
      }
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendTransactionalEmail(env, { to: user.email, ...verificationEmail(user.name, url) })
      }
    },
    plugins: env.TURNSTILE_SECRET_KEY ? [captcha({
      provider: 'cloudflare-turnstile',
      secretKey: env.TURNSTILE_SECRET_KEY,
      endpoints: ['/sign-up/email', '/sign-in/email', '/send-verification-email', '/request-password-reset']
    })] : []
  })
}
