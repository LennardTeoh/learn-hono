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
          <li><a href="/account/" class="font-bold text-slate-900">My Orders</a></li>
          <li><a href="/account/details/" class="text-slate-500 hover:text-slate-900 transition-colors">Account Details</a></li>
          <li><a href="/account/saved/" class="text-slate-500 hover:text-slate-900 transition-colors">Saved Items</a></li>
          <li><a href="/account/security/" class="text-slate-500 hover:text-slate-900 transition-colors">Security Settings</a></li>
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
      
      // Use the actual database status for shipped items, otherwise use CONFIRMED/READY
      const dbStatus = (order.status || 'confirmed').toUpperCase();
      const statusText = isPickup ? 'READY FOR PICKUP' : dbStatus;
      
      // Styling
      const statusClass = isPickup 
          ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]' 
          : 'bg-white text-slate-600 border border-slate-300';
          
      const btnText = isPickup ? 'VIEW QR PASS' : 'INVOICE';
      
      // 1. The Main Order Row
      const mainRow = `
        <tr class="hover:bg-slate-50 transition-colors ${isPickup ? 'border-b border-slate-200' : ''}">
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

      // 2. The Premium Tracking Timeline (Only renders for Home Delivery)
      let trackerRow = '';
      if (!isPickup) {
        trackerRow = `
          <tr class="border-b border-slate-200 bg-slate-50/50">
            <td colspan="6" class="px-2 py-8">
              ${renderShippingTracker(order.status, order.tracking_number)}
            </td>
          </tr>
        `;
      }

      return mainRow + trackerRow;
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

// --- HELPER FUNCTION: PREMIUM SHIPPING TRACKER ---
function renderShippingTracker(status, trackingNumber) {
  const safeStatus = status || 'confirmed';
  const statuses = ['confirmed', 'processing', 'shipped', 'delivered'];
  const currentIndex = statuses.indexOf(safeStatus) !== -1 ? statuses.indexOf(safeStatus) : 0;

  const stepsHTML = statuses.map((stepName, index) => {
    const isActive = index <= currentIndex;
    const circleClass = isActive 
      ? "bg-slate-900 border-slate-900 text-white" 
      : "bg-slate-50 border-slate-300 text-slate-300";
    const textClass = isActive ? "text-slate-900 font-semibold" : "text-slate-400";
    
    return `
      <div class="flex flex-col items-center relative z-10 px-2 sm:px-4" style="background: inherit;">
        <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${circleClass} transition-colors duration-300">
          ${index + 1}
        </div>
        <p class="text-[9px] uppercase tracking-widest mt-3 ${textClass}">${stepName}</p>
      </div>
    `;
  }).join('');

  // Strict Premium Shipping Carrier Detection
  let trackingHTML = `<p class="text-sm font-serif mt-8 text-center text-slate-400 italic">Tracking details will be assigned once your items are dispatched.</p>`;
  
  if (trackingNumber) {
    let carrier = 'DHL Express';
    let trackUrl = `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`;
    
    // Automatically detect FedEx (12 digits) or UPS (starts with 1Z)
    if (trackingNumber.startsWith('1Z')) {
        carrier = 'UPS Worldwide Express';
        trackUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
    } else if (trackingNumber.length === 12 && !isNaN(trackingNumber)) {
        carrier = 'FedEx Priority';
        trackUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    }

    trackingHTML = `
      <div class="mt-8 text-center bg-white py-4 px-6 border border-slate-200 max-w-sm mx-auto shadow-sm">
        <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Dispatched via ${carrier}</p>
        <p class="text-sm font-serif text-slate-700">
          Waybill: 
          <a href="${trackUrl}" target="_blank" class="font-bold text-slate-900 hover:text-slate-600 transition-colors underline underline-offset-4 ml-1">
            ${trackingNumber}
          </a>
        </p>
      </div>
    `;
  }

  return `
    <div class="w-full max-w-2xl mx-auto py-2">
      <h4 class="text-[9px] uppercase tracking-widest text-slate-400 mb-6 text-center">Logistics Journey</h4>
      <div class="relative flex justify-between items-start w-full mx-auto" style="background: inherit;">
        <div class="absolute top-4 left-[10%] w-[80%] h-[2px] bg-slate-200 z-0"></div>
        ${stepsHTML}
      </div>
      ${trackingHTML}
    </div>
  `;
}

init().catch(console.error)