import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { HttpError, safeText } from '../lib/http'

export const productRoutes = new Hono<AppEnv>()

productRoutes.get('/', async (c) => {
  const query = safeText(c.req.query('q'), 80)
  const category = safeText(c.req.query('category'), 40)

  const clauses: string[] = ['active = 1']
  const params: string[] = []

  if (query) {
    clauses.push('(name LIKE ? OR description LIKE ?)')
    const q = `%${query.replace(/[%_]/g, '')}%`
    params.push(q, q)
  }

  if (category) {
    clauses.push('category = ?')
    params.push(category)
  }

  const statement = c.env.DB.prepare(
    `SELECT id, slug, name, description, category, price_cents, stock, image_url
     FROM products
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 50`
  ).bind(...params)

  const result = await statement.all()

  return c.json({ products: result.results })
})

productRoutes.get('/:id', async (c) => {
  const id = safeText(c.req.param('id'), 80)
  const product = await c.env.DB
    .prepare(
      `SELECT id, slug, name, description, category, price_cents, stock, image_url
       FROM products WHERE id = ? AND active = 1`
    )
    .bind(id)
    .first()

  if (!product) throw new HttpError(404, 'Product not found.')
  return c.json({ product })
})
