import type { Context } from 'hono'
import { createAuth } from './auth'
import { HttpError } from './http'
import type { AppEnv } from '../types'

export async function requireUser(c: Context<AppEnv>) {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
  if (!session) throw new HttpError(401, 'Sign in to continue.')
  return session.user
}
