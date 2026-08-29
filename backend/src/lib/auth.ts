import { betterAuth } from 'better-auth'
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
  })
}
