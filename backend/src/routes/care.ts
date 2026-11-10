import { Hono } from 'hono'
import type { AppEnv } from '../types'

export const careRoutes = new Hono<AppEnv>()
export const adminCareRoutes = new Hono<AppEnv>()

// POST: /api/care/book - Customer booking submission
careRoutes.post('/book', async (c) => {
  try {
    const body = await c.req.json()
    const bookingId = `LUM-CARE-${Math.floor(1000 + Math.random() * 9000)}`

    // Insert directly into the new D1 table
    await c.env.DB.prepare(`
      INSERT INTO care_bookings (
        id, customer_name, customer_email, service_category, 
        selected_services, preferred_date, drop_off_method, 
        payment_method, serial_number, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
    `).bind(
      bookingId,
      body.fullName || '',
      body.emailAddress || '',
      body.serviceCategory || '',
      JSON.stringify(body.services || []),
      body.preferredDate || '',
      body.dropOffMethod || null,
      body.paymentMethod || null,
      body.serialNumber || null,
      body.notes || null
    ).run()

    return c.json({ success: true, bookingId })
  } catch (err: any) {
    console.error('Failed to insert care booking:', err)
    return c.json({ error: 'Failed to process booking' }, 500)
  }
})

// GET: /api/admin/care-appointments - Admin dashboard data fetch
adminCareRoutes.get('/care-appointments', async (c) => {
  try {
    // Fetch all appointments, newest first
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM care_bookings ORDER BY created_at DESC
    `).all()

    return c.json(results)
  } catch (err: any) {
    console.error('Failed to fetch appointments:', err)
    return c.json({ error: 'Failed to fetch appointments' }, 500)
  }
})