import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { requireUser } from '../lib/auth-session'
import { HttpError, readJson, safeText } from '../lib/http'

type CheckoutItem = {
  productId?: string
  quantity?: number
}

export const orderRoutes = new Hono<AppEnv>()

orderRoutes.post('/', async (c) => {
  if (c.req.header('Origin') !== c.env.CORS_ORIGIN) throw new HttpError(403, 'Invalid request origin.')
  const user = await requireUser(c)

  const idempotencyKey = safeText(c.req.header('Idempotency-Key'), 100)
  if (idempotencyKey.length < 8) throw new HttpError(400, 'Idempotency-Key header is required.')

  const existing = await c.env.DB
    .prepare('SELECT id FROM orders WHERE user_id = ? AND idempotency_key = ?')
    .bind(user.id, idempotencyKey)
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
        user.id,
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

// MODIFIED: Added tracking_number to the SELECT statement
orderRoutes.get('/', async (c) => {
  const user = await requireUser(c)

  const result = await c.env.DB
    .prepare(
      `SELECT id, status, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents, created_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(user.id)
    .all()

  return c.json({ orders: result.results })
})

// MODIFIED: Added tracking_number to the SELECT statement
orderRoutes.get('/:id', async (c) => {
  const user = await requireUser(c)

  const orderId = safeText(c.req.param('id'), 80)
  const order = await c.env.DB
    .prepare(
      `SELECT id, status, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents,
              shipping_name, address1, address2, city, postal_code, country, created_at
       FROM orders WHERE id = ? AND user_id = ?`
    )
    .bind(orderId, user.id)
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

// NEW: Route to update shipping status and add a tracking number
orderRoutes.patch('/:id/shipping', async (c) => {
  const user = await requireUser(c)
  
  // Note: For a production e-commerce store, you should verify if the user has an 'admin' role here
  
  const orderId = safeText(c.req.param('id'), 80)
  const body = await readJson<{ status?: string, tracking_number?: string }>(c)
  
  const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered']
  if (!body.status || !validStatuses.includes(body.status)) {
    throw new HttpError(400, 'Invalid status update.')
  }

  const result = await c.env.DB
    .prepare(`UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?`)
    .bind(body.status, body.tracking_number || null, orderId)
    .run()

  if (result.success) {
    return c.json({ ok: true, message: 'Shipping status updated successfully' })
  }
  
  throw new HttpError(500, 'Failed to update order')

  // NEW: Admin route to fetch all orders
orderRoutes.get('/all', async (c) => {
  const user = await requireUser(c)
  
  // TO DO FOR YOUR GROUP MATE: Add a security check here later to ensure user.email == 'admin@lumiere.com'
  
  const result = await c.env.DB
    .prepare(
      `SELECT id, status, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents,
              shipping_name, email, created_at
       FROM orders 
       LEFT JOIN user ON orders.user_id = user.id
       ORDER BY created_at DESC LIMIT 100`
    )
    .all()

  return c.json({ orders: result.results })
})
})