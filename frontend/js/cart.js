import { getCart, removeFromCart, updateQuantity, cartSubtotal } from './cart-store.js'
import { escapeHtml, money, renderShell } from './ui.js'

function render() {
  const items = getCart()
  const host = document.getElementById('cart-items')
  const summary = document.getElementById('cart-summary')

  if (!items.length) {
    host.innerHTML = '<div class="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 class="text-xl font-bold">Your cart is empty</h2><p class="mt-2 text-slate-500">Find something you like and come back here.</p><a href="index.html" class="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">Browse products</a></div>'
    summary.innerHTML = ''
    return
  }

  host.innerHTML = items.map((item) => `
    <div class="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="h-24 w-24 rounded-xl object-cover">
      <div class="min-w-0 flex-1">
        <div class="flex justify-between gap-4">
          <div><h3 class="font-bold text-slate-950">${escapeHtml(item.name)}</h3><p class="mt-1 text-sm text-slate-500">${money(item.priceCents)} each</p></div>
          <button data-remove="${escapeHtml(item.productId)}" class="text-sm font-medium text-red-600 hover:underline">Remove</button>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <input data-qty="${escapeHtml(item.productId)}" type="number" min="1" max="10" value="${item.quantity}" class="w-20 rounded-lg border border-slate-300 px-3 py-2">
          <span class="font-bold">${money(item.priceCents * item.quantity)}</span>
        </div>
      </div>
    </div>`).join('')

  const subtotal = cartSubtotal()
  const shipping = subtotal >= 8000 ? 0 : 799
  const tax = Math.round(subtotal * 0.06)
  summary.innerHTML = `
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-black">Summary</h2>
      <dl class="mt-5 space-y-3 text-sm">
        <div class="flex justify-between"><dt class="text-slate-500">Subtotal</dt><dd>${money(subtotal)}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">Estimated shipping</dt><dd>${shipping ? money(shipping) : 'Free'}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">Estimated tax</dt><dd>${money(tax)}</dd></div>
      </dl>
      <div class="my-5 border-t border-slate-200"></div>
      <div class="flex justify-between text-lg font-black"><span>Estimated total</span><span>${money(subtotal + shipping + tax)}</span></div>
      <a href="checkout.html" class="mt-6 block rounded-xl bg-slate-950 px-5 py-3 text-center font-semibold text-white hover:bg-slate-800">Continue to checkout</a>
    </div>`

  host.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => { removeFromCart(button.dataset.remove); render() })
  })
  host.querySelectorAll('[data-qty]').forEach((input) => {
    input.addEventListener('change', () => { updateQuantity(input.dataset.qty, input.value); render() })
  })
}

renderShell().then(render)
window.addEventListener('nimble:cart-changed', render)
