import { api } from './api.js'
import { escapeHtml, money } from './ui.js'

const root = document.getElementById('mock-pay-root')
const token = new URLSearchParams(location.search).get('token')
async function init() {
  if (!token) throw new Error('Payment link missing.')
  const details = await api(`/api/orders/mock/${encodeURIComponent(token)}`)
  root.innerHTML = `<h1 class="font-serif text-3xl">Mock QR payment</h1>
    <p class="mt-3 text-sm">Order #${escapeHtml(details.orderId)}</p>
    <ul class="my-6 border-y py-4">${details.items.map((item) => `<li class="flex justify-between py-2"><span>${escapeHtml(item.product_name)} × ${item.quantity}</span><span>${money(item.unit_price_cents * item.quantity)}</span></li>`).join('')}</ul>
    <p class="text-xl">Amount: <strong>${money(details.amount)}</strong></p>
    <p class="mt-3 text-sm">Demo only. No money moves.</p>
    <p class="mt-3 text-sm">Time remaining: <strong id="remaining"></strong></p>
    <button id="pay" class="lumiere-btn mt-6 w-full">Pay the Amount</button>
    <p id="result" class="mt-4 text-sm" role="status"></p>`
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
      root.querySelector('#result').textContent = 'Mock payment successful. The customer can view the receipt in their account.'
    } catch (error) { root.querySelector('#result').textContent = error.message }
  })
}
init().catch((error) => { root.textContent = error.message })
