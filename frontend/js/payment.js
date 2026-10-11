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
  const root = document.getElementById('payment-root') || document.getElementById('card-payment-root')
  const isCard = root.id === 'card-payment-root'

  root.innerHTML = `
    <div class="mx-auto max-w-${isCard ? '2xl' : 'xl'}">
      <div class="mb-10 text-center">
        <p class="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Demo checkout</p>
        <h1 class="font-serif text-4xl text-slate-900">${isCard ? 'Card Payment' : 'DuitNow QR'}</h1>
      </div>
      <div class="border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <p class="mb-2 text-lg text-slate-900">Amount Due: <strong class="ml-1 lumiere-gold">${money(total)}</strong></p>
        <p class="mb-8 text-xs leading-5 text-slate-500">Demo only. No money will be collected.</p>
        <dl class="mb-8 space-y-2 border-y border-slate-200 py-5 text-sm text-slate-600">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div>
          <div class="flex justify-between"><dt>${isPickup ? 'Pickup' : 'Shipping'}</dt><dd>${shipping ? money(shipping) : 'Free'}</dd></div>
          <div class="flex justify-between"><dt>Tax</dt><dd>${money(tax)}</dd></div>
        </dl>
        <nav class="mb-8 flex gap-4" aria-label="Demo payment method">
          <a href="/payment/" ${isCard ? '' : 'aria-current="page"'} class="flex-1 border-b-2 ${isCard ? 'border-transparent text-slate-400' : 'border-slate-900 text-slate-900'} py-3 text-[10px] font-bold uppercase tracking-widest hover:text-slate-900">DuitNow QR</a>
          <a href="/card-payment/" ${isCard ? 'aria-current="page"' : ''} class="flex-1 border-b-2 ${isCard ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400'} py-3 text-[10px] font-bold uppercase tracking-widest hover:text-slate-900">Credit / Debit Card</a>
        </nav>
        ${isCard ? `
          <div class="mb-8 space-y-5 text-left">
            <p class="text-xs leading-5 text-slate-500">Card form preview. The fields below are display only; no card details are requested.</p>
            <div><p class="mb-2 text-[10px] font-bold uppercase tracking-widest">Name on Card</p><div class="border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">DEMO CUSTOMER</div></div>
            <div><p class="mb-2 text-[10px] font-bold uppercase tracking-widest">Card Number</p><div class="border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-500">•••• •••• •••• ••••</div></div>
            <div class="flex gap-4"><div class="flex-1"><p class="mb-2 text-[10px] font-bold uppercase tracking-widest">Expiry</p><div class="border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">••/••</div></div><div class="flex-1"><p class="mb-2 text-[10px] font-bold uppercase tracking-widest">CVC</p><div class="border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">•••</div></div></div>
          </div>` : `
          <div class="mx-auto mb-8 w-52 rounded-xl bg-[#e7366b] p-3">
            <svg class="h-44 w-full rounded-md bg-white p-3" viewBox="0 0 120 120" role="img" aria-label="Decorative demo QR illustration; not scannable">
              <path fill="#e7366b" d="M4 4h28v28H4zm8 8v12h12V12zM88 4h28v28H88zm8 8v12h12V12zM4 88h28v28H4zm8 8v12h12V96zM40 4h8v8h-8zm16 0h16v8H56zm8 16h16v8H64zM40 36h8v16h-8zm16 0h8v8h-8zm16 8h8v16h-8zm16-4h8v8h-8zm16 0h12v8h-12zM4 40h16v8H4zm24 8h8v16h-8zM4 64h8v16H4zm16 8h16v8H20zm20 16h8v20h-8zm16 8h16v8H56zm24-16h12v8H80zm20-16h16v8h-16zm-4 28h8v20h-8zm16-12h8v8h-8z"/>
              <rect x="36" y="51" width="49" height="19" fill="white"/><text x="60" y="64" text-anchor="middle" font-size="11" font-weight="bold" fill="#e7366b">DEMO</text>
            </svg>
            <p class="pt-2 text-[10px] font-bold uppercase tracking-widest text-white">Malaysia QR Demo</p>
          </div>
          <p class="mx-auto mb-8 max-w-sm text-xs leading-5 text-slate-500">This illustration cannot be scanned or used to transfer money.</p>
          <div class="mb-8 border-t border-slate-200 pt-6">
            <p class="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-900">Payment Receipt</p>
            <div class="flex h-24 items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-xs text-slate-500">No receipt upload is needed for this demo.</div>
          </div>`}
        <form id="demo-payment-form">
          <button id="complete-btn" type="submit" class="w-full ${isCard ? 'bg-slate-900 hover:bg-black' : 'bg-[#005bb5] hover:bg-[#004a94]'} px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50">Simulate payment and place demo order</button>
        </form>
        <a href="/checkout/" class="mt-6 block text-xs text-slate-500 underline">Back to checkout</a>
      </div>
    </div>`

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
