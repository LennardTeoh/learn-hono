export type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
  APP_ORIGIN: string
  CORS_ORIGIN: string
  EMAIL_FROM: string
  SESSION_TTL_SECONDS?: string
  PBKDF2_ITERATIONS?: string
  PASSWORD_PEPPER: string
  RESEND_API_KEY?: string
  TURNSTILE_SECRET_KEY?: string
}

export type AppEnv = {
  Bindings: Bindings
}

export type SessionRecord = {
  token_hash: string
  user_id: string
  csrf_token: string
  expires_at: number
  created_at: number
  email: string
  email_verified: number
  display_name: string
}
