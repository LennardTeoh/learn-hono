import { api } from './api.js'
import { escapeHtml, money, renderShell } from './ui.js'

const root = document.getElementById('success-root')
const id = new URLSearchParams(location.search).get('id')
async function init() {
  await renderShell()
  if (!id) throw new Error('Order ID missing.')
  const { order } = await api(`/api/orders/${encodeURIComponent(id)}`)
  if (order.status === 'pending_payment') { location.href = `/${order.mock_method === 'card' ? 'card-payment' : 'payment'}/?id=${encodeURIComponent(id)}`; return }
  root.innerHTML = `<p class="lumiere-kicker">Order confirmation</p>
    <h1 class="payment-title">${order.paid_at ? 'Payment successful' : 'Order confirmed'}</h1>
    <p class="payment-copy">Your order is confirmed. No real money was charged.</p>
    <div class="payment-summary">
      <div class="payment-row"><span>Order number</span><strong>#${escapeHtml(order.id)}</strong></div>
      <div class="payment-row"><span>Amount</span><strong>${money(order.total_cents)}</strong></div>
    </div>
    <div class="payment-actions"><a class="lumiere-btn" href="/receipt/?id=${encodeURIComponent(id)}">View receipt</a><a class="lumiere-btn-outline" href="/account/">View orders</a></div>`
}
init().catch((error) => { root.innerHTML = `<h1 class="payment-title">Order unavailable</h1><p class="payment-copy">${escapeHtml(error.message)}</p><div class="payment-actions"><a class="lumiere-btn-outline" href="/account/">View orders</a></div>` })
