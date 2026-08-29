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
          <a href="/" class="pb-brand"><span class="pb-mark" aria-hidden="true"><img src="/assets/images/petitbakery-logo.png" alt=""></span><span>PetitBakery</span></a>
          <nav class="pb-nav-links" aria-label="Primary">
            <a href="/products/">Shop treats</a>
            <a href="/#faq-title">FAQ</a>
            ${user
              ? `<a href="/account/">${escapeHtml(user.displayName)}</a>`
              : `<a href="/login/" class="pb-nav-login">Sign in</a>`}
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

  mountFloatCart()

  updateCartBadge()
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]))
}

window.addEventListener('nimble:cart-changed', updateCartBadge)
