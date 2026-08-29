import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { csrfMatches, getSession } from '../lib/session'
import { HttpError, readJson, safeText } from '../lib/http'

type CheckoutItem = {
  productId?: string
  quantity?: number
}

export const orderRoutes = new Hono<AppEnv>()

orderRoutes.post('/', async (c) => {
  const session = await getSession(c)
  if (!session) throw new HttpError(401, 'Sign in to checkout.')
  if (!csrfMatches(c, session)) throw new HttpError(403, 'Invalid CSRF token.')

  const idempotencyKey = safeText(c.req.header('Idempotency-Key'), 100)
  if (idempotencyKey.length < 8) throw new HttpError(400, 'Idempotency-Key header is required.')

  const existing = await c.env.DB
    .prepare('SELECT id FROM orders WHERE user_id = ? AND idempotency_key = ?')
    .bind(session.user_id, idempotencyKey)
    .first<{ id: string }>()

  if (existing) {
    return c.json({ ok: true, orderId: existing.id, duplicate: true })
  }

  const body = await readJson<{
    items?: CheckoutItem[]
    fullName?: string
    address1?: string
    address2?: string
    city?: string
    postalCode?: string
    country?: string
  }>(c)

  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : []
  if (items.length === 0) throw new HttpError(400, 'Your cart is empty.')

  const cleanItems = items.map((item) => ({
    productId: safeText(item.productId, 80),
    quantity: Number(item.quantity)
  }))

  if (cleanItems.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
    throw new HttpError(400, 'Cart contains an invalid item.')
  }

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

  const shipping = subtotal >= 8000 ? 0 : 799
  const tax = Math.round(subtotal * 0.06)
  const total = subtotal + shipping + tax

  const fullName = safeText(body.fullName, 80)
  const address1 = safeText(body.address1, 120)
  const address2 = safeText(body.address2, 120)
  const city = safeText(body.city, 80)
  const postalCode = safeText(body.postalCode, 20)
  const country = safeText(body.country, 60)

  if (!fullName || !address1 || !city || !postalCode || !country) {
    throw new HttpError(400, 'Complete the shipping address.')
  }

  const orderId = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const statements: D1PreparedStatement[] = [
    c.env.DB
      .prepare(
        `INSERT INTO orders
         (id, user_id, status, subtotal_cents, shipping_cents, tax_cents, total_cents,
          shipping_name, address1, address2, city, postal_code, country, idempotency_key, created_at)
         VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        orderId,
        session.user_id,
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
        now
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
    statements.push(
      c.env.DB
        .prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .bind(item.quantity, item.product.id, item.quantity)
    )
  }

  await c.env.DB.batch(statements)

  return c.json(
    {
      ok: true,
      orderId,
      totals: { subtotal, shipping, tax, total },
      message: 'Dummy checkout complete. No payment was processed.'
    },
    201
  )
})

orderRoutes.get('/', async (c) => {
  const session = await getSession(c)
  if (!session) throw new HttpError(401, 'Sign in to view orders.')

  const result = await c.env.DB
    .prepare(
      `SELECT id, status, subtotal_cents, shipping_cents, tax_cents, total_cents, created_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(session.user_id)
    .all()

  return c.json({ orders: result.results })
})

orderRoutes.get('/:id', async (c) => {
  const session = await getSession(c)
  if (!session) throw new HttpError(401, 'Sign in to view orders.')

  const orderId = safeText(c.req.param('id'), 80)
  const order = await c.env.DB
    .prepare(
      `SELECT id, status, subtotal_cents, shipping_cents, tax_cents, total_cents,
              shipping_name, address1, address2, city, postal_code, country, created_at
       FROM orders WHERE id = ? AND user_id = ?`
    )
    .bind(orderId, session.user_id)
    .first()

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
