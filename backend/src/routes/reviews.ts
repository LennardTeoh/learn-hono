import { Hono } from 'hono'
import type { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// Fetch all reviews and include the user's name
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT reviews.*, "user".name as user_name 
     FROM reviews 
     JOIN "user" ON reviews.user_id = "user".id 
     ORDER BY created_at DESC`
  ).all()
  return c.json(results)
})

// Submit a new review
app.post('/', async (c) => {
  const body = await c.req.json()
  const { userId, rating, title, comment } = body

  if (!userId || !rating || !title || !comment) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO reviews (id, user_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, userId, rating, title, comment).run()

  return c.json({ success: true, id })
})

export default app