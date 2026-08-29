import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { AppEnv } from './types'
import { authRoutes } from './routes/auth'
import { productRoutes } from './routes/products'
import { orderRoutes } from './routes/orders'
import { HttpError } from './lib/http'

const app = new Hono<AppEnv>()

app.use('*', secureHeaders())

app.use('/api/*', async (c, next) => {
  const middleware = cors({
    origin: c.env.CORS_ORIGIN,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-CSRF-Token', 'Idempotency-Key'],
    credentials: true,
    maxAge: 86400
  })
  return middleware(c, next)
})

app.get('/health', (c) => c.json({ ok: true, service: 'petitbakery-api' }))

app.route('/api/auth', authRoutes)
app.route('/api/products', productRoutes)
app.route('/api/orders', orderRoutes)

app.notFound((c) => c.json({ error: 'Not found.' }, 404))

app.onError((error, c) => {
  if (error instanceof HttpError) {
    return c.json({ error: error.message }, error.status as any)
  }

  console.error(error)
  return c.json({ error: 'Internal server error.' }, 500)
})

export default app
