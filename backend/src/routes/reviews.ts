import { Hono } from 'hono'
import type { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT reviews.*, "user".name as user_name 
     FROM reviews 
     JOIN "user" ON reviews.user_id = "user".id 
     ORDER BY created_at DESC`
  ).all()
  return c.json(results)
})

app.post('/', async (c) => {
  const body = await c.req.json()
  // Accept imageUrls array from the frontend
  const { userId, rating, title, comment, imageUrls } = body

  if (!userId || !rating || !title || !comment) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const id = crypto.randomUUID()
  // Convert the array of images into a JSON string to store in SQLite
  const imagesJson = (imageUrls && imageUrls.length > 0) ? JSON.stringify(imageUrls) : null;

  await c.env.DB.prepare(
    `INSERT INTO reviews (id, user_id, rating, title, comment, image_url) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, rating, title, comment, imagesJson).run()

  return c.json({ success: true, id })
})

export default app