import type { Context } from 'hono'
import type { AppEnv } from '../types'

export function clientIp(c: Context<AppEnv>): string {
  return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
}

export async function readJson<T>(c: Context<AppEnv>, maxBytes = 16_384): Promise<T> {
  const contentType = c.req.header('Content-Type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json.')
  }

  const length = Number(c.req.header('Content-Length') || '0')
  if (length > maxBytes) throw new HttpError(413, 'Request body is too large.')

  try {
    return await c.req.json<T>()
  } catch {
    throw new HttpError(400, 'Invalid JSON body.')
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function safeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}
