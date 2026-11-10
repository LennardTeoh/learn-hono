import { api, getCurrentUser } from './api.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'
import { cardFormatError } from './card-format.js'

const id = new URLSearchParams(location.search).get('id')
const isCard = !!document.getElementById('card-payment-root')
const root = document.getElementById(isCard ? 'card-payment-root' : 'payment-root')
const isCareBooking = id && id.includes('CARE'); 
let timer, poller

function pending(message) {
  clearInterval(timer)
  clearInterval(poller)
  root.innerHTML = `<div class="lumiere-panel payment-panel payment-center">
    <p class="lumiere-kicker">${isCareBooking ? 'Booking' : 'Order'} #${escapeHtml(id)}</p><h1 class="payment-title">Pending Payment</h1><p class="payment-copy">${escapeHtml(message)}</p>
    <div class="payment-actions"><button id="retry" class="lumiere-btn">Try again</button>
    <a class="lumiere-btn-outline" href="/${isCard ? 'payment' : 'card-payment'}/?id=${encodeURIComponent(id)}">Change payment method</a></div>
    <p class="payment-note"><a class="payment-link" href="/account/">View history</a></p></div>`
  root.querySelector('#retry').addEventListener('click', start)
}

async function start() {
  clearInterval(timer)
  clearInterval(poller)
  root.innerHTML = '<p class="payment-center">Preparing payment…</p>'
  try {
    let orderData;
    if (isCareBooking) {
        orderData = await api(`/api/care/booking/${encodeURIComponent(id)}`);
    } else {
        const res = await api(`/api/orders/${encodeURIComponent(id)}`);
        orderData = res.order;
    }
    
    const status = orderData.status ? orderData.status.toLowerCase() : '';
    const totalCents = orderData.total_cents || orderData.price || 0;
    
    if (status !== 'pending_payment' && status !== 'pending') { 
        location.href = `/payment-success/?id=${encodeURIComponent(id)}`; 
        return; 
    }
    
    if (!isCard && totalCents > 1_000_000) { 
        pending('Security Warning: credit card payment only for this order.'); 
        return; 
    }
    
    let attempt;
    if (isCareBooking) {
        attempt = {
            id: 'mock-care-attempt',
            expiresAt: Math.floor(Date.now() / 1000) + 120, // 2 minute countdown
            qrSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h33v33H0z"/><path fill="#e11d48" d="M4 4h7v7H4zM6 6h3v3H6zM22 4h7v7h-7zM24 6h3v3h-3zM4 22h7v7H4zM6 24h3v3H6zM13 4h3v2h-3zM18 4h3v3h-3zM15 7h5v2h-5zM12 9h4v2h-4zM18 11h2v3h-2zM21 12h2v4h-2zM24 13h5v2h-5zM27 16h2v3h-2zM4 13h5v4H4zM10 13h2v2h-2zM12 16h3v5h-3zM17 17h4v4h-4zM22 19h2v2h-2zM25 19h4v4h-4zM4 18h2v2H4zM7 19h3v2H7zM13 22h2v2h-2zM17 23h3v4h-3zM22 23h2v3h-2zM26 25h3v4h-3zM21 27h3v2h-3zM11 26h4v3h-4zM7 28h2v2H7z"/></svg>`,
            url: '#'
        };
    } else {
        attempt = await api(`/api/orders/${encodeURIComponent(id)}/attempts`, { method: 'POST', body: JSON.stringify({ method: isCard ? 'card' : 'qr' }) });
    }

    root.innerHTML = `<div class="lumiere-panel payment-panel payment-panel--wide">
      <p class="lumiere-kicker">${isCareBooking ? 'Booking' : 'Order'} #${escapeHtml(id)}</p>
      <h1 class="payment-title">${isCard ? 'Credit Card / Debit Card' : 'DuitNow QR'}</h1>
      <div class="payment-summary"><div class="payment-row"><span>Amount due</span><strong>${money(totalCents)}</strong></div></div>
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
          if (isCareBooking) {
              pending('This attempt expired. Your booking is still payable.');
          } else {
              const state = await api(`/api/orders/${encodeURIComponent(id)}/attempt`)
              if (state.orderStatus === 'confirmed') location.href = `/payment-success/?id=${encodeURIComponent(id)}`
              else pending('This attempt expired. Your order is still payable.')
          }
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
        if (isCareBooking) {
            const res = await api(`/api/care/confirm/${encodeURIComponent(id)}`, { method: 'POST' });
            if(res.success) location.href = `/payment-success/?id=${encodeURIComponent(id)}`;
            else throw new Error("Failed to confirm booking.");
        } else {
            const result = await api(`/api/orders/${encodeURIComponent(id)}/card-complete`, { method: 'POST',
              body: JSON.stringify({ attemptId: attempt.id, outcome: 'success' }) })
            if (result.orderStatus === 'confirmed') location.href = `/payment-success/?id=${encodeURIComponent(id)}`
            else pending('Payment could not be completed. Your order is still payable.')
        }
      } catch (error) { pending(error.message) }
    })
    else poller = setInterval(async () => {
      try {
        if(isCareBooking) {
             // AUTO-REDIRECT REMOVED: The QR Code will now stay on screen.
        } else {
            const state = await api(`/api/orders/${encodeURIComponent(id)}/attempt`)
            if (state.orderStatus === 'confirmed') location.href = `/payment-success/?id=${encodeURIComponent(id)}`
            else if (state.attempt?.status !== 'active') pending('This attempt expired or was replaced. Your order is still payable.')
        }
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