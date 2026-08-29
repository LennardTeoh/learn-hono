export type Bindings = {
  DB: D1Database
  APP_ORIGIN: string
  CORS_ORIGIN: string
  BETTER_AUTH_URL: string
  EMAIL_FROM: string
  BETTER_AUTH_SECRET: string
  RESEND_API_KEY: string
  TURNSTILE_SECRET_KEY: string
}

export type AppEnv = {
  Bindings: Bindings
}
