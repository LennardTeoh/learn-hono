import { cartCount } from './cart-store.js'
import { getCurrentUser, api } from './api.js'

// Inject Global Fonts & Custom CSS for the new aesthetic
const styleInjection = document.createElement('style');
styleInjection.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap');
  body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
  .font-serif { font-family: 'Playfair Display', serif; }
  .lumiere-gold { color: #b8974a; }
  
  .lumiere-btn { background-color: #111827; color: white; border-radius: 0; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.75rem; font-weight: 700; padding: 1rem 1.5rem; transition: background-color 0.2s; border: 1px solid #111827; display: inline-block; text-align: center; cursor: pointer; }
  .lumiere-btn:hover:not(:disabled) { background-color: #000; }
  .lumiere-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .lumiere-btn-outline { background-color: transparent; border: 1px solid #111827; color: #111827; border-radius: 0; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.75rem; font-weight: 700; padding: 1rem 1.5rem; transition: all 0.2s; display: inline-block; text-align: center; cursor: pointer; }
  .lumiere-btn-outline:hover { background-color: #111827; color: white; }
`;
document.head.appendChild(styleInjection);

export function money(cents) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(cents / 100)
}

export function toast(message, type = 'info') {
  let host = document.getElementById('toast-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'toast-host'
    host.className = 'fixed right-4 bottom-4 z-50 space-y-2'
    document.body.appendChild(host)
  }
  const el = document.createElement('div')
  const tone = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-[#b8974a]' : 'bg-slate-900'
  el.className = `toast ${tone} max-w-sm rounded-none px-6 py-4 text-sm font-medium text-white shadow-xl tracking-wide`
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
  } else {
    button.disabled = false
    button.textContent = button.dataset.originalText || button.textContent
  }
}

export function updateCartBadge() {
  const count = cartCount()
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(count)
  })
}

export async function renderShell() {
  const user = await getCurrentUser()
  const header = document.getElementById('site-header')
  const footer = document.getElementById('site-footer')
  
  // Detect if the user is on an authentication page
  const isAuthPage = location.pathname.includes('/login') || 
                     location.pathname.includes('/register') || 
                     location.pathname.includes('/forgot-password');

  if (header) {
    header.className = 'sticky top-0 z-40 bg-white border-b border-slate-200 shrink-0';
    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-24">
          <a href="/" class="text-2xl font-serif font-bold tracking-[0.2em] text-slate-950 uppercase">LUMIÈRE</a>
          <nav class="hidden md:flex gap-8 items-center">
            <a href="/products/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">The Collection</a>
            <a href="/authenticate/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">Authenticate</a>
            <a href="/cart/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">Cart (<span data-cart-count>0</span>)</a>
            ${(user && !isAuthPage)
              ? `<a href="/account/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">Profile</a>
                 <button id="nav-logout" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors bg-transparent border-none p-0 cursor-pointer">Logout</button>` 
              : `<a href="/login/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">Account</a>`}
          </nav>
        </div>
      </div>`

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        logoutBtn.textContent = 'LOGGING OUT...';
        
        try {
          // Force a native fetch with explicit headers and body to satisfy better-auth
          const API_BASE = window.APP_CONFIG?.API_BASE || 'http://localhost:8787';
          const res = await fetch(`${API_BASE}/api/auth/sign-out`, { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({}),
            credentials: 'include' 
          });

          if (!res.ok) {
            console.warn('Server refused logout:', res.status);
          }
        } catch (error) {
          console.error('Network error during logout:', error);
        } finally {
          // Clear local storage arrays
          localStorage.clear();
          sessionStorage.clear();
          
          // Redirect back to home
          window.location.href = '/';
        }
      });
    }
  }

  // Redesigned Official Luxury Footer
  if (footer) {
    footer.className = 'bg-white border-t border-slate-200 py-8 shrink-0';
    footer.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <p class="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">© 2026 LUMIÈRE. All Rights Reserved.</p>
        <div class="flex gap-6 text-[10px] text-slate-400 font-bold tracking-[0.1em] uppercase">
          <a href="/privacy/index.html" class="hover:text-slate-900 transition-colors">Privacy</a>
          <a href="/terms/index.html" class="hover:text-slate-900 transition-colors">Terms</a>
          <a href="/contact/index.html" class="hover:text-slate-900 transition-colors">Contact</a>
        </div>
      </div>`
  }

  updateCartBadge()
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]))
}

window.addEventListener('nimble:cart-changed', updateCartBadge)