import { api } from './api.js'
import { escapeHtml, money } from './ui.js'

const root = document.getElementById('success-root')
const id = new URLSearchParams(location.search).get('id')
async function init() {
  if (!id) throw new Error('Order ID missing.')
  const { order } = await api(`/api/orders/${encodeURIComponent(id)}`)
  if (order.status === 'pending_payment') { location.href = `/${order.mock_method === 'card' ? 'card-payment' : 'payment'}/?id=${encodeURIComponent(id)}`; return }
  root.innerHTML = `<h1 class="font-serif text-3xl">${order.paid_at ? 'Mock payment successful' : 'Order confirmed'}</h1><p class="mt-4">Order #${escapeHtml(order.id)} · ${money(order.total_cents)}</p>
    <p class="mt-4 text-sm">No real money was charged.</p><a class="lumiere-btn mt-7" href="/receipt/?id=${encodeURIComponent(id)}">View receipt</a>`
}
init().catch((error) => { root.textContent = error.message })
