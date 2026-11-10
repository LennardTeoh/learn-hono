import { Hono, type Context } from 'hono'
import type { AppEnv } from '../types'
import { createAuth } from '../lib/auth'
import QRCode from 'qrcode-svg'
import { HttpError, readJson } from '../lib/http'

export const careRoutes = new Hono<AppEnv>()
export const adminCareRoutes = new Hono<AppEnv>()

const nowSeconds = () => Math.floor(Date.now() / 1000)
const hashToken = async (token: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))).map((byte) => byte.toString(16).padStart(2, '0')).join('')

function calculateMockPrice(services: string | null): number {
    let mockPriceCents = 0;
    const servicesStr = String(services || '').toLowerCase();
    
    if (servicesStr.includes('full movement overhaul')) mockPriceCents += 120000;
    if (servicesStr.includes('corner scuff')) mockPriceCents += 45000;
    if (servicesStr.includes('hardware & zipper')) mockPriceCents += 35000;
    if (servicesStr.includes('scratch removal')) mockPriceCents += 20000;
    if (servicesStr.includes('white gold rhodium')) mockPriceCents += 30000;
    if (servicesStr.includes('chain soldering')) mockPriceCents += 25000;
    
    if (mockPriceCents === 0) mockPriceCents = 15000; 
    return mockPriceCents;
}

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

// GET: /api/care/my-bookings
careRoutes.get('/my-bookings', async (c) => {
  try {
    const auth = createAuth(c.env, () => {})
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session?.user?.email) return c.json({ error: 'Unauthorized' }, 401)

    const { results } = await c.env.DB.prepare(`
      SELECT id as booking_id, service_category, selected_services as services, preferred_date, status 
      FROM care_bookings WHERE customer_email = ? ORDER BY created_at DESC
    `).bind(session.user.email).all()

    const formattedResults = results.map(apt => ({
      ...apt,
      services: (JSON.parse(apt.services as string || '[]')).join(', ')
    }))

    return c.json({ bookings: formattedResults })
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch bookings' }, 500)
  }
})

// POST: /api/care/cancel/:id
careRoutes.post('/cancel/:id', async (c) => {
  try {
    const auth = createAuth(c.env, () => {})
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session?.user?.email) return c.json({ error: 'Unauthorized' }, 401)

    const result = await c.env.DB.prepare(`UPDATE care_bookings SET status = 'CANCELLED' WHERE id = ? AND customer_email = ?`)
        .bind(c.req.param('id'), session.user.email).run()

    if (result.meta.changes === 0) return c.json({ error: 'Booking not found or unauthorized' }, 404)
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: 'Failed to cancel booking' }, 500)
  }
})

// GET: /api/care/booking/:id
careRoutes.get('/booking/:id', async (c) => {
  try {
    const bookingId = c.req.param('id');
    const { results } = await c.env.DB.prepare(`SELECT * FROM care_bookings WHERE id = ?`).bind(bookingId).all();
    if (!results || results.length === 0) return c.json({ error: 'Booking not found in database' }, 404);

    const booking = results[0];
    return c.json({ 
        status: booking.status === 'SCHEDULED' ? 'pending_payment' : 'confirmed',
        price: calculateMockPrice(booking.selected_services as string),
        ...booking 
    });
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch booking details' }, 500);
  }
});

// POST: /api/care/booking/:id/attempts - Generates real scannable QR matching orders.ts
careRoutes.post('/booking/:id/attempts', async (c) => {
    try {
        const bookingId = c.req.param('id');
        const booking = await c.env.DB.prepare(`SELECT * FROM care_bookings WHERE id = ?`).bind(bookingId).first<{id: string; status: string; selected_services: string}>();
        
        if (!booking) throw new HttpError(404, 'Booking not found.');
        
        const attemptId = crypto.randomUUID();
        const createdAt = nowSeconds();
        const expiresAt = createdAt + 120; // 2 minutes expiry matching store orders
        const token = crypto.randomUUID() + crypto.randomUUID(); // Creates the 72-char token required by mock-pay
        const priceCents = calculateMockPrice(booking.selected_services);
        
        // Insert dummy order record & payment attempt so /mock-pay/ recognizes it natively
        await c.env.DB.batch([
            c.env.DB.prepare("UPDATE payment_attempts SET status = 'replaced' WHERE order_id = ? AND status = 'active'").bind(bookingId),
            c.env.DB.prepare('INSERT INTO payment_attempts (id, order_id, method, status, created_at, expires_at, token_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .bind(attemptId, bookingId, 'qr', 'active', createdAt, expiresAt, await hashToken(token)),
            c.env.DB.prepare(`INSERT OR REPLACE INTO orders (id, user_id, status, subtotal_cents, total_cents, active_attempt_id, created_at, idempotency_key) VALUES (?, 'system', 'pending_payment', ?, ?, ?, ?, ?)`)
                .bind(bookingId, priceCents, priceCents, attemptId, createdAt, attemptId)
        ]);
        
        const url = new URL(`/mock-pay/?token=${encodeURIComponent(token)}`, c.env.APP_ORIGIN).toString();
        const qrSvg = new QRCode({ content: url, color: '#e7366b', background: '#ffffff', padding: 4, width: 260, height: 260, ecl: 'M' }).svg();
        
        return c.json({ id: attemptId, method: 'qr', status: 'active', expiresAt, url, qrSvg });
    } catch (err: any) {
        console.error('QR Attempt Error:', err);
        return c.json({ error: err.message || 'Failed to generate QR' }, 500);
    }
});

careRoutes.get('/booking/:id/attempt', async (c) => {
    const bookingId = c.req.param('id');
    const booking = await c.env.DB.prepare(`SELECT * FROM care_bookings WHERE id = ?`).bind(bookingId).first<{status: string}>();
    if (!booking) return c.json({ error: 'Booking not found' }, 404);
    
    const attempt = await c.env.DB.prepare(`SELECT id, method, status, expires_at FROM payment_attempts WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`).bind(bookingId).first<{id: string; method: string; status: string; expires_at: number}>();
    
    const isExpired = attempt && attempt.status === 'active' && attempt.expires_at <= nowSeconds();
    
    return c.json({ 
        orderStatus: booking.status === 'SCHEDULED' || booking.status === 'PENDING_PAYMENT' ? 'pending_payment' : 'confirmed', 
        attempt: attempt ? { ...attempt, status: isExpired ? 'expired' : attempt.status } : null 
    });
});

careRoutes.post('/booking/:id/card-complete', async (c) => {
    const bookingId = c.req.param('id');
    const { outcome } = await readJson<{ outcome?: string }>(c);
    
    if (outcome === 'success') {
        await c.env.DB.batch([
            c.env.DB.prepare(`UPDATE care_bookings SET status = 'CONFIRMED' WHERE id = ?`).bind(bookingId),
            c.env.DB.prepare(`UPDATE orders SET status = 'confirmed' WHERE id = ?`).bind(bookingId)
        ]);
        return c.json({ orderStatus: 'confirmed' });
    }
    return c.json({ orderStatus: 'pending_payment' });
});

// GET: /api/admin/care-appointments
adminCareRoutes.get('/care-appointments', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`SELECT * FROM care_bookings ORDER BY created_at DESC`).all()
    return c.json(results)
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch appointments' }, 500)
  }
})