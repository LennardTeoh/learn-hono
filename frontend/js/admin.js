import { api, getCurrentUser } from './api.js'
import { money, renderShell, escapeHtml } from './ui.js'

// Ensure this matches your live Worker
const API_URL = 'https://lumiere-api.p22014454.workers.dev';

async function init() {
  await renderShell();
  const root = document.getElementById('admin-root');
  
  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/admin/';
    return;
  }

  root.innerHTML = '<p class="text-slate-500 font-serif text-center py-12">Loading master order list...</p>';

  try {
    const { orders } = await api('/api/orders/all');
    renderAdminTable(root, orders);
  } catch (error) {
    root.innerHTML = `<div class="border border-red-200 bg-red-50 p-6 text-red-600">${escapeHtml(error.message)}</div>`;
  }
}

function renderAdminTable(root, orders) {
  if (!orders || orders.length === 0) {
    root.innerHTML = `<p class="text-center py-12 text-slate-500 font-serif">No orders in the system.</p>`;
    return;
  }

  const rows = orders.map(order => {
    let dateStr = new Date(order.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const idShort = order.id.split('-')[0].substring(0, 8).toUpperCase();
    const amount = money(order.total_cents);
    const statusText = (order.status || 'confirmed').toUpperCase();
    const tracking = order.tracking_number || '<span class="text-slate-300 italic">Unassigned</span>';

    return `
      <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors bg-white">
        <td class="py-4 px-4 text-sm font-medium text-slate-900">#${idShort}</td>
        <td class="py-4 px-4 text-sm text-slate-500">${dateStr}</td>
        <td class="py-4 px-4 text-sm text-slate-900">${escapeHtml(order.shipping_name)}</td>
        <td class="py-4 px-4 text-sm text-slate-900">${amount}</td>
        <td class="py-4 px-4 text-sm">
          <span class="inline-block px-2 py-1 text-[9px] font-bold tracking-widest uppercase bg-slate-100 text-slate-600">
            ${statusText}
          </span>
        </td>
        <td class="py-4 px-4 text-sm font-serif text-slate-700">${tracking}</td>
        <td class="py-4 px-4 text-right">
          <button onclick="window.openUpdateModal('${order.id}', '${order.status || 'confirmed'}', '${order.tracking_number || ''}')" 
                  class="border border-slate-900 text-slate-900 px-4 py-2 text-[9px] font-bold tracking-widest uppercase hover:bg-slate-900 hover:text-white transition-colors">
            Update
          </button>
        </td>
      </tr>
    `;
  }).join('');

  root.innerHTML = `
    <div class="overflow-x-auto shadow-sm border border-slate-200">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-200">
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Order ID</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Date</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Customer</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Revenue</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Status</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Tracking</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// --- MODAL LOGIC ---
const modal = document.getElementById('shipping-modal');
const form = document.getElementById('shipping-form');
const closeBtn = document.getElementById('close-modal-btn');

window.openUpdateModal = (orderId, currentStatus, currentTracking) => {
  document.getElementById('modal-order-id').value = orderId;
  document.getElementById('modal-status').value = currentStatus;
  document.getElementById('modal-tracking').value = currentTracking;
  modal.classList.remove('hidden');
};

const closeModal = () => modal.classList.add('hidden');
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const orderId = document.getElementById('modal-order-id').value;
  const status = document.getElementById('modal-status').value;
  const trackingNumber = document.getElementById('modal-tracking').value.trim();
  const submitBtn = form.querySelector('button[type="submit"]');
  
  submitBtn.textContent = 'UPDATING...';
  submitBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}/shipping`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: status, 
        tracking_number: trackingNumber || null 
      })
    });

    if (!response.ok) throw new Error('Failed to update tracking');
    
    // Refresh the page to show the updated table
    window.location.reload();
  } catch (error) {
    alert(error.message);
    submitBtn.textContent = 'COMMIT UPDATE';
    submitBtn.disabled = false;
  }
});

init().catch(console.error);