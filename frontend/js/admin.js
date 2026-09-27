import { api, getCurrentUser } from './api.js'
import { money, renderShell, escapeHtml } from './ui.js'

const API_URL = 'https://lumiere-api.p22014454.workers.dev';

async function init() {
  await renderShell();
  const root = document.getElementById('admin-root');
  
  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/admin/';
    return;
  }

  setupTabs();
  
  // Load Logistics
  root.innerHTML = '<p class="text-slate-500 font-serif text-center py-12">Loading master order list...</p>';
  try {
    const { orders } = await api('/api/orders/all');
    renderMetrics(orders);
    renderAdminTable(root, orders);
  } catch (error) {
    root.innerHTML = `<div class="border border-red-200 bg-red-50 p-6 text-red-600">${escapeHtml(error.message)}</div>`;
  }

  // Load Catalog
  const catalogRoot = document.getElementById('catalog-root');
  catalogRoot.innerHTML = '<p class="text-slate-500 font-serif text-center py-12">Loading inventory...</p>';
  try {
    const { products } = await api('/api/products');
    renderCatalogTable(catalogRoot, products);
  } catch (error) {
    catalogRoot.innerHTML = `<div class="border border-red-200 bg-red-50 p-6 text-red-600">Failed to load catalog.</div>`;
  }
}

function setupTabs() {
  const tabLogistics = document.getElementById('tab-logistics');
  const tabCatalog = document.getElementById('tab-catalog');
  const viewLogistics = document.getElementById('view-logistics');
  const viewCatalog = document.getElementById('view-catalog');

  const activeTabClasses = ['border-slate-900', 'text-slate-900'];
  const inactiveTabClasses = ['border-transparent', 'text-slate-500', 'hover:border-slate-300', 'hover:text-slate-700'];

  tabLogistics.addEventListener('click', () => {
    viewLogistics.classList.remove('hidden');
    viewCatalog.classList.add('hidden');
    tabLogistics.classList.add(...activeTabClasses);
    tabLogistics.classList.remove(...inactiveTabClasses);
    tabCatalog.classList.remove(...activeTabClasses);
    tabCatalog.classList.add(...inactiveTabClasses);
  });

  tabCatalog.addEventListener('click', () => {
    viewCatalog.classList.remove('hidden');
    viewLogistics.classList.add('hidden');
    tabCatalog.classList.add(...activeTabClasses);
    tabCatalog.classList.remove(...inactiveTabClasses);
    tabLogistics.classList.remove(...activeTabClasses);
    tabLogistics.classList.add(...inactiveTabClasses);
  });
}

function renderCatalogTable(root, products) {
  if (!products || products.length === 0) {
    root.innerHTML = `<p class="text-center py-12 text-slate-500 font-serif">No products found in the database.</p>`;
    return;
  }

  const rows = products.map(product => {
    const amount = money(product.price_cents);
    const status = product.active ? 
      '<span class="text-green-600 bg-green-50 px-2 py-1 text-[9px] font-bold tracking-widest uppercase">Active</span>' : 
      '<span class="text-slate-500 bg-slate-100 px-2 py-1 text-[9px] font-bold tracking-widest uppercase">Hidden</span>';

    return `
      <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors bg-white">
        <td class="py-4 px-4 text-sm font-medium text-slate-900">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-slate-100 object-cover overflow-hidden border border-slate-200">
              <img src="${product.image_url || ''}" alt="Product" class="w-full h-full object-cover">
            </div>
            ${escapeHtml(product.name)}
          </div>
        </td>
        <td class="py-4 px-4 text-sm text-slate-900">${amount}</td>
        <td class="py-4 px-4 text-sm text-slate-900">${product.stock} units</td>
        <td class="py-4 px-4">${status}</td>
        <td class="py-4 px-4 text-right">
          <button class="border border-slate-300 text-slate-500 px-4 py-2 text-[9px] font-bold tracking-widest uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors mr-2">Edit</button>
        </td>
      </tr>
    `;
  }).join('');

  root.innerHTML = `
    <div class="overflow-x-auto shadow-sm border border-slate-200">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-200">
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Item Name</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Price</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Stock Count</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Status</th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// --- LOGISTICS TABLE LOGIC ---
function renderMetrics(orders) {
  if (!orders) return;
  const totalOrders = orders.length;
  const totalRevenueCents = orders.reduce((sum, order) => sum + order.total_cents, 0);
  const pendingOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'processing').length;
  
  const metricsRoot = document.getElementById('admin-metrics');
  if (metricsRoot) {
    metricsRoot.innerHTML = `
      <div class="bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
        <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Gross Revenue</p>
        <h3 class="text-3xl font-serif text-slate-900">${money(totalRevenueCents)}</h3>
      </div>
      <div class="bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
        <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Total Orders</p>
        <h3 class="text-3xl font-serif text-slate-900">${totalOrders}</h3>
      </div>
      <div class="bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
        <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Action Required</p>
        <h3 class="text-3xl font-serif ${pendingOrders > 0 ? 'text-amber-600' : 'text-slate-900'}">${pendingOrders} ${pendingOrders === 1 ? 'Shipment' : 'Shipments'}</h3>
      </div>
    `;
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
    return `
      <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors bg-white">
        <td class="py-4 px-4 text-sm font-medium text-slate-900">#${idShort}</td>
        <td class="py-4 px-4 text-sm text-slate-500">${dateStr}</td>
        <td class="py-4 px-4 text-sm text-slate-900">${escapeHtml(order.shipping_name)}</td>
        <td class="py-4 px-4 text-sm text-slate-900">${money(order.total_cents)}</td>
        <td class="py-4 px-4 text-sm"><span class="inline-block px-2 py-1 text-[9px] font-bold tracking-widest uppercase bg-slate-100 text-slate-600">${(order.status || 'confirmed').toUpperCase()}</span></td>
        <td class="py-4 px-4 text-sm font-serif text-slate-700">${order.tracking_number || '<span class="text-slate-300 italic">Unassigned</span>'}</td>
        <td class="py-4 px-4 text-right">
          <button onclick="window.openUpdateModal('${order.id}', '${order.status || 'confirmed'}', '${order.tracking_number || ''}')" class="border border-slate-900 text-slate-900 px-4 py-2 text-[9px] font-bold tracking-widest uppercase hover:bg-slate-900 hover:text-white transition-colors">Update</button>
        </td>
      </tr>
    `;
  }).join('');
  
  root.innerHTML = `<div class="overflow-x-auto shadow-sm border border-slate-200"><table class="w-full text-left border-collapse min-w-[900px]"><thead><tr class="bg-slate-100 border-b border-slate-200"><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Order ID</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Date</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Customer</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Revenue</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Status</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Tracking</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase text-right">Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'UPDATING...';
  submitBtn.disabled = true;
  try {
    const response = await fetch(`${API_URL}/api/orders/${document.getElementById('modal-order-id').value}/shipping`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: document.getElementById('modal-status').value, tracking_number: document.getElementById('modal-tracking').value.trim() || null })
    });
    if (!response.ok) throw new Error('Failed to update tracking');
    window.location.reload();
  } catch (error) {
    alert(error.message);
    submitBtn.textContent = 'COMMIT UPDATE';
    submitBtn.disabled = false;
  }
});

init().catch(console.error);