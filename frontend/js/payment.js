import { api, getCurrentUser } from './api.js'
import { clearCart, getCart, cartSubtotal } from './cart-store.js'
import { imageForCartItem } from './product-images.js'
import { escapeHtml, money, renderShell, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  const user = await getCurrentUser()
  const items = getCart()

  if (!user) {
    location.href = '/login/?next=/checkout/'
    return
  }

  if (!items.length) {
    location.href = '/cart/'
    return
  }

  const payloadString = sessionStorage.getItem('lumiere_checkout')
  if (!payloadString) {
    location.href = '/checkout/'
    return
  }

  const checkoutData = JSON.parse(payloadString)
  const isPickup = checkoutData.isPickup

  const subtotal = cartSubtotal()
  let shipping = 0
  
  if (!isPickup) {
      const isEastMalaysia = checkoutData.state === 'Sabah' || checkoutData.state === 'Sarawak' || checkoutData.state === 'W.P. Labuan'
      const baseShipping = subtotal >= 8000 ? 0 : 799
      shipping = baseShipping + (isEastMalaysia ? 3000 : 0)
  }
  
  const tax = Math.round(subtotal * 0.06)
  
  document.getElementById('order-summary').innerHTML = `
    <div class="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 class="font-black">Order summary</h2>
      <div class="mt-4 space-y-4">
        ${items.map((item) => `<div class="flex gap-3"><img src="${escapeHtml(imageForCartItem(item))}" class="h-14 w-14 rounded-lg object-cover" alt=""><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${escapeHtml(item.name)}</p><p class="text-xs text-slate-500">Qty ${item.quantity}</p></div><p class="text-sm font-semibold">${money(item.priceCents * item.quantity)}</p></div>`).join('')}
      </div>
      <div class="my-5 border-t"></div>
      <dl class="space-y-2 text-sm"><div class="flex justify-between"><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div><div class="flex justify-between"><dt>${isPickup ? 'Pickup' : 'Shipping'}</dt><dd>${shipping ? money(shipping) : 'Free'}</dd></div><div class="flex justify-between"><dt>Tax</dt><dd>${money(tax)}</dd></div></dl>
      <div class="mt-4 flex justify-between text-lg font-black"><span>Total</span><span>${money(subtotal + shipping + tax)}</span></div>
    </div>`

  const form = id => document.getElementById(id)
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]')
  
  const cardFields = form('card-fields')
  const fpxFields = form('fpx-fields')
  const ewalletFields = form('ewallet-fields')

  const cardInputs = [form('card-num'), form('card-exp'), form('card-cvc'), form('card-name')]
  const fpxBank = form('fpx-bank')
  
  paymentRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
          const method = e.target.value
          
          // Reset all sections
          cardFields.classList.add('hidden')
          fpxFields.classList.add('hidden')
          ewalletFields.classList.add('hidden')
          
          cardInputs.forEach(i => i.required = false)
          if (fpxBank) fpxBank.required = false

          // Enable active section
          if (method === 'card') {
              cardFields.classList.remove('hidden')
              cardInputs.forEach(i => i.required = true)
          } else if (method === 'fpx') {
              fpxFields.classList.remove('hidden')
              if (fpxBank) fpxBank.required = true
          } else if (method === 'ewallet') {
              ewalletFields.classList.remove('hidden')
          }
      })
  })

  form('payment-form').addEventListener('submit', async (event) => {
    event.preventDefault()
    const button = event.target.querySelector('button[type="submit"]')
    setBusy(button, true, 'Processing payment...')

    try {
      delete checkoutData.isPickup 
      
      const data = await api('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify(checkoutData)
      })

      const verificationCode = Math.floor(100000 + Math.random() * 900000)
      
      const pickupHtml = isPickup ? `
        <div class="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Store Verification Code</p>
            <p class="mt-2 text-4xl font-mono font-black tracking-[0.2em] text-slate-950">${verificationCode}</p>
            <p class="mt-2 text-sm text-slate-500">Show this code to the staff at collection.</p>
        </div>` : ''

      clearCart()
      sessionStorage.removeItem('lumiere_checkout')
      
      await new Promise(resolve => setTimeout(resolve, 800))
      
      document.getElementById('payment-root').innerHTML = `
        <div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center max-w-md mx-auto">
          <div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-2xl text-white">✓</div>
          <h2 class="mt-5 text-3xl font-black text-slate-950">Payment successful</h2>
          <p class="mt-2 text-slate-600">Your luxury order has been confirmed.</p>
          <p class="mt-3 text-sm font-mono text-slate-500 mb-2">Order ${escapeHtml(data.orderId)}</p>
          ${pickupHtml}
          <a href="/account/" class="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">View orders</a>
        </div>`
    } catch (error) {
      toast(error.message, 'error')
    } finally {
      if (button) setBusy(button, false)
    }
  })
}

init().catch((error) => toast(error.message, 'error'))