import { api, getCurrentUser } from './api.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

const id = new URLSearchParams(location.search).get('id')
const isCard = !!document.getElementById('card-payment-root')
const root = document.getElementById(isCard ? 'card-payment-root' : 'payment-root')
let timer, poller

function pending(message) {
  clearInterval(timer)
  clearInterval(poller)
  root.innerHTML = `<div class="mx-auto max-w-xl border bg-white p-10 text-center">
    <h1 class="font-serif text-3xl">Pending Payment</h1><p class="mt-4">${escapeHtml(message)}</p>
    <button id="retry" class="lumiere-btn mt-8">Try again</button>
    <a class="mt-5 block text-sm underline" href="/${isCard ? 'payment' : 'card-payment'}/?id=${encodeURIComponent(id)}">Change payment method</a>
    <a class="mt-4 block text-sm underline" href="/account/">Order history</a></div>`
  root.querySelector('#retry').addEventListener('click', start)
}

async function start() {
  clearInterval(timer)
  clearInterval(poller)
  root.innerHTML = '<p class="text-center">Starting mock payment…</p>'
  try {
    const { order } = await api(`/api/orders/${encodeURIComponent(id)}`)
    if (order.status !== 'pending_payment') { location.href = `/payment-success/?id=${encodeURIComponent(id)}`; return }
    if (!isCard && order.subtotal_cents > 1_000_000) { pending('Security Warning: credit card payment only for this order.'); return }
    const attempt = await api(`/api/orders/${encodeURIComponent(id)}/attempts`, { method: 'POST', body: JSON.stringify({ method: isCard ? 'card' : 'qr' }) })
    root.innerHTML = `<div class="mx-auto max-w-xl border bg-white p-8 text-center sm:p-12">
      <p class="text-xs uppercase tracking-widest">Order #${escapeHtml(id)}</p>
      <h1 class="mt-3 font-serif text-3xl">${isCard ? 'Test card payment' : 'Mock QR payment'}</h1>
      <p class="mt-6 text-lg">Amount due: <strong>${money(order.total_cents)}</strong></p>
      <p class="mt-2 text-xs">Demo only. No money moves.</p>
      <p class="mt-4 text-sm" aria-live="polite">Time remaining: <strong id="countdown"></strong></p>
      ${isCard ? `<form id="card-form" class="mt-8 space-y-4 text-left" autocomplete="off">
        <p class="text-sm font-semibold">Test cards only: 4242 4242 4242 4242 succeeds; 4000 0000 0000 0002 declines. Test CVV: 123.</p>
        <label class="block text-sm">Cardholder name<input id="card-name" required maxlength="80" class="mt-1 w-full border p-3"></label>
        <label class="block text-sm">Card number<input id="card-number" required inputmode="numeric" placeholder="4242 4242 4242 4242" class="mt-1 w-full border p-3"></label>
        <label class="block text-sm">Expiry (MM/YY)<input id="card-expiry" required inputmode="numeric" placeholder="MM/YY" class="mt-1 w-full border p-3"></label>
        <label class="block text-sm">Back-of-card CVV<input id="card-cvv" required inputmode="numeric" type="password" maxlength="3" class="mt-1 w-full border p-3"></label>
        <button class="lumiere-btn w-full" type="submit">Pay the Amount</button></form>` : `<img class="mx-auto mt-8 h-64 w-64" alt="Scannable mock payment QR" src="data:image/svg+xml,${encodeURIComponent(attempt.qrSvg)}">
        <a class="mt-5 block text-sm underline" href="${escapeHtml(attempt.url)}" target="_blank" rel="noopener noreferrer">Pay on this device instead</a>
        <p class="mt-4 text-xs">Scan on another device to review and authorize this mock payment.</p>`}
      <a class="mt-8 block text-sm underline" href="/${isCard ? 'payment' : 'card-payment'}/?id=${encodeURIComponent(id)}">Change payment method</a></div>`
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
      const number = root.querySelector('#card-number').value.replace(/\s/g, '')
      const expiry = root.querySelector('#card-expiry').value.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
      const cvv = root.querySelector('#card-cvv').value
      const future = expiry && (2000 + Number(expiry[2]) > new Date().getFullYear() ||
        (2000 + Number(expiry[2]) === new Date().getFullYear() && Number(expiry[1]) >= new Date().getMonth() + 1))
      if (!name || !['4242424242424242', '4000000000000002'].includes(number) || !future || cvv !== '123') {
        toast('Enter a listed test card, future expiry, name, and test CVV 123.', 'error'); return
      }
      event.currentTarget.querySelector('button').disabled = true
      try {
        const result = await api(`/api/orders/${encodeURIComponent(id)}/card-complete`, { method: 'POST',
          body: JSON.stringify({ attemptId: attempt.id, outcome: number === '4242424242424242' ? 'success' : 'decline' }) })
        if (result.orderStatus === 'confirmed') location.href = `/payment-success/?id=${encodeURIComponent(id)}`
        else pending('The test card was declined. Your order is still payable.')
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
