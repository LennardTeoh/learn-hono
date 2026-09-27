import { api, getCurrentUser } from './api.js'
import { money, renderShell, escapeHtml } from './ui.js'

async function init() {
  await renderShell()
  
  const user = await getCurrentUser()
  if (!user) {
    location.href = '/login/?next=/account/'
    return
  }

  const root = document.getElementById('account-root')
  root.innerHTML = '<p class="text-slate-500 font-serif col-span-full">Loading account details...</p>'

  try {
    const { orders } = await api('/api/orders')
    
    // Build Sidebar
    const firstName = user.name ? user.name.split(' ')[0] : 'Client';
    
    const sidebar = `
      <aside class="pr-8">
        <h2 class="text-3xl font-serif text-slate-900 mb-8">Welcome, ${escapeHtml(firstName)}</h2>
        <ul class="space-y-5 text-sm">
          <li><a href="#" class="font-bold text-slate-900">My Orders</a></li>
          <li><a href="#" class="text-slate-500 hover:text-slate-900 transition-colors">Account Details</a></li>
          <li><a href="#" class="text-slate-500 hover:text-slate-900 transition-colors">Saved Items</a></li>
          <li><a href="#" class="text-slate-500 hover:text-slate-900 transition-colors">Security Settings</a></li>
        </ul>
      </aside>
    `;

    // Build Orders Table
    const rows = orders && orders.length ? orders.map(order => {
      
      let dateStr = 'Pending';
      let rawDate = order.created_at || order.createdAt || order.date || order.timestamp;
      
      if (rawDate) {
        if (String(rawDate).length === 10 && !isNaN(Number(rawDate))) {
          rawDate = Number(rawDate) * 1000;
        }
        
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }

      let amount = parseInt(order.total_cents !== undefined ? order.total_cents : (order.totalCents || order.totalAmount || order.total || 0));

      const idShort = order.id ? order.id.split('-')[0].substring(0, 5).toUpperCase() : 'N/A';
      
      // BULLETPROOF CHECK: Check database fulfillment fields AND local storage bridge
      const localPickupKey = `lumiere_pickup_${order.id}`;
      const isPickup = order.fulfillment === 'pickup' || 
                       order.deliveryMethod === 'pickup' || 
                       order.isPickup === true || 
                       order.isPickup === 'true' || 
                       localStorage.getItem(localPickupKey) === 'true';

      const fulfillment = isPickup ? 'In-Store Collection' : 'Home Delivery';
      const statusText = isPickup ? 'READY FOR PICKUP' : 'CONFIRMED';
      
      // Styling
      const statusClass = isPickup 
          ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]' 
          : 'bg-slate-50 text-slate-500 border border-slate-200';
          
      const btnText = isPickup ? 'VIEW QR PASS' : 'INVOICE';
      
      return `
        <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
          <td class="py-5 px-2 text-sm font-medium text-slate-900">${idShort}</td>
          <td class="py-5 px-2 text-sm text-slate-500">${dateStr}</td>
          <td class="py-5 px-2 text-sm text-slate-900">${money(amount)}</td>
          <td class="py-5 px-2 text-sm text-slate-500">${fulfillment}</td>
          <td class="py-5 px-2 text-sm">
            <span class="inline-block px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase ${statusClass}">
              ${statusText}
            </span>
          </td>
          <td class="py-5 px-2 text-sm text-right">
            <a href="/receipt/?id=${encodeURIComponent(order.id)}" class="lumiere-btn-outline !py-2 !px-4 !text-[9px] whitespace-nowrap">${btnText}</a>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="6" class="py-16 text-center text-slate-500 font-serif">No orders found.</td></tr>`;

    const mainContent = `
      <div class="bg-white border border-slate-200 p-8 sm:p-12 shadow-sm w-full">
        <h2 class="text-3xl font-serif text-slate-900 mb-10">Order History</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="pb-4 px-2 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Order #</th>
                <th class="pb-4 px-2 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Date</th>
                <th class="pb-4 px-2 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Total</th>
                <th class="pb-4 px-2 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Fulfillment</th>
                <th class="pb-4 px-2 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Status</th>
                <th class="pb-4 px-2 text-[10px] font-bold tracking-widest text-slate-900 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    root.innerHTML = sidebar + mainContent;

  } catch (error) {
    root.innerHTML = `<div class="col-span-full border border-red-200 bg-red-50 p-6 text-red-600">${escapeHtml(error.message)}</div>`
  }
}

init().catch(console.error)