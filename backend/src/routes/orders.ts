import { Hono, type Context } from 'hono'
import type { AppEnv } from '../types'
import { requireUser } from '../lib/auth-session'
import { HttpError, readJson, safeText } from '../lib/http'
import QRCode from 'qrcode-svg'

type CheckoutItem = {
  productId?: string
  quantity?: number
}

const ADMIN_EMAIL = 'lumiere.csproject@gmail.com'
const QR_LIMIT = 1_000_000
const allowedMethods = (subtotal: number) => subtotal <= QR_LIMIT ? ['qr', 'card'] : ['card']
const nowSeconds = () => Math.floor(Date.now() / 1000)
const hashToken = async (token: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))).map((byte) => byte.toString(16).padStart(2, '0')).join('')

export const orderRoutes = new Hono<AppEnv>()

orderRoutes.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.header('Origin') !== c.env.CORS_ORIGIN) throw new HttpError(403, 'Invalid request origin.')
  await next()
})

orderRoutes.post('/', async (c) => {
  const user = await requireUser(c)

  const idempotencyKey = safeText(c.req.header('Idempotency-Key'), 100)
  if (idempotencyKey.length < 8) throw new HttpError(400, 'Idempotency-Key header is required.')

  const existing = await c.env.DB
    .prepare('SELECT id, subtotal_cents, shipping_cents, tax_cents, total_cents, status FROM orders WHERE user_id = ? AND idempotency_key = ?')
    .bind(user.id, idempotencyKey)
    .first<{ id: string; subtotal_cents: number; shipping_cents: number; tax_cents: number; total_cents: number; status: string }>()

  if (existing) {
    return c.json({ ok: true, orderId: existing.id, duplicate: true, status: existing.status,
      totals: { subtotal: existing.subtotal_cents, shipping: existing.shipping_cents, tax: existing.tax_cents, total: existing.total_cents },
      allowedMethods: allowedMethods(existing.subtotal_cents) })
  }

  const body = await readJson<{
    items?: CheckoutItem[]
    fullName?: string
    address1?: string
    address2?: string
    city?: string
    postalCode?: string
    country?: string
    state?: string
    phone?: string
    countryCode?: string
    deliveryMethod?: string
    paymentMethod?: string
  }>(c)

  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : []
  if (items.length === 0) throw new HttpError(400, 'Your cart is empty.')

  const submittedItems = items.map((item) => ({
    productId: safeText(item.productId, 80),
    quantity: Number(item.quantity)
  }))

  if (submittedItems.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
    throw new HttpError(400, 'Cart contains an invalid item.')
  }
  const quantities = new Map<string, number>()
  for (const item of submittedItems) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity)
  const cleanItems = [...quantities].map(([productId, quantity]) => ({ productId, quantity }))
  if (cleanItems.some((item) => item.quantity > 10)) throw new HttpError(400, 'Maximum quantity is 10 per product.')

  const uniqueIds = [...new Set(cleanItems.map((item) => item.productId))]
  const placeholders = uniqueIds.map(() => '?').join(',')
  const result = await c.env.DB
    .prepare(
      `SELECT id, name, price_cents, stock FROM products
       WHERE active = 1 AND id IN (${placeholders})`
    )
    .bind(...uniqueIds)
    .all<{ id: string; name: string; price_cents: number; stock: number }>()

  const productMap = new Map(result.results.map((product) => [product.id, product]))
  if (productMap.size !== uniqueIds.length) throw new HttpError(400, 'One or more products are unavailable.')

  let subtotal = 0
  const normalized = cleanItems.map((item) => {
    const product = productMap.get(item.productId)!
    if (product.stock < item.quantity) throw new HttpError(409, `${product.name} does not have enough stock.`)
    subtotal += product.price_cents * item.quantity
    return { ...item, product }
  })

  if (body.deliveryMethod !== 'pickup' && body.deliveryMethod !== 'delivery') throw new HttpError(400, 'Choose a delivery method.')
  const deliveryMethod = body.deliveryMethod
  const state = safeText(body.state, 80)
  const states = ['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya']
  const eastMalaysia = ['Sabah', 'Sarawak', 'W.P. Labuan'].includes(state)
  const shipping = deliveryMethod === 'pickup' ? 0 : (subtotal >= 8000 ? 0 : 799) + (eastMalaysia ? 3000 : 0)
  const tax = Math.round(subtotal * 0.06)
  const total = subtotal + shipping + tax
  const paymentMethod = safeText(body.paymentMethod, 8) || 'qr'
  if (!allowedMethods(subtotal).includes(paymentMethod)) throw new HttpError(400, 'Security Warning: credit card payment only for this order.')

  const fullName = safeText(body.fullName, 80)
  const address1 = safeText(body.address1, 120)
  const address2 = safeText(body.address2, 120)
  const city = safeText(body.city, 80)
  const postalCode = safeText(body.postalCode, 20)
  const country = safeText(body.country, 60)
  const countryCode = safeText(body.countryCode, 8)
  const phoneNumber = safeText(body.phone, 30)
  const phone = `${countryCode}${phoneNumber}`

  if (!fullName || !address1 || !city || !postalCode || country !== 'Malaysia' || !states.includes(state) ||
      !['+60', '+65', '+673', '+62'].includes(countryCode) || !/^\d{6,15}$/.test(phoneNumber.replace(/[\s-]/g, ''))) {
    throw new HttpError(400, 'Complete the Malaysia contact and address details.')
  }

  // 🔥 THE FIX: Generate a short, 8-character uppercase hex string for all new orders
  const orderId = crypto.randomUUID().split('-')[0].toUpperCase()
  
  // Generate the unique 6-digit PIN
  const verificationPin = Math.floor(100000 + Math.random() * 900000).toString()
  const now = nowSeconds()
  
  const statements: D1PreparedStatement[] = [
    c.env.DB
      .prepare(
        `INSERT INTO orders
         (id, user_id, status, mock_method, subtotal_cents, shipping_cents, tax_cents, total_cents,
          shipping_name, address1, address2, city, postal_code, country, idempotency_key, created_at, verification_pin,
          delivery_method, state, phone)
         VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        orderId,
        user.id,
        paymentMethod,
        subtotal,
        shipping,
        tax,
        total,
        fullName,
        address1,
        address2,
        city,
        postalCode,
        country,
        idempotencyKey,
        now,
        verificationPin,
        deliveryMethod,
        state,
        phone
      )
  ]

  for (const item of normalized) {
    statements.push(
      c.env.DB
        .prepare(
          `INSERT INTO order_items
           (id, order_id, product_id, product_name, unit_price_cents, quantity)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          orderId,
          item.product.id,
          item.product.name,
          item.product.price_cents,
          item.quantity
        )
    )
  }

  try {
    await c.env.DB.batch(statements)
  } catch (error) {
    const duplicate = await c.env.DB.prepare('SELECT id, subtotal_cents, shipping_cents, tax_cents, total_cents, status FROM orders WHERE user_id = ? AND idempotency_key = ?')
      .bind(user.id, idempotencyKey).first<{ id: string; subtotal_cents: number; shipping_cents: number; tax_cents: number; total_cents: number; status: string }>()
    if (duplicate) return c.json({ ok: true, orderId: duplicate.id, duplicate: true, status: duplicate.status,
      totals: { subtotal: duplicate.subtotal_cents, shipping: duplicate.shipping_cents, tax: duplicate.tax_cents, total: duplicate.total_cents },
      allowedMethods: allowedMethods(duplicate.subtotal_cents) })
    if (String(error).includes('CHECK constraint failed')) throw new HttpError(409, 'Stock changed. Review your cart and try again.')
    throw error
  }

  return c.json(
    {
      ok: true,
      orderId,
      totals: { subtotal, shipping, tax, total },
      status: 'pending_payment', allowedMethods: allowedMethods(subtotal)
    },
    201
  )
})

