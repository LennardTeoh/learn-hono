import type { Bindings } from '../types'

type TurnstileResponse = {
  success: boolean
}

export async function verifyTurnstile(
  env: Bindings,
  token: string,
  remoteIp?: string
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    return env.ENVIRONMENT !== 'production'
  }

  if (!token) return false

  const form = new FormData()
  form.set('secret', env.TURNSTILE_SECRET_KEY)
  form.set('response', token)
  if (remoteIp) form.set('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form
  })

  if (!response.ok) return false
  const data = (await response.json()) as TurnstileResponse
  return data.success === true
}
