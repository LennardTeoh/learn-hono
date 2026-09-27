import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { requireUser } from '../lib/auth-session'
import { HttpError, readJson, safeText } from '../lib/http'

export const productRoutes = new Hono<AppEnv>()

const ADMIN_EMAIL = 'lumiere.csproject@gmail.com'

// PUBLIC ROUTE: Get all products for storefront and admin catalog
productRoutes.get('/', async (c) => {
  const result = await c.env.DB
    .prepare(`SELECT * FROM products`)
    .all()
  
  return c.json({ products: result.results })
})

// PUBLIC ROUTE: Get a single product's details
productRoutes.get('/:id', async (c) => {
  const productId = safeText(c.req.param('id'), 80)
  const product = await c.env.DB
    .prepare(`SELECT * FROM products WHERE id = ?`)
    .bind(productId)
    .first()

  if (!product) throw new HttpError(404, 'Product not found.')
  
  return c.json({ product })
})

// ADMIN ROUTE: Create a New Product
productRoutes.post('/', async (c) => {
  const user = await requireUser(c)
  
  if (user.email !== ADMIN_EMAIL) {
    throw new HttpError(403, 'Unauthorized. Admin access only.')
  }
  
  const body = await readJson<{ name: string, price_cents: number, stock: number, image_url: string, active: number }>(c)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO products (id, name, price_cents, stock, image_url, active) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    id, 
    safeText(body.name, 255), 
    Number(body.price_cents), 
    Number(body.stock), 
    body.image_url ? safeText(body.image_url, 1000) : null, 
    Number(body.active)
  ).run()

  return c.json({ ok: true, id }, 201)
})

// ADMIN ROUTE: Edit an Existing Product
productRoutes.patch('/:id', async (c) => {
  const user = await requireUser(c)
  
  if (user.email !== ADMIN_EMAIL) {
    throw new HttpError(403, 'Unauthorized. Admin access only.')
  }
  
  const productId = safeText(c.req.param('id'), 80)
  const body = await readJson<{ name: string, price_cents: number, stock: number, image_url: string, active: number }>(c)

  const result = await c.env.DB.prepare(
    `UPDATE products SET name = ?, price_cents = ?, stock = ?, image_url = ?, active = ? WHERE id = ?`
  ).bind(
    safeText(body.name, 255), 
    Number(body.price_cents), 
    Number(body.stock), 
    body.image_url ? safeText(body.image_url, 1000) : null, 
    Number(body.active), 
    productId
  ).run()

  if (result.success) {
    return c.json({ ok: true })
  }
  
  throw new HttpError(500, 'Failed to update product')
})