async function ownedOrder(c: Context<AppEnv>, id: string) {
  const user = await requireUser(c)
  const order = await c.env.DB.prepare('SELECT id, status, subtotal_cents, total_cents, active_attempt_id FROM orders WHERE id = ? AND user_id = ?')
    .bind(id, user.id).first<{ id: string; status: string; subtotal_cents: number; total_cents: number; active_attempt_id: string | null }>()
  if (!order) throw new HttpError(404, 'Order not found.')
  return order
}

async function attemptStatus(c: Context<AppEnv>, orderId: string) {
  const order = await ownedOrder(c, orderId)
  const attempt = order.active_attempt_id ? await c.env.DB.prepare('SELECT id, method, status, expires_at FROM payment_attempts WHERE id = ?')
    .bind(order.active_attempt_id).first<{ id: string; method: string; status: string; expires_at: number }>() : null
  return { order, attempt: attempt && attempt.status === 'active' && attempt.expires_at <= nowSeconds() ? { ...attempt, status: 'expired' } : attempt }
}

orderRoutes.post('/:id/attempts', async (c) => {
  const orderId = safeText(c.req.param('id'), 80)
  const order = await ownedOrder(c, orderId)
  if (order.status !== 'pending_payment') throw new HttpError(409, 'This order is already confirmed.')
  const { method } = await readJson<{ method?: string }>(c)
  if (!method || !allowedMethods(order.subtotal_cents).includes(method)) throw new HttpError(400, 'This payment method is unavailable.')
  const id = crypto.randomUUID()
  const createdAt = nowSeconds()
  const expiresAt = createdAt + 120
  const token = method === 'qr' ? crypto.randomUUID() + crypto.randomUUID() : null
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE payment_attempts SET status = 'replaced' WHERE id = ? AND status = 'active'").bind(order.active_attempt_id),
    c.env.DB.prepare('INSERT INTO payment_attempts (id, order_id, method, status, created_at, expires_at, token_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, orderId, method, 'active', createdAt, expiresAt, token ? await hashToken(token) : null),
    c.env.DB.prepare("UPDATE orders SET active_attempt_id = ?, mock_method = ? WHERE id = ? AND status = 'pending_payment'").bind(id, method, orderId)
  ])
  const url = token ? new URL(`/mock-pay/?token=${encodeURIComponent(token)}`, c.env.APP_ORIGIN).toString() : null
  const qrSvg = url ? new QRCode({ content: url, color: '#e7366b', background: '#ffffff', padding: 4, width: 260, height: 260, ecl: 'M' }).svg() : null
  return c.json({ id, method, status: 'active', expiresAt, url, qrSvg })
})

