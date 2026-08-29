import type { Bindings } from '../types'

const encoder = new TextEncoder()

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function randomToken(bytes = 32): string {
  const data = new Uint8Array(bytes)
  crypto.getRandomValues(data)
  return bytesToBase64Url(data)
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return bytesToBase64Url(new Uint8Array(digest))
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validatePassword(value: string): string | null {
  if (value.length < 12) return 'Password must be at least 12 characters.'
  if (value.length > 128) return 'Password must be 128 characters or fewer.'
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Use uppercase, lowercase, and a number.'
  }
  return null
}

function pbkdf2Iterations(env: Bindings): number {
  const configured = Number(env.PBKDF2_ITERATIONS || '600000')
  return Number.isFinite(configured) && configured >= 100000 ? Math.floor(configured) : 600000
}

export async function hashPassword(
  password: string,
  env: Bindings,
  salt = randomToken(16)
): Promise<{ hash: string; salt: string; iterations: number }> {
  if (!env.PASSWORD_PEPPER || env.PASSWORD_PEPPER.length < 24) {
    throw new Error('PASSWORD_PEPPER must be configured securely.')
  }

  const iterations = pbkdf2Iterations(env)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${password}\u0000${env.PASSWORD_PEPPER}`),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: base64UrlToBytes(salt),
      iterations
    },
    keyMaterial,
    256
  )

  return {
    hash: bytesToBase64Url(new Uint8Array(bits)),
    salt,
    iterations
  }
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
  iterations: number,
  env: Bindings
): Promise<boolean> {
  if (!env.PASSWORD_PEPPER || env.PASSWORD_PEPPER.length < 24) {
    throw new Error('PASSWORD_PEPPER must be configured securely.')
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${password}\u0000${env.PASSWORD_PEPPER}`),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const actualBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: base64UrlToBytes(salt),
      iterations
    },
    keyMaterial,
    256
  )

  const actual = new Uint8Array(actualBits)
  const expected = base64UrlToBytes(expectedHash)

  if (actual.byteLength !== expected.byteLength) return false

  const timingSafeEqual = (crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (a: ArrayBufferView, b: ArrayBufferView) => boolean
  }).timingSafeEqual

  if (timingSafeEqual) return timingSafeEqual(actual, expected)

  let diff = 0
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i]
  return diff === 0
}
