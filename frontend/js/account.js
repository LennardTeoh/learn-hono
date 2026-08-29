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

  const { orders } = await api('/api/orders')
  document.getElementById('orders').innerHTML = orders.length
    ? orders.map((order) => `
      <a href="#" class="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-400">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><p class="font-mono text-xs text-slate-400">${escapeHtml(order.id)}</p><p class="mt-1 font-bold">Order · ${new Date(order.created_at * 1000).toLocaleDateString()}</p></div>
          <div class="text-right"><p class="font-black">${money(order.total_cents)}</p><p class="text-xs uppercase tracking-wide text-emerald-600">${escapeHtml(order.status)}</p></div>
        </div>
      </a>`).join('')
    : '<p class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-500">No orders yet.</p>'

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
