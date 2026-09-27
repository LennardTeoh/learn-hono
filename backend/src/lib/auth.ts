import { betterAuth } from 'better-auth'
import type { Bindings } from '../types'
import { sendTransactionalEmail, resetPasswordEmail, verificationEmail } from './email'

export function createAuth(env: Bindings) {
  const isProd = env.BETTER_AUTH_URL?.startsWith('https://');

  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: [env.APP_ORIGIN, 'http://localhost:8788', 'http://localhost:8787'],
    advanced: {
      useSecureCookies: false, // Force false for local cross-port testing
      defaultCookieAttributes: { 
        sameSite: 'lax', 
        secure: false 
      }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
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
  })
}