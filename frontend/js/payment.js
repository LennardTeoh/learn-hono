import { api, getCurrentUser } from './api.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'
import { cardFormatError } from './card-format.js'

const id = new URLSearchParams(location.search).get('id')
const isCard = !!document.getElementById('card-payment-root')
const root = document.getElementById(isCard ? 'card-payment-root' : 'payment-root')
let timer, poller

function pending(message) {
  clearInterval(timer)
  clearInterval(poller)
  root.innerHTML = `<div class="lumiere-panel payment-panel payment-center">
    <p class="lumiere-kicker">Order #${escapeHtml(id)}</p><h1 class="payment-title">Pending Payment</h1><p class="payment-copy">${escapeHtml(message)}</p>
    <div class="payment-actions"><button id="retry" class="lumiere-btn">Try again</button>
    <a class="lumiere-btn-outline" href="/${isCard ? 'payment' : 'card-payment'}/?id=${encodeURIComponent(id)}">Change payment method</a></div>
    <p class="payment-note"><a class="payment-link" href="/account/">View order history</a></p></div>`
  root.querySelector('#retry').addEventListener('click', start)
}

async function start() {
  clearInterval(timer)
  clearInterval(poller)
  root.innerHTML = '<p class="payment-center">Preparing payment…</p>'
  try {
    const { order } = await api(`/api/orders/${encodeURIComponent(id)}`)
    if (order.status !== 'pending_payment') { location.href = `/payment-success/?id=${encodeURIComponent(id)}`; return }
    if (!isCard && order.subtotal_cents > 1_000_000) { pending('Security Warning: credit card payment only for this order.'); return }
    const attempt = await api(`/api/orders/${encodeURIComponent(id)}/attempts`, { method: 'POST', body: JSON.stringify({ method: isCard ? 'card' : 'qr' }) })
    root.innerHTML = `<div class="lumiere-panel payment-panel payment-panel--wide">
      <p class="lumiere-kicker">Order #${escapeHtml(id)}</p>
      <h1 class="payment-title">${isCard ? 'Credit Card / Debit Card' : 'DuitNow QR'}</h1>
      <div class="payment-summary"><div class="payment-row"><span>Amount due</span><strong>${money(order.total_cents)}</strong></div></div>
      <p class="payment-note">No real money will be charged.</p>
      <p class="payment-status" aria-live="polite">Time remaining: <strong id="countdown"></strong></p>
      ${isCard ? `<form id="card-form" autocomplete="off">
        <p class="payment-note">Enter a card-format number. Card details stay in this browser.</p>
        <label class="payment-field">Cardholder name<input id="card-name" required maxlength="80" autocomplete="off"></label>
        <label class="payment-field">Card number<input id="card-number" required inputmode="numeric" autocomplete="off" placeholder="13 to 19 digits"></label>
        <div class="payment-card-grid"><label class="payment-field">Expiry (MM/YY)<input id="card-expiry" required inputmode="numeric" autocomplete="off" placeholder="MM/YY" maxlength="5"></label>
        <label class="payment-field">Back-of-card CVV<input id="card-cvv" required inputmode="numeric" type="password" autocomplete="off" maxlength="4" placeholder="3 or 4 digits"></label></div>
        <div class="payment-actions"><button class="lumiere-btn" type="submit">Pay the Amount</button></div></form>` : `<div class="payment-center"><img class="payment-qr" alt="Scannable payment QR code" src="data:image/svg+xml,${encodeURIComponent(attempt.qrSvg)}">
        <p class="payment-note">Scan with another device to review and pay this order.</p>
        <p class="payment-note"><a class="payment-link" href="${escapeHtml(attempt.url)}" target="_blank" rel="noopener noreferrer">Pay on this device instead</a></p></div>`}
      <p class="payment-note payment-center"><a class="payment-link" href="/${isCard ? 'payment' : 'card-payment'}/?id=${encodeURIComponent(id)}">Change payment method</a></p></div>`
    const tick = async () => {
      const seconds = Math.max(0, attempt.expiresAt - Math.floor(Date.now() / 1000))
      const countdown = root.querySelector('#countdown')
      if (!countdown) return
      countdown.textContent = `${seconds}s`
      if (!seconds) {
        clearInterval(timer)
        try {
          const state = await api(`/api/orders/${encodeURIComponent(id)}/attempt`)
          if (state.orderStatus === 'confirmed') location.href = `/payment-success/?id=${encodeURIComponent(id)}`
          else pending('This attempt expired. Your order is still payable.')
        } catch (error) { pending(error.message) }
      }
    }
    tick()
    timer = setInterval(tick, 1000)
    if (isCard) root.querySelector('#card-form').addEventListener('submit', async (event) => {
      event.preventDefault()
      const name = root.querySelector('#card-name').value.trim()
      const number = root.querySelector('#card-number').value
      const expiry = root.querySelector('#card-expiry').value
      const cvv = root.querySelector('#card-cvv').value
      const error = cardFormatError(name, number, expiry, cvv)
      if (error) { toast(error, 'error'); return }
      event.currentTarget.querySelector('button').disabled = true
      try {
        const result = await api(`/api/orders/${encodeURIComponent(id)}/card-complete`, { method: 'POST',
          body: JSON.stringify({ attemptId: attempt.id, outcome: 'success' }) })
        if (result.orderStatus === 'confirmed') location.href = `/payment-success/?id=${encodeURIComponent(id)}`
        else pending('Payment could not be completed. Your order is still payable.')
      } catch (error) { pending(error.message) }
    })
    else poller = setInterval(async () => {
      try {
        const state = await api(`/api/orders/${encodeURIComponent(id)}/attempt`)
        if (state.orderStatus === 'confirmed') location.href = `/payment-success/?id=${encodeURIComponent(id)}`
        else if (state.attempt?.status !== 'active') pending('This attempt expired or was replaced. Your order is still payable.')
      } catch (error) { toast(error.message, 'error') }
    }, 10_000)
  } catch (error) { pending(error.message) }
}

async function init() {
  await renderShell()
  if (!await getCurrentUser()) { location.href = '/login/?next=/account/'; return }
  if (!id) { location.href = '/account/'; return }
  await start()
}

init().catch((error) => pending(error.message))
