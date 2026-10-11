import { api } from './api.js'
import { escapeHtml, money } from './ui.js'

const root = document.getElementById('mock-pay-root')
const token = new URLSearchParams(location.search).get('token')
async function init() {
  if (!token) throw new Error('Payment link missing.')
  const details = await api(`/api/orders/mock/${encodeURIComponent(token)}`)
  root.innerHTML = `<p class="lumiere-kicker">QR payment</p>
    <h1 class="payment-title">Review your order</h1>
    <p class="payment-copy">Order #${escapeHtml(details.orderId)}</p>
    <ul class="payment-list">${details.items.map((item) => `<li><span>${escapeHtml(item.product_name)} × ${item.quantity}</span><strong>${money(item.unit_price_cents * item.quantity)}</strong></li>`).join('')}</ul>
    <div class="payment-row"><span>Amount due</span><strong>${money(details.amount)}</strong></div>
    <p class="payment-note">No real money will be charged.</p>
    <p class="payment-status">Time remaining: <strong id="remaining"></strong></p>
    <div class="payment-actions"><button id="pay" class="lumiere-btn" type="button">Pay the Amount</button></div>
    <p id="result" class="payment-status" role="status" aria-live="polite"></p>`
  const button = root.querySelector('#pay')
  const tick = () => {
    const seconds = Math.max(0, details.expiresAt - Math.floor(Date.now() / 1000))
    root.querySelector('#remaining').textContent = `${seconds}s`
    if (!seconds || details.status !== 'active') button.disabled = true
    if (!seconds) root.querySelector('#result').textContent = 'This link expired. Ask the customer to try again.'
    else if (details.status !== 'active') root.querySelector('#result').textContent = 'This link is no longer payable.'
  }
  tick()
  setInterval(tick, 1000)
  button.addEventListener('click', async () => {
    button.disabled = true
    try {
      await api(`/api/orders/mock/${encodeURIComponent(token)}/authorize`, { method: 'POST' })
      root.querySelector('#result').textContent = 'Payment successful. The customer can view the receipt in their account.'
    } catch (error) { root.querySelector('#result').textContent = error.message }
  })
}
init().catch((error) => { root.innerHTML = `<p class="lumiere-kicker">QR payment</p><h1 class="payment-title">Link unavailable</h1><p class="payment-copy">${escapeHtml(error.message)}</p>` })
