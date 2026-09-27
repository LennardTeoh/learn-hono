import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins'
import type { Bindings } from '../types'
import { sendTransactionalEmail, resetPasswordEmail, verificationEmail, otpEmail } from './email'

export function createAuth(env: Bindings) {
  const isProd = env.BETTER_AUTH_URL?.startsWith('https://');

  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: [env.APP_ORIGIN, 'http://localhost:8788', 'http://localhost:8787'],
    advanced: {
      useSecureCookies: isProd,
      defaultCookieAttributes: { 
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd 
      }
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
      sendOnSignIn: false,
      sendVerificationEmail: async ({ user, url }) => {
        await sendTransactionalEmail(env, { to: user.email, ...verificationEmail(user.name, url) })
      }
    },
    plugins: [
      twoFactor({
        otpOptions: {
          async sendOTP({ user, otp }) {
            await sendTransactionalEmail(env, { 
              to: user.email, 
              ...otpEmail(otp) 
            });
          }
        }
      })
    ],
    // Automatically force 2FA enabled status on every new user registration
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await env.DB.prepare(
                `UPDATE user SET two_factor_enabled = 1 WHERE id = ?`
              ).bind(user.id).run();
            } catch (e) {
              console.error('Failed to enforce 2FA:', e);
            }
          }
        }
      }
    }
  })
}