orderRoutes.get('/:id/attempt', async (c) => {
  const { order, attempt } = await attemptStatus(c, safeText(c.req.param('id'), 80))
  return c.json({ orderStatus: order.status, attempt })
})

async function confirmAttempt(c: Context<AppEnv>, attemptId: string) {
  const attempt = await c.env.DB.prepare('SELECT order_id, status, expires_at FROM payment_attempts WHERE id = ?').bind(attemptId)
    .first<{ order_id: string; status: string; expires_at: number }>()
  if (!attempt) throw new HttpError(404, 'Payment attempt not found.')
  const items = await c.env.DB.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').bind(attempt.order_id)
    .all<{ product_id: string; quantity: number }>()
  const now = nowSeconds()
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO payment_confirmations (attempt_id, valid)
        VALUES (?, CASE WHEN EXISTS (
          SELECT 1 FROM payment_attempts a JOIN orders o ON o.id = a.order_id
          WHERE a.id = ? AND a.status = 'active' AND a.expires_at > unixepoch('now') AND o.status = 'pending_payment' AND o.active_attempt_id = a.id
        ) AND NOT EXISTS (
          SELECT 1 FROM order_items i LEFT JOIN products p ON p.id = i.product_id
          WHERE i.order_id = ? AND (p.id IS NULL OR p.active != 1 OR p.stock < i.quantity)
        ) THEN 1 ELSE 0 END)`).bind(attemptId, attemptId, attempt.order_id),
      ...items.results.map((item) => c.env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').bind(item.quantity, item.product_id)),
      c.env.DB.prepare("UPDATE orders SET status = 'confirmed', paid_at = ? WHERE id = ? AND status = 'pending_payment' AND active_attempt_id = ?")
        .bind(now, attempt.order_id, attemptId),
      c.env.DB.prepare("UPDATE payment_attempts SET status = 'successful' WHERE id = ? AND status = 'active'").bind(attemptId)
    ])
  } catch {
    const unavailable = await c.env.DB.prepare(`SELECT i.product_name FROM order_items i LEFT JOIN products p ON p.id = i.product_id
      WHERE i.order_id = ? AND (p.id IS NULL OR p.active != 1 OR p.stock < i.quantity) LIMIT 1`).bind(attempt.order_id).first<{ product_name: string }>()
    if (unavailable) throw new HttpError(409, `${unavailable.product_name} is out of stock. This order remains Pending Payment.`)
    throw new HttpError(409, 'This payment attempt expired or was already used. Try again from order history.')
  }
  return attempt.order_id
}

orderRoutes.post('/:id/card-complete', async (c) => {
  const order = await ownedOrder(c, safeText(c.req.param('id'), 80))
  const { attemptId, outcome } = await readJson<{ attemptId?: string; outcome?: string }>(c)
  if (!attemptId || attemptId !== order.active_attempt_id || !['success', 'decline'].includes(outcome || '')) throw new HttpError(400, 'Invalid card attempt.')
  const attempt = await c.env.DB.prepare('SELECT method, status, expires_at FROM payment_attempts WHERE id = ?').bind(attemptId)
    .first<{ method: string; status: string; expires_at: number }>()
  if (attempt?.method !== 'card' || attempt.status !== 'active' || attempt.expires_at <= nowSeconds()) throw new HttpError(409, 'This card attempt has expired. Try again.')
  if (outcome === 'decline') {
    await c.env.DB.prepare("UPDATE payment_attempts SET status = 'declined' WHERE id = ? AND status = 'active'").bind(attemptId).run()
    return c.json({ orderStatus: 'pending_payment', attemptStatus: 'declined' })
  }
  await confirmAttempt(c, attemptId)
  return c.json({ orderStatus: 'confirmed' })
})

async function tokenAttempt(c: Context<AppEnv>, token: string) {
  if (!/^[0-9a-f-]{72}$/.test(token)) throw new HttpError(404, 'Payment link not found.')
  const attempt = await c.env.DB.prepare(`SELECT a.id, a.order_id, a.status, a.expires_at, o.total_cents
    FROM payment_attempts a JOIN orders o ON o.id = a.order_id
    WHERE a.token_hash = ? AND a.method = 'qr' AND o.active_attempt_id = a.id`).bind(await hashToken(token))
    .first<{ id: string; order_id: string; status: string; expires_at: number; total_cents: number }>()
  if (!attempt) throw new HttpError(404, 'Payment link is no longer valid.')
  return attempt
}

orderRoutes.get('/mock/:token', async (c) => {
  const attempt = await tokenAttempt(c, c.req.param('token'))
  const items = await c.env.DB.prepare('SELECT product_name, unit_price_cents, quantity FROM order_items WHERE order_id = ?').bind(attempt.order_id).all()
  return c.json({ orderId: attempt.order_id, amount: attempt.total_cents, items: items.results,
    status: attempt.status === 'active' && attempt.expires_at <= nowSeconds() ? 'expired' : attempt.status, expiresAt: attempt.expires_at })
})

orderRoutes.post('/mock/:token/authorize', async (c) => {
  const attempt = await tokenAttempt(c, c.req.param('token'))
  if (attempt.status !== 'active' || attempt.expires_at <= nowSeconds()) throw new HttpError(409, 'This payment link has expired.')
  await confirmAttempt(c, attempt.id)
  return c.json({ ok: true, orderId: attempt.order_id })
})

// ADMIN ROUTE: Must be placed BEFORE /:id
orderRoutes.get('/all', async (c) => {
  const user = await requireUser(c)
  
  if (user.email !== ADMIN_EMAIL) {
    throw new HttpError(403, 'Unauthorized. Admin access only.')
  }
  
  const result = await c.env.DB
    .prepare(
      `SELECT orders.id, orders.status, orders.mock_method, orders.paid_at, orders.tracking_number, orders.subtotal_cents, orders.shipping_cents, orders.tax_cents, orders.total_cents,
              orders.shipping_name, orders.delivery_method, orders.state, orders.phone, user.email, orders.created_at, orders.verification_pin
       FROM orders 
       LEFT JOIN user ON orders.user_id = user.id
       ORDER BY orders.created_at DESC LIMIT 100`
    )
    .all()

  return c.json({ orders: result.results })
})

orderRoutes.get('/', async (c) => {
  const user = await requireUser(c)

  const result = await c.env.DB
    .prepare(
      `SELECT id, status, mock_method, paid_at, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents, delivery_method, created_at, verification_pin
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(user.id)
    .all()

  return c.json({ orders: result.results })
})

