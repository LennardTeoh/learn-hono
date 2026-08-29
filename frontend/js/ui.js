import { cartCount } from './cart-store.js'
import { getCurrentUser } from './api.js'

export function money(cents) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(cents / 100)
}

export function toast(message, type = 'info') {
  let host = document.getElementById('toast-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'toast-host'
    host.className = 'fixed right-4 top-4 z-50 space-y-2'
    document.body.appendChild(host)
  }
  const el = document.createElement('div')
  const tone = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-emerald-600' : 'bg-slate-900'
  el.className = `toast ${tone} max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl`
  el.textContent = message
  host.appendChild(el)
  setTimeout(() => el.remove(), 3200)
}

export function setBusy(button, busy, busyText = 'Please wait…') {
  if (!button) return
  if (busy) {
    button.dataset.originalText = button.textContent
    button.disabled = true
    button.textContent = busyText
    button.classList.add('opacity-70', 'cursor-not-allowed')
  } else {
    button.disabled = false
    button.textContent = button.dataset.originalText || button.textContent
    button.classList.remove('opacity-70', 'cursor-not-allowed')
  }
}

export function updateCartBadge() {
  const count = cartCount()
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(count)
    el.classList.toggle('hidden', count === 0)
  })
}

function mountFloatCart() {
  if (location.pathname === '/cart/' || document.getElementById('pb-float-cart')) return
  const link = document.createElement('a')
  link.id = 'pb-float-cart'
  link.className = 'pb-float-cart'
  link.href = '/cart/'
  link.setAttribute('aria-label', 'Open cart')
  link.innerHTML = `<svg class="pb-float-cart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l1.2 9.1a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 1.9-1.5L20 8H7"/><path d="M10 19.5h.01M17 19.5h.01"/></svg><span>Add to cart</span><span data-cart-count class="pb-float-cart-count">0</span>`
  document.body.appendChild(link)
}

export async function renderShell() {
  const user = await getCurrentUser()
  const header = document.getElementById('site-header')
  const footer = document.getElementById('site-footer')

  if (header) {
    header.innerHTML = `
      <div class="pb-shell">
        <div class="pb-nav">
          <a href="/" class="pb-brand"><span class="pb-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path class="pb-logo-plate" d="M9 31h30v4H9z"/><path class="pb-logo-cake" d="M12 28c0-5 4-8 12-8s12 3 12 8v3H12z"/><path class="pb-logo-icing" d="M12 22c2-4 5-5 7-2 2-4 5-4 7 0 2-3 5-2 7 2H12z"/><circle class="pb-logo-berry" cx="24" cy="14" r="3"/><path class="pb-logo-leaf" d="M24 11c-1-3 2-4 4-4-1 3-2 4-4 4z"/></svg></span><span>PetitBakery</span></a>
          <nav class="pb-nav-links" aria-label="Primary">
            <a href="/products/">Shop treats</a>
            <a href="/#why-title">How it works</a>
            <a href="/#faq-title">FAQ</a>
            <a href="/cart/" class="pb-nav-cta">Cart <span data-cart-count class="ml-1">0</span></a>
            ${user
              ? `<a href="/account/">${escapeHtml(user.displayName)}</a>`
              : `<a href="/login/">Sign in</a>`}
          </nav>
        </div>
      </div>`
  }

  if (footer) {
    footer.innerHTML = `
      <div class="pb-footer"><div class="pb-footer-inner">
        <p>© 2026 PetitBakery · a Cloudflare Pages + Hono learning app.</p>
        <p>Dummy checkout only — no payment information is collected.</p>
      </div></div>`
  }

  mountTour()
  mountFloatCart()
  document.querySelectorAll('[data-open-tour]').forEach((button) => button.addEventListener('click', (event) => {
    if (button.tagName === 'A' && button.getAttribute('href') === '/') event.preventDefault()
    openTour()
  }))

  updateCartBadge()
}

const TOUR_STEPS = [
  ['Start in the storefront', 'HTML gives you the semantic page and CSS gives it the PetitBakery personality. Begin by changing the hero, categories, and product cards.'],
  ['Follow the browser state', 'The cart is localStorage on purpose. Add a treat, open Cart, and inspect the browser data before a request reaches the backend.'],
  ['Trace the trusted boundary', 'The Worker exposes Hono routes and D1 stores products, users, and orders. Checkout sends IDs and quantities; the server recalculates totals.'],
  ['Ship it to Cloudflare', 'Pages serves frontend/, Workers runs the API, and D1 holds data. Public config is safe to expose; secrets stay in .env locally or GitHub Secrets.']
]

function mountTour() {
  if (document.getElementById('pb-tour-backdrop')) return
  const backdrop = document.createElement('div')
  backdrop.id = 'pb-tour-backdrop'
  backdrop.className = 'pb-tour-backdrop'
  backdrop.hidden = true
  backdrop.innerHTML = `<section class="pb-tour" role="dialog" aria-modal="true" aria-labelledby="pb-tour-title"><div class="pb-tour-progress" id="pb-tour-progress"></div><h2 id="pb-tour-title" class="pb-display"></h2><p id="pb-tour-copy"></p><div class="pb-tour-actions"><button class="pb-button alt" type="button" data-tour-close>Close</button><button class="pb-button" type="button" data-tour-next>Next</button></div></section>`
  document.body.appendChild(backdrop)
  let step = 0
  const renderStep = () => {
    const [title, copy] = TOUR_STEPS[step]
    backdrop.querySelector('#pb-tour-progress').textContent = `Lesson map · ${step + 1} / ${TOUR_STEPS.length}`
    backdrop.querySelector('#pb-tour-title').textContent = title
    backdrop.querySelector('#pb-tour-copy').textContent = copy
    backdrop.querySelector('[data-tour-next]').textContent = step === TOUR_STEPS.length - 1 ? 'Done' : 'Next'
  }
  backdrop.querySelector('[data-tour-close]').addEventListener('click', () => { backdrop.hidden = true })
  backdrop.querySelector('[data-tour-next]').addEventListener('click', () => {
    if (step === TOUR_STEPS.length - 1) backdrop.hidden = true
    else { step += 1; renderStep() }
  })
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.hidden = true })
  backdrop.open = () => { step = 0; renderStep(); backdrop.hidden = false }
}

function openTour() {
  document.getElementById('pb-tour-backdrop')?.open()
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]))
}

window.addEventListener('nimble:cart-changed', updateCartBadge)
