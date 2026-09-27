import { api, getCurrentUser } from './api.js'
import { money, renderShell, escapeHtml } from './ui.js'

const API_URL = 'https://lumiere-api.p22014454.workers.dev';

async function init() {
  await renderShell();
  
  // Override the standard customer header with an exclusive Admin Navigation bar
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
      <div class="w-full flex items-center justify-between px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div class="flex items-center gap-4">
          <a href="/admin/" class="text-2xl font-serif text-slate-900 tracking-widest uppercase">LUMIÈRE</a>
          <span class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase border-l border-slate-300 pl-4 mt-1">Command Center</span>
        </div>
        <nav class="flex gap-8 text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase items-center">
          <a href="/" class="hover:text-slate-500 transition-colors">View Storefront</a>
          <button id="admin-logout" class="hover:text-slate-500 transition-colors uppercase tracking-[0.2em] font-bold cursor-pointer">Logout</button>
        </nav>
      </div>
    `;

    document.getElementById('admin-logout')?.addEventListener('click', async () => {
      try { await api('/api/auth/sign-out', { method: 'POST' }); } catch (e) {}
      window.location.replace('/login/');
    });
  }

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
    window.location.hash = 'logistics'; // Save state to URL
    viewLogistics.classList.remove('hidden');
    viewCatalog.classList.add('hidden');
    tabLogistics.classList.add(...activeTabClasses);
    tabLogistics.classList.remove(...inactiveTabClasses);
    tabCatalog.classList.remove(...activeTabClasses);
    tabCatalog.classList.add(...inactiveTabClasses);
  });

  tabCatalog.addEventListener('click', () => {
    window.location.hash = 'catalog'; // Save state to URL
    viewCatalog.classList.remove('hidden');
    viewLogistics.classList.add('hidden');
    tabCatalog.classList.add(...activeTabClasses);
    tabCatalog.classList.remove(...inactiveTabClasses);
    tabLogistics.classList.remove(...activeTabClasses);
    tabLogistics.classList.add(...inactiveTabClasses);
  });

  // Memory Feature: Check URL on load and automatically open the Catalog tab if needed
  if (window.location.hash === '#catalog') {
    tabCatalog.click();
  }
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
          <button class="edit-product-btn border border-slate-300 text-slate-500 px-4 py-2 text-[9px] font-bold tracking-widest uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors mr-2" 
                  data-product='${JSON.stringify(product)}'>Edit</button>
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

  // Attach safe click listeners to all Edit buttons
  root.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = JSON.parse(btn.getAttribute('data-product'));
      window.openProductModal(product.id, product.name, product.price_cents, product.stock, product.active ? 1 : 0, product.image_url || '');
    });
  });
}

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

// --- LOGISTICS MODAL LOGIC ---
const shippingModal = document.getElementById('shipping-modal');
const shippingForm = document.getElementById('shipping-form');

window.openUpdateModal = (orderId, currentStatus, currentTracking) => {
  document.getElementById('modal-order-id').value = orderId;
  document.getElementById('modal-status').value = currentStatus;
  document.getElementById('modal-tracking').value = currentTracking;
  shippingModal.classList.remove('hidden');
};
document.getElementById('close-modal-btn')?.addEventListener('click', () => shippingModal.classList.add('hidden'));
shippingModal?.addEventListener('click', (e) => { if (e.target === shippingModal) shippingModal.classList.add('hidden'); });

shippingForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = shippingForm.querySelector('button[type="submit"]');
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


// --- PRODUCT MODAL LOGIC ---
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const addProductBtn = document.getElementById('add-product-btn');

window.openProductModal = (id, name, priceCents, stock, active, imageUrl) => {
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('modal-product-id').value = id;
  document.getElementById('modal-product-name').value = name;
  document.getElementById('modal-product-price').value = (priceCents / 100).toFixed(2);
  document.getElementById('modal-product-stock').value = stock;
  document.getElementById('modal-product-image').value = imageUrl;
  document.getElementById('modal-product-status').value = active;
  productModal.classList.remove('hidden');
};

addProductBtn?.addEventListener('click', () => {
  document.getElementById('product-modal-title').textContent = 'New Listing';
  document.getElementById('modal-product-id').value = '';
  document.getElementById('modal-product-name').value = '';
  document.getElementById('modal-product-price').value = '';
  document.getElementById('modal-product-stock').value = '1';
  document.getElementById('modal-product-image').value = '';
  document.getElementById('modal-product-status').value = '1';
  productModal.classList.remove('hidden');
});

document.getElementById('close-product-btn')?.addEventListener('click', () => productModal.classList.add('hidden'));
productModal?.addEventListener('click', (e) => { if (e.target === productModal) productModal.classList.add('hidden'); });

productForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = productForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'SAVING...';
  submitBtn.disabled = true;

  const id = document.getElementById('modal-product-id').value;
  const method = id ? 'PATCH' : 'POST';
  const endpoint = id ? `${API_URL}/api/products/${id}` : `${API_URL}/api/products`;

  try {
    const response = await fetch(endpoint, {
      method: method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: document.getElementById('modal-product-name').value.trim(),
        price_cents: Math.round(parseFloat(document.getElementById('modal-product-price').value) * 100),
        stock: parseInt(document.getElementById('modal-product-stock').value, 10),
        image_url: document.getElementById('modal-product-image').value.trim(),
        active: parseInt(document.getElementById('modal-product-status').value, 10)
      })
    });
    
    if (!response.ok) throw new Error('Failed to save product.');
    
    // THE FIX: Explicitly lock the URL to the catalog tab before reloading
    window.location.hash = 'catalog';
    window.location.reload();
    
  } catch (error) {
    alert(error.message);
    submitBtn.textContent = 'SAVE PRODUCT';
    submitBtn.disabled = false;
  }
});

init().catch(console.error);