orderRoutes.get('/:id', async (c) => {
  const user = await requireUser(c)
  const orderId = safeText(c.req.param('id'), 80)
  
  let order;
  if (user.email === ADMIN_EMAIL) {
    order = await c.env.DB
      .prepare(
        `SELECT id, status, mock_method, paid_at, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents,
                shipping_name, address1, address2, city, postal_code, country, delivery_method, state, phone, created_at, verification_pin
         FROM orders WHERE id = ?`
      )
      .bind(orderId)
      .first()
  } else {
    order = await c.env.DB
      .prepare(
        `SELECT id, status, mock_method, paid_at, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents,
                shipping_name, address1, address2, city, postal_code, country, delivery_method, state, phone, created_at, verification_pin
         FROM orders WHERE id = ? AND user_id = ?`
      )
      .bind(orderId, user.id)
      .first()
  }

  if (!order) throw new HttpError(404, 'Order not found.')

  const items = await c.env.DB
    .prepare(
      `SELECT product_id, product_name, unit_price_cents, quantity
       FROM order_items WHERE order_id = ?`
    )
    .bind(orderId)
    .all()

  return c.json({ order, items: items.results })
})

orderRoutes.patch('/:id/shipping', async (c) => {
  const user = await requireUser(c)
  
  if (user.email !== ADMIN_EMAIL) {
    throw new HttpError(403, 'Unauthorized. Admin access only.')
  }
  
  const orderId = safeText(c.req.param('id'), 80)
  const body = await readJson<{ status?: string, tracking_number?: string }>(c)
  
  const order = await c.env.DB.prepare('SELECT delivery_method FROM orders WHERE id = ?').bind(orderId).first<{ delivery_method: string }>()
  if (!order) throw new HttpError(404, 'Order not found.')
  const validStatuses = order.delivery_method === 'pickup'
    ? ['confirmed', 'preparing', 'ready', 'collected']
    : ['confirmed', 'processing', 'shipped', 'delivered']
  if (!body.status || !validStatuses.includes(body.status.toLowerCase())) {
    throw new HttpError(400, 'Invalid status update.')
  }
  const trackingNumber = safeText(body.tracking_number, 100)
  if (body.status.toLowerCase() === 'shipped' && !trackingNumber) throw new HttpError(400, 'Tracking number is required for shipped orders.')

  const result = await c.env.DB
    .prepare(`UPDATE orders SET status = ?, tracking_number = ? WHERE id = ? AND status != 'pending_payment'`)
    .bind(body.status.toLowerCase(), order.delivery_method === 'pickup' ? null : trackingNumber || null, orderId)
    .run()

  if (result.success && result.meta.changes) {
    return c.json({ ok: true, message: 'Shipping status updated successfully' })
  }
  
  throw new HttpError(500, 'Failed to update order')
})
