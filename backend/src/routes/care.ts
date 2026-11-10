import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { createAuth } from '../lib/auth'

export const careRoutes = new Hono<AppEnv>()
export const adminCareRoutes = new Hono<AppEnv>()

// POST: /api/care/book - Customer booking submission
careRoutes.post('/book', async (c) => {
  try {
    const body = await c.req.json()
    const bookingId = `LUM-CARE-${Math.floor(1000 + Math.random() * 9000)}`

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

// GET: /api/care/my-bookings - Customer fetches their own appointments
careRoutes.get('/my-bookings', async (c) => {
  try {
    const auth = createAuth(c.env, () => {})
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    })

    if (!session?.user?.email) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userEmail = session.user.email

    const { results } = await c.env.DB.prepare(`
      SELECT 
        id as booking_id, 
        service_category, 
        selected_services as services, 
        preferred_date, 
        status 
      FROM care_bookings 
      WHERE customer_email = ? 
      ORDER BY created_at DESC
    `).bind(userEmail).all()

    const formattedResults = results.map(apt => ({
      ...apt,
      services: (JSON.parse(apt.services as string || '[]')).join(', ')
    }))

    return c.json({ bookings: formattedResults })
  } catch (err: any) {
    console.error('Failed to fetch user bookings:', err)
    return c.json({ error: 'Failed to fetch bookings' }, 500)
  }
})

// POST: /api/care/cancel/:id - Customer cancels their own appointment
careRoutes.post('/cancel/:id', async (c) => {
  try {
    const auth = createAuth(c.env, () => {})
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    })

    if (!session?.user?.email) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const bookingId = c.req.param('id')
    const userEmail = session.user.email

    const result = await c.env.DB.prepare(`
      UPDATE care_bookings 
      SET status = 'CANCELLED' 
      WHERE id = ? AND customer_email = ?
    `).bind(bookingId, userEmail).run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Booking not found or unauthorized' }, 404)
    }

    return c.json({ success: true })
  } catch (err: any) {
    console.error('Failed to cancel booking:', err)
    return c.json({ error: 'Failed to cancel booking' }, 500)
  }
})

// GET: /api/care/booking/:id - Fetch a single booking for payment page
careRoutes.get('/booking/:id', async (c) => {
  try {
    const bookingId = c.req.param('id');
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM care_bookings WHERE id = ?
    `).bind(bookingId).all();

    if (!results || results.length === 0) {
      return c.json({ error: 'Booking not found in database' }, 404);
    }

    const booking = results[0];
    
    // Assign pricing based on selected services for the QR code to generate
    let mockPriceCents = 0;
    const servicesStr = String(booking.selected_services || '').toLowerCase();
    
    if (servicesStr.includes('full movement overhaul')) mockPriceCents += 120000;
    if (servicesStr.includes('corner scuff')) mockPriceCents += 45000;
    if (servicesStr.includes('hardware & zipper')) mockPriceCents += 35000;
    if (servicesStr.includes('scratch removal')) mockPriceCents += 20000;
    if (servicesStr.includes('white gold rhodium')) mockPriceCents += 30000;
    if (servicesStr.includes('chain soldering')) mockPriceCents += 25000;
    
    if (mockPriceCents === 0) mockPriceCents = 15000; // Mock RM 150 base fee if only complimentary selected

    return c.json({ 
        status: booking.status === 'SCHEDULED' ? 'pending_payment' : 'confirmed',
        price: mockPriceCents,
        ...booking 
    });
  } catch (err: any) {
    console.error('Failed to fetch booking details:', err);
    return c.json({ error: 'Failed to fetch booking details' }, 500);
  }
});

// POST: /api/care/confirm/:id - Mark booking as paid after QR scan
careRoutes.post('/confirm/:id', async (c) => {
    try {
        const bookingId = c.req.param('id');
        
        await c.env.DB.prepare(`
            UPDATE care_bookings SET status = 'CONFIRMED' WHERE id = ?
        `).bind(bookingId).run();
        
        return c.json({ success: true });
    } catch(err: any) {
        return c.json({ error: 'Failed to confirm' }, 500);
    }
});

// GET: /api/admin/care-appointments - Admin dashboard data fetch
adminCareRoutes.get('/care-appointments', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM care_bookings ORDER BY created_at DESC
    `).all()

    return c.json(results)
  } catch (err: any) {
    console.error('Failed to fetch appointments:', err)
    return c.json({ error: 'Failed to fetch appointments' }, 500)
  }
})