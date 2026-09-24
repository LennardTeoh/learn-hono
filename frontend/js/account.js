import { api, getCurrentUser } from './api.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

async function init() {
  await renderShell()
  const user = await getCurrentUser()
  
  if (!user) {
    location.href = '/login/?next=/account/'
    return
  }

  document.getElementById('account-name').textContent = user.name
  document.getElementById('account-email').textContent = user.email

  try {
    const { orders } = await api('/api/orders')
    
    // The critical change is the href="/receipt/?id=${escapeHtml(order.id)}" below
    document.getElementById('orders').innerHTML = orders.length
      ? orders.map((order) => `
        <a href="/receipt/?id=${escapeHtml(order.id)}" class="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-400 transition-colors">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-mono text-xs text-slate-400">${escapeHtml(order.id)}</p>
              <p class="mt-1 font-bold text-slate-900">Order · ${new Date(order.created_at * 1000).toLocaleDateString()}</p>
            </div>
            <div class="text-right">
              <p class="font-black text-slate-900">${money(order.total_cents)}</p>
              <p class="text-xs uppercase tracking-wide text-emerald-600">${escapeHtml(order.status)}</p>
            </div>
          </div>
        </a>`).join('')
      : '<p class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-500 text-center">No orders yet.</p>'
      
  } catch (error) {
    document.getElementById('orders').innerHTML = '<p class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 text-center">Failed to load orders.</p>'
    console.error(error);
  }

  document.getElementById('logout').addEventListener('click', async () => {
    try {
      await api('/api/auth/sign-out', { method: 'POST', body: '{}' })
    } catch (error) {
      toast(error.message, 'error')
      return
    }
    location.href = '/'
  })
}

init().catch((error) => toast(error.message, 'error'))