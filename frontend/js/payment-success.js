import { api } from './api.js'
import { escapeHtml, money, renderShell } from './ui.js'

const root = document.getElementById('success-root')
const id = new URLSearchParams(location.search).get('id')
const isCareBooking = id && id.includes('CARE')

async function init() {
  await renderShell()
  if (!id) throw new Error('Order ID missing.')

  let status, totalCents, displayId, isPaid;

  if (isCareBooking) {
    const res = await api(`/api/care/booking/${encodeURIComponent(id)}`)
    if (res.error) throw new Error(res.error)
    
    status = res.status
    totalCents = res.price || 0
    displayId = res.id || id
    isPaid = status === 'confirmed' || status === 'paid'

    if (status === 'pending_payment') { 
      location.href = `/payment/?id=${encodeURIComponent(id)}`
      return 
    }
  } else {
    const { order } = await api(`/api/orders/${encodeURIComponent(id)}`)
    if (!order) throw new Error('Order not found')
    
    status = order.status
    totalCents = order.total_cents
    displayId = order.id
    isPaid = !!order.paid_at

    if (status === 'pending_payment') { 
      location.href = `/${order.mock_method === 'card' ? 'card-payment' : 'payment'}/?id=${encodeURIComponent(id)}`
      return 
    }
  }

  root.innerHTML = `<p class="lumiere-kicker">${isCareBooking ? 'Booking confirmation' : 'Order confirmation'}</p>
    <h1 class="payment-title">${isPaid ? 'Payment successful' : (isCareBooking ? 'Booking confirmed' : 'Order confirmed')}</h1>
    <p class="payment-copy">${isCareBooking ? 'Your booking is confirmed. No real money was charged.' : 'Your order is confirmed. No real money was charged.'}</p>
    <div class="payment-summary">
      <div class="payment-row"><span>${isCareBooking ? 'Booking number' : 'Order number'}</span><strong>#${escapeHtml(displayId)}</strong></div>
      <div class="payment-row"><span>Amount</span><strong>${money(totalCents)}</strong></div>
    </div>
    <div class="payment-actions">
      ${!isCareBooking ? `<a class="lumiere-btn" href="/receipt/?id=${encodeURIComponent(id)}">View receipt</a>` : ''}
      <a class="${isCareBooking ? 'lumiere-btn' : 'lumiere-btn-outline'}" href="/account/${isCareBooking ? 'appointments/' : ''}">View ${isCareBooking ? 'appointments' : 'orders'}</a>
    </div>`
}

init().catch((error) => { 
  root.innerHTML = `<h1 class="payment-title">${isCareBooking ? 'Booking' : 'Order'} unavailable</h1>
  <p class="payment-copy">${escapeHtml(error.message)}</p>
  <div class="payment-actions"><a class="lumiere-btn-outline" href="/account/${isCareBooking ? 'appointments/' : ''}">View ${isCareBooking ? 'appointments' : 'orders'}</a></div>` 
})