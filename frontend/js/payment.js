import { api, getCurrentUser } from './api.js'
import { clearCart, getCart, cartSubtotal } from './cart-store.js'
import { money, renderShell, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  if (!await getCurrentUser()) {
    location.href = '/login/?next=/checkout/'
    return
  }

  const items = getCart()
  const checkoutData = JSON.parse(sessionStorage.getItem('lumiere_checkout') || 'null')
  if (!items.length || !checkoutData?.items?.length) {
    location.href = '/checkout/'
    return
  }
  if (!checkoutData.idempotencyKey) {
    checkoutData.idempotencyKey = crypto.randomUUID()
    sessionStorage.setItem('lumiere_checkout', JSON.stringify(checkoutData))
  }

  const subtotal = cartSubtotal()
  const isPickup = checkoutData.deliveryMethod === 'pickup' || checkoutData.isPickup === true
  const eastMalaysia = ['Sabah', 'Sarawak', 'W.P. Labuan'].includes(checkoutData.state)
  const shipping = isPickup ? 0 : (subtotal >= 8000 ? 0 : 799) + (eastMalaysia ? 3000 : 0)
  const tax = Math.round(subtotal * 0.06)
  const total = subtotal + shipping + tax
  const root = document.getElementById('payment-root')

  root.innerHTML = `
    <div class="mx-auto max-w-xl border border-slate-200 bg-white p-8 text-center sm:p-12">
      <p class="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Checkout</p>
      <h1 class="mb-4 font-serif text-4xl text-slate-900">Review your order</h1>
      <p class="mb-8 text-sm leading-6 text-slate-500">Choose a demo payment method below. No money will be taken.</p>
      <dl class="mb-8 space-y-3 border-y border-slate-200 py-6 text-sm">
        <div class="flex justify-between"><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div>
        <div class="flex justify-between"><dt>${isPickup ? 'Pickup' : 'Shipping'}</dt><dd>${shipping ? money(shipping) : 'Free'}</dd></div>
        <div class="flex justify-between"><dt>Tax</dt><dd>${money(tax)}</dd></div>
        <div class="flex justify-between pt-3 text-lg font-semibold"><dt>Total</dt><dd>${money(total)}</dd></div>
      </dl>
      <form id="demo-payment-form">
        <fieldset class="mb-6 text-left">
          <legend class="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Demo payment method</legend>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex cursor-pointer items-start gap-3 border border-slate-900 p-4 text-sm">
              <input type="radio" name="paymentMethod" value="duitnow" checked class="mt-1 accent-slate-900">
              <span><strong class="block text-slate-900">DuitNow QR</strong><span class="text-xs text-slate-500">Preview a demo QR</span></span>
            </label>
            <label class="flex cursor-pointer items-start gap-3 border border-slate-200 p-4 text-sm">
              <input type="radio" name="paymentMethod" value="card" class="mt-1 accent-slate-900">
              <span><strong class="block text-slate-900">Credit / Debit Card</strong><span class="text-xs text-slate-500">No card details needed</span></span>
            </label>
          </div>
        </fieldset>
        <div id="duitnow-details" class="mb-6 border border-slate-200 bg-slate-50 p-6">
          <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-900">DuitNow QR preview</p>
          <svg class="mx-auto mb-4 h-40 w-40 border border-slate-200 bg-white p-3" viewBox="0 0 120 120" role="img" aria-label="Decorative demo QR illustration; not scannable">
            <path fill="#111827" d="M4 4h28v28H4zm8 8v12h12V12zM88 4h28v28H88zm8 8v12h12V12zM4 88h28v28H4zm8 8v12h12V96zM40 4h8v8h-8zm16 0h16v8H56zm8 16h16v8H64zM40 36h8v16h-8zm16 0h8v8h-8zm16 8h8v16h-8zm16-4h8v8h-8zm16 0h12v8h-12zM4 40h16v8H4zm24 8h8v16h-8zM4 64h8v16H4zm16 8h16v8H20zm20 16h8v20h-8zm16 8h16v8H56zm24-16h12v8H80zm20-16h16v8h-16zm-4 28h8v20h-8zm16-12h8v8h-8z"/>
            <rect x="36" y="51" width="49" height="19" fill="white"/><text x="60" y="64" text-anchor="middle" font-size="11" font-weight="bold" fill="#111827">DEMO</text>
          </svg>
          <p class="text-xs leading-5 text-slate-500">Illustration only. It cannot be scanned or used to transfer money.</p>
        </div>
        <div id="card-details" hidden class="mb-6 border border-slate-200 bg-slate-50 p-6">
          <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-900">Card payment preview</p>
          <div class="mx-auto mb-4 flex h-36 w-56 flex-col justify-between bg-slate-900 p-5 text-left text-white shadow-sm">
            <span class="text-[10px] font-bold uppercase tracking-[0.2em]">Demo card</span>
            <span class="whitespace-nowrap font-mono text-sm tracking-wider">•••• •••• •••• ••••</span>
          </div>
          <p class="text-xs leading-5 text-slate-500">This option is simulated. No card number or security code is requested.</p>
        </div>
        <button id="complete-btn" type="submit" class="lumiere-btn w-full">Simulate payment and place demo order</button>
      </form>
      <a href="/checkout/" class="mt-6 block text-xs text-slate-500 underline">Back to checkout</a>
    </div>`

  root.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener('change', () => {
      root.querySelector('#duitnow-details').hidden = !root.querySelector('input[value="duitnow"]').checked
      root.querySelector('#card-details').hidden = !root.querySelector('input[value="card"]').checked
      root.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
        radio.closest('label').classList.toggle('border-slate-900', radio.checked)
        radio.closest('label').classList.toggle('border-slate-200', !radio.checked)
      })
    })
  })

  document.getElementById('demo-payment-form').addEventListener('submit', async (event) => {
    event.preventDefault()
    const button = document.getElementById('complete-btn')
    setBusy(button, true, 'PLACING ORDER...')
    try {
      const data = await api('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': checkoutData.idempotencyKey },
        body: JSON.stringify(checkoutData)
      })
      clearCart()
      sessionStorage.removeItem('lumiere_checkout')
      location.href = `/receipt/?id=${encodeURIComponent(data.orderId)}`
    } catch (error) {
      toast(error.message, 'error')
      setBusy(button, false)
    }
  })
}

init().catch((error) => toast(error.message, 'error'))
