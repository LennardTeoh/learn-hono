import { api, getCurrentUser } from './api.js'
import { clearCart, getCart, cartSubtotal } from './cart-store.js'
import { escapeHtml, money, renderShell, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  const user = await getCurrentUser()
  const items = getCart()

  if (!user) {
    document.getElementById('checkout-root').innerHTML = `
      <div class="rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <h2 class="text-2xl font-black">Sign in to finish checkout</h2>
        <p class="mt-2 text-slate-500">Your cart stays in this browser.</p>
        <a href="/login/?next=/checkout/" class="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">Sign in</a>
      </div>`
    return
  }

  if (!items.length) {
    location.href = '/cart/'
    return
  }

  const subtotal = cartSubtotal()
  const shipping = subtotal >= 8000 ? 0 : 799
  const tax = Math.round(subtotal * 0.06)
  document.getElementById('order-summary').innerHTML = `
    <div class="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 class="font-black">Order summary</h2>
      <div class="mt-4 space-y-4">
        ${items.map((item) => `<div class="flex gap-3"><img src="${escapeHtml(item.imageUrl)}" class="h-14 w-14 rounded-lg object-cover" alt=""><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${escapeHtml(item.name)}</p><p class="text-xs text-slate-500">Qty ${item.quantity}</p></div><p class="text-sm font-semibold">${money(item.priceCents * item.quantity)}</p></div>`).join('')}
      </div>
      <div class="my-5 border-t"></div>
      <dl class="space-y-2 text-sm"><div class="flex justify-between"><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div><div class="flex justify-between"><dt>Shipping</dt><dd>${shipping ? money(shipping) : 'Free'}</dd></div><div class="flex justify-between"><dt>Tax</dt><dd>${money(tax)}</dd></div></dl>
      <div class="mt-4 flex justify-between text-lg font-black"><span>Total</span><span>${money(subtotal + shipping + tax)}</span></div>
      <p class="mt-3 text-xs leading-5 text-slate-400">The server recalculates the final total from product IDs and quantities. No card data is collected.</p>
    </div>`

  const form = document.getElementById('checkout-form')
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const button = form.querySelector('button[type="submit"]')
    setBusy(button, true, 'Placing order…')

    try {
      const payload = Object.fromEntries(new FormData(form).entries())
      payload.items = getCart().map((item) => ({ productId: item.productId, quantity: item.quantity }))

      const data = await api('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify(payload)
      })

      clearCart()
      document.getElementById('checkout-root').innerHTML = `
        <div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-2xl text-white">✓</div>
          <h2 class="mt-5 text-3xl font-black text-slate-950">Order confirmed</h2>
          <p class="mt-2 text-slate-600">Dummy checkout complete. No payment was processed.</p>
          <p class="mt-3 text-sm font-mono text-slate-500">Order ${escapeHtml(data.orderId)}</p>
          <a href="/account/" class="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">View orders</a>
        </div>`
    } catch (error) {
      toast(error.message, 'error')
    } finally {
      setBusy(button, false)
    }
  })
}

init().catch((error) => toast(error.message, 'error'))
