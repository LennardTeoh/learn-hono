import { api, getCurrentUser } from './api.js'
import { clearCart, getCart, cartSubtotal } from './cart-store.js'
import { imageForCartItem } from './product-images.js'
import { escapeHtml, money, renderShell, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  const user = await getCurrentUser()
  const items = getCart()

  if (!user) {
    document.getElementById('checkout-root').innerHTML = `
      <div class="rounded-none border border-slate-200 bg-white p-8 text-center">
        <h2 class="text-2xl font-serif">Sign in to finish checkout</h2>
        <p class="mt-2 text-slate-500">Your cart stays in this browser.</p>
        <a href="/login/?next=/checkout/" class="lumiere-btn mt-6">Sign in</a>
      </div>`
    return
  }

  if (!items.length) {
    location.href = '/cart/'
    return
  }

  const getDeliveryMethod = () => {
    const checked = document.querySelector('input[name="deliveryMethod"]:checked')
    return checked ? checked.value : 'delivery'
  }

  const renderSummary = () => {
    const isPickup = getDeliveryMethod() === 'pickup'
    const stateSelect = document.getElementById('state-select')
    const state = stateSelect && !stateSelect.disabled ? stateSelect.value : ''
    const isEastMalaysia = !isPickup && (state === 'Sabah' || state === 'Sarawak' || state === 'W.P. Labuan')
    
    const subtotal = cartSubtotal()
    
    let shipping = 0
    if (!isPickup) {
        const baseShipping = subtotal >= 8000 ? 0 : 799
        shipping = baseShipping + (isEastMalaysia ? 3000 : 0)
    }
    
    const tax = Math.round(subtotal * 0.06)
    
    document.getElementById('order-summary').innerHTML = `
      <div class="rounded-none border border-slate-200 bg-white p-6">
        <h2 class="font-serif text-xl">Order summary</h2>
        <div class="mt-4 space-y-4">
          ${items.map((item) => `<div class="flex gap-3"><img src="${escapeHtml(imageForCartItem(item))}" class="h-14 w-14 rounded-none object-cover" alt=""><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${escapeHtml(item.name)}</p><p class="text-xs text-slate-500">Qty ${item.quantity}</p></div><p class="text-sm font-semibold">${money(item.priceCents * item.quantity)}</p></div>`).join('')}
        </div>
        <div class="my-5 border-t"></div>
        <dl class="space-y-2 text-sm"><div class="flex justify-between"><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div><div class="flex justify-between"><dt>${isPickup ? 'Pickup' : 'Shipping'}</dt><dd>${shipping ? money(shipping) : 'Free'}</dd></div><div class="flex justify-between"><dt>Tax</dt><dd>${money(tax)}</dd></div></dl>
        <div class="mt-4 flex justify-between text-lg font-semibold"><span>Total</span><span>${money(subtotal + shipping + tax)}</span></div>
        <p class="mt-3 text-xs leading-5 text-slate-400">The server recalculates the final total from product IDs and quantities. No card data is collected.</p>
      </div>`
  }

  // Handle Delivery vs Pickup Form Visibility & Disabling
  const deliveryRadios = document.querySelectorAll('input[name="deliveryMethod"]')
  
  const addressSection = document.getElementById('address-section')
  const addressInputs = document.querySelectorAll('.address-input')
  
  const billingSection = document.getElementById('billing-section')
  const billingInputs = document.querySelectorAll('.billing-input')

  deliveryRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'pickup') {
        addressSection.classList.add('hidden')
        addressInputs.forEach(input => {
          input.required = false
          input.disabled = true
        })
        
        billingSection.classList.remove('hidden')
        billingInputs.forEach(input => {
          if (input.name !== 'address2') input.required = true
          input.disabled = false
        })
      } else {
        addressSection.classList.remove('hidden')
        addressInputs.forEach(input => {
          if (input.name !== 'address2') input.required = true
          input.disabled = false
        })
        
        billingSection.classList.add('hidden')
        billingInputs.forEach(input => {
          input.required = false
          input.disabled = true
        })
      }
      renderSummary()
    })
  })

  renderSummary()
  const paymentChoices = document.createElement('fieldset')
  paymentChoices.className = 'checkout-payment-methods'
  paymentChoices.innerHTML = `<legend class="font-serif">Payment method</legend>
    <label class="checkout-payment-option"><input type="radio" name="paymentMethod" value="qr" checked> DuitNow QR</label>
    <label class="checkout-payment-option"><input type="radio" name="paymentMethod" value="card"> Credit Card / Debit Card</label>
    <p id="payment-warning" class="checkout-payment-warning" role="status"></p>`
  document.getElementById('checkout-form').querySelector('button[type="submit"]').before(paymentChoices)
  const updateMethods = () => {
    const qr = paymentChoices.querySelector('input[value="qr"]')
    qr.disabled = cartSubtotal() > 1_000_000
    if (qr.disabled) paymentChoices.querySelector('input[value="card"]').checked = true
    paymentChoices.querySelector('#payment-warning').textContent = qr.disabled ? 'Security Warning: credit card payment only for product subtotals above RM10,000.' : ''
  }
  updateMethods()
  const stateSelect = document.getElementById('state-select')
  if (stateSelect) {
    stateSelect.addEventListener('change', renderSummary)
  }

  // Save the order before opening its payment page.
  const form = document.getElementById('checkout-form')
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const button = form.querySelector('button[type="submit"]')
    const payload = Object.fromEntries(new FormData(form).entries())
    payload.items = getCart().map((item) => ({ productId: item.productId, quantity: item.quantity }))
    const key = sessionStorage.getItem('lumiere_order_key') || crypto.randomUUID()
    sessionStorage.setItem('lumiere_order_key', key)
    setBusy(button, true, 'CREATING ORDER...')
    try {
      const order = await api('/api/orders', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
      if (!order.allowedMethods.includes(payload.paymentMethod)) throw new Error('Selected method unavailable for this order. Choose card payment.')
      clearCart()
      sessionStorage.removeItem('lumiere_order_key')
      location.href = `/${payload.paymentMethod === 'qr' ? 'payment' : 'card-payment'}/?id=${encodeURIComponent(order.orderId)}`
    } catch (error) {
      toast(error.message, 'error')
      setBusy(button, false)
    }
  })
}

init().catch((error) => toast(error.message, 'error'))
