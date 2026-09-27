import { api, getCurrentUser } from './api.js'
import { money, escapeHtml } from './ui.js'

const API_URL = 'https://lumiere-api.p22014454.workers.dev';

async function init() {
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
      <div class="w-full flex items-center justify-between px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-slate-200 bg-white">
        <div class="flex items-center gap-4">
          <a href="/admin/" class="text-2xl font-serif text-slate-900 tracking-widest uppercase">LUMIÈRE</a>
          <span class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase border-l border-slate-300 pl-4 mt-1">Order CRM</span>
        </div>
      </div>
    `;
  }

  const user = await getCurrentUser();
  if (!user) return window.location.replace('/login/?next=/admin/');

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const root = document.getElementById('order-root');

  if (!orderId) {
    root.innerHTML = `<p class="text-red-600 p-6 bg-red-50 border border-red-200">No Order ID provided.</p>`;
    return;
  }

  try {
    const [orderRes, productsRes] = await Promise.all([
      api(`/api/orders/${orderId}`),
      api('/api/products').catch(() => ({ products: [] }))
    ]);

    const order = orderRes.order;
    const items = orderRes.items || [];
    const allProducts = productsRes.products || [];

    if (!order) throw new Error('Order not found in database.');
    
    renderOrderInterface(root, order, items, allProducts);
    attachFormLogic(order.id);
  } catch (error) {
    root.innerHTML = `<div class="border border-red-200 bg-red-50 p-6 text-red-600">${escapeHtml(error.message)}</div>`;
  }
}

function renderOrderInterface(root, order, items, allProducts) {
  const dateStr = new Date(order.created_at * 1000).toLocaleString('en-US', { 
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  
  const statusColors = {
    'confirmed': 'bg-amber-100 text-amber-800',
    'processing': 'bg-blue-100 text-blue-800',
    'shipped': 'bg-indigo-100 text-indigo-800',
    'delivered': 'bg-green-100 text-green-800'
  };
  const badgeColor = statusColors[order.status] || 'bg-slate-100 text-slate-800';

  let itemsHtml = '';
  if (items.length > 0) {
    itemsHtml = items.map(item => {
      const matchingProduct = allProducts.find(p => p.id === item.product_id);
      const img = matchingProduct?.image_url || matchingProduct?.img || '';
      const name = item.product_name || 'Luxury Item';
      const qty = item.quantity || 1;
      const price = item.unit_price_cents || order.total_cents;

      return `
        <div class="flex justify-between items-center py-4 border-b border-slate-100 last:border-0">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
              ${img ? `<img src="${escapeHtml(img)}" alt="" class="w-full h-full object-cover">` : `<span class="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Item</span>`}
            </div>
            <div>
              <p class="font-medium text-slate-900">${escapeHtml(name)}</p>
              <p class="text-sm text-slate-500">Qty: ${qty}</p>
            </div>
          </div>
          <p class="font-medium text-slate-900">${money(price)}</p>
        </div>
      `;
    }).join('');
  } else {
    itemsHtml = `
      <div class="flex justify-between items-center py-4 border-b border-slate-100">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">
            Order
          </div>
          <div>
            <p class="font-medium text-slate-900">LUMIÈRE Curated Collection Order</p>
            <p class="text-sm text-slate-500">Verified Secure Checkout</p>
          </div>
        </div>
        <p class="font-medium text-slate-900">${money(order.total_cents)}</p>
      </div>
    `;
  }

  root.innerHTML = `
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-serif text-slate-900 mb-2">Order #${order.id.split('-')[0].toUpperCase()}</h1>
        <p class="text-sm text-slate-500 font-serif">${dateStr}</p>
      </div>
      <span class="px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${badgeColor}">${order.status || 'Confirmed'}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Left Column: Data -->
      <div class="lg:col-span-8 space-y-8">
        <div class="bg-white border border-slate-200 p-8 shadow-sm">
          <h2 class="text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-6 border-b border-slate-100 pb-4">Customer & Logistics</h2>
          <div class="grid grid-cols-2 gap-6 font-serif">
            <div>
              <p class="text-xs text-slate-400 uppercase tracking-widest mb-1 font-sans font-bold">Contact Name</p>
              <p class="text-slate-900">${escapeHtml(order.shipping_name)}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 uppercase tracking-widest mb-1 font-sans font-bold">Shipping Details</p>
              <p class="text-slate-900">${escapeHtml(order.address1 || 'Standard Delivery')}</p>
            </div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 p-8 shadow-sm">
          <h2 class="text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-6 border-b border-slate-100 pb-4">Order Manifest</h2>
          ${itemsHtml}
        </div>
      </div>

      <!-- Right Column: Actions -->
      <div class="lg:col-span-4 space-y-8">
        <div class="bg-slate-900 p-8 shadow-sm text-white">
          <h2 class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-6 border-b border-slate-800 pb-4">Fulfillment Action</h2>
          
          <form id="order-action-form" class="space-y-6">
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-slate-300 mb-2 font-bold">Update Status</label>
              <select id="action-status" class="w-full border-b border-slate-700 bg-slate-900 py-2 text-sm focus:outline-none focus:border-white font-serif text-white">
                <option value="confirmed">Confirmed (Pending)</option>
                <option value="processing">Processing (Packing)</option>
                <option value="shipped">Shipped (Dispatched)</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            
            <div>
              <div class="flex justify-between items-end mb-2">
                <label class="block text-[10px] uppercase tracking-widest text-slate-300 font-bold">Tracking / Waybill</label>
                <button type="button" id="generate-tracking-btn" class="text-[9px] font-bold tracking-widest uppercase text-amber-500 hover:text-amber-400 transition-colors cursor-pointer">Generate</button>
              </div>
              <input type="text" id="action-tracking" placeholder="Enter tracking..." value="${escapeHtml(order.tracking_number || '')}" class="w-full border-b border-slate-700 bg-transparent py-2 text-sm focus:outline-none focus:border-white font-serif text-white placeholder-slate-600">
            </div>
            
            <button type="submit" class="w-full bg-white text-slate-900 text-[10px] uppercase tracking-widest font-bold py-4 hover:bg-slate-200 transition-colors mt-4">
              Commit Update
            </button>
          </form>
        </div>

        <div class="bg-white border border-slate-200 p-8 shadow-sm font-serif">
          <h2 class="text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-6 border-b border-slate-100 pb-4 font-sans">Financials</h2>
          <div class="flex justify-between text-sm mb-3 text-slate-600"><p>Subtotal</p><p>${money(order.total_cents)}</p></div>
          <div class="flex justify-between text-sm mb-4 text-slate-600"><p>Shipping</p><p>RM 0.00</p></div>
          <div class="flex justify-between text-lg font-medium text-slate-900 pt-4 border-t border-slate-100"><p>Total Revenue</p><p>${money(order.total_cents)}</p></div>
        </div>
      </div>

    </div>
  `;

  document.getElementById('action-status').value = order.status || 'confirmed';
}

function attachFormLogic(orderId) {
  document.getElementById('generate-tracking-btn').addEventListener('click', () => {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    document.getElementById('action-tracking').value = `LUM-${randomCode}`;
    document.getElementById('action-status').value = 'shipped';
  });

  const form = document.getElementById('order-action-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'UPDATING...';
    btn.disabled = true;

    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/shipping`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: document.getElementById('action-status').value, 
          tracking_number: document.getElementById('action-tracking').value.trim() || null 
        })
      });
      
      if (!response.ok) throw new Error('Failed to update tracking');
      window.location.reload();
    } catch (error) {
      alert(error.message);
      btn.textContent = 'COMMIT UPDATE';
      btn.disabled = false;
    }
  });
}

init().catch(console.error);