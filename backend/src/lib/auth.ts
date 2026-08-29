import { betterAuth } from 'better-auth'
import type { Bindings } from '../types'
import { sendTransactionalEmail, resetPasswordEmail, verificationEmail } from './email'

export function createAuth(env: Bindings) {
  const e2e = env.E2E_TEST_MODE === '1'
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: [env.APP_ORIGIN],
    advanced: {
      useSecureCookies: !e2e,
      defaultCookieAttributes: e2e
        ? { sameSite: 'lax', secure: false }
        : { sameSite: 'none', secure: true }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: !e2e,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendTransactionalEmail(env, { to: user.email, ...resetPasswordEmail(user.name, url) })
      }
    },
    emailVerification: {
      sendOnSignUp: !e2e,
      sendOnSignIn: !e2e,
      sendVerificationEmail: async ({ user, url }) => {
        if (e2e) return
        await sendTransactionalEmail(env, { to: user.email, ...verificationEmail(user.name, url) })
      }
    },
  })
}
