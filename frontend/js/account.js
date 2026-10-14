import { api, getCurrentUser } from './api.js';
import { renderShell, escapeHtml, money, toast } from './ui.js';

const orderGroup = (order) => {
  const status = (order.status || 'confirmed').toLowerCase();
  if (status === 'pending_payment') return 'pay';
  if (status === 'shipped' || status === 'ready') return 'receive';
  if (status === 'delivered' || status === 'collected') return 'completed';
  return 'ship';
};

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/';
    return;
  }

  const root = document.getElementById('account-root');
  const firstName = user.name ? user.name.split(' ')[0] : 'Client';

  const sidebar = `
    <aside class="pr-8 lg:border-r lg:border-slate-200 lg:min-h-[60vh]">
      <h2 class="text-3xl font-serif text-slate-900 mb-6 lg:mb-10">Welcome, ${escapeHtml(firstName)}</h2>
      <ul class="space-y-2 lg:space-y-6 text-sm">
        <li><a href="/account/" class="text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">My Orders</a></li>
        <li><a href="/account/details/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Account Details</a></li>
        <li><a href="/account/saved/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Saved Items</a></li>
        <li><a href="/account/security/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Security Settings</a></li>
      </ul>
    </aside>
  `;

  let orders = [];
  let ordersError = null;
  try {
    const res = await api(`/api/orders?t=${Date.now()}`);
    orders = res.orders || res.data || (Array.isArray(res) ? res : []);
  } catch (err) {
    ordersError = err;
  }

  let ordersHtml = '';
  if (ordersError) {
    ordersHtml = `<p class="border border-red-200 bg-red-50 p-6 text-red-700">${escapeHtml(ordersError.message)}</p>`;
  } else if (!orders || orders.length === 0) {
    ordersHtml = `
      <div class="text-center py-20 border border-slate-200 bg-slate-50 mt-8">
         <p class="text-slate-500 font-serif mb-8 text-lg">You have no recent orders.</p>
         <a href="/products/" class="lumiere-btn">Explore Collection</a>
      </div>
    `;
  } else {
    ordersHtml = orders.map(order => {
      const rawId = order.id || order.uuid || 'N/A';
      const displayId = rawId !== 'N/A' ? rawId.split('-')[0].toUpperCase() : 'N/A';
      
      const statusUpper = (order.status || 'CONFIRMED').toUpperCase();
      const pendingPayment = statusUpper === 'PENDING_PAYMENT';
      
      const localPickupKey = `lumiere_pickup_${rawId}`;
      const isPickup = 
          order.delivery_method === 'pickup' ||
          localStorage.getItem(localPickupKey) === 'true' || 
          ['PREPARING', 'READY', 'COLLECTED'].includes(statusUpper) ||
          (order.fulfillment && String(order.fulfillment).toLowerCase().includes('pick'));

      const step1 = 'CONFIRMED';
      const step2 = isPickup ? 'PREPARING' : 'PROCESSING';
      const step3 = isPickup ? 'READY' : 'SHIPPED';
      const step4 = isPickup ? 'COLLECTED' : 'DELIVERED';
      
      let activeStep = 1;
      if (statusUpper === 'PROCESSING' || statusUpper === 'PREPARING') activeStep = 2;
      else if (statusUpper === 'SHIPPED' || statusUpper === 'READY') activeStep = 3;
      else if (statusUpper === 'DELIVERED' || statusUpper === 'COLLECTED') activeStep = 4;

      const trackingNum = order.tracking_number || order.tracking || order.waybill || null;
      const trackingDisplay = trackingNum 
        ? `Waybill: <span class="font-bold tracking-wide text-slate-900">${escapeHtml(trackingNum)}</span>`
        : `Waybill: <span class="text-slate-400 italic">Pending Tracking</span>`;
      const totalCents = order.total_cents ?? order.total ?? 0;
      const shippingCents = order.shipping_cents ?? 0;
      const taxCents = order.tax_cents ?? 0;
      const subtotalCents = order.subtotal_cents ?? Math.max(0, totalCents - shippingCents - taxCents);
      const paymentRoute = order.mock_method === 'card' ? 'card-payment' : 'payment';
      const changeRoute = order.mock_method === 'card' ? 'payment' : 'card-payment';

      return `
        <div data-order-group="${orderGroup(order)}" class="border border-slate-200 bg-white px-6 py-6 sm:px-8 sm:py-7 mb-8">
          <div class="account-order-grid grid gap-8 md:gap-6 lg:gap-10">
            <div class="min-w-0">
              <p class="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-3">Order number</p>
              <h2 class="font-serif text-4xl sm:text-5xl text-slate-950 break-all">#${escapeHtml(displayId)}</h2>
              <div class="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-sm text-slate-700">
                <span>${new Date(order.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span class="border-l border-slate-300 pl-4">${isPickup ? 'Boutique Pick-up' : 'Home Delivery'}</span>
              </div>
              <dl class="mt-6 border-t border-slate-200 text-sm">
                <div class="flex justify-between gap-4 border-b border-slate-200 py-2"><dt class="text-slate-500 uppercase tracking-widest">Subtotal</dt><dd>${money(subtotalCents)}</dd></div>
                <div class="flex justify-between gap-4 border-b border-slate-200 py-2"><dt class="text-slate-500 uppercase tracking-widest">Shipping</dt><dd>${money(shippingCents)}</dd></div>
                ${taxCents ? `<div class="flex justify-between gap-4 border-b border-slate-200 py-2"><dt class="text-slate-500 uppercase tracking-widest">Tax</dt><dd>${money(taxCents)}</dd></div>` : ''}
                <div class="flex justify-between gap-4 pt-3 font-bold"><dt class="lumiere-gold uppercase tracking-widest">Total</dt><dd class="lumiere-gold text-lg">${money(totalCents)}</dd></div>
              </dl>
            </div>
            <div class="min-w-0 border-t border-slate-200 pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:pl-8">
              <p class="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-4">Status</p>
              <span class="inline-block border px-4 py-2 text-xs font-bold tracking-widest uppercase ${pendingPayment ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'}">${pendingPayment ? 'Pending Payment' : escapeHtml(statusUpper)}</span>
              <div class="mt-5 grid gap-3">
                ${pendingPayment ? `<a href="/${paymentRoute}/?id=${encodeURIComponent(rawId)}" class="lumiere-btn account-order-action">Complete payment</a>
                <a href="/${changeRoute}/?id=${encodeURIComponent(rawId)}" class="lumiere-btn-outline account-order-action">Change payment method</a>` : ''}
                <a href="/receipt/?id=${encodeURIComponent(rawId)}" class="lumiere-btn-outline account-order-action">View order</a>
              </div>
            </div>
          </div>

          ${pendingPayment ? `<div class="mt-6 border-t border-slate-200 pt-5">
            <p class="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-3">Next step</p>
            <p class="text-sm text-slate-900">Complete payment to begin fulfillment.</p>
          </div>` : `<details class="group mt-8">
            <summary class="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase cursor-pointer pt-6 border-t border-slate-200 hover:text-slate-900 transition-colors select-none flex justify-between items-center outline-none">
              Track & Manage Order
              <svg class="w-4 h-4 transform group-open:rotate-180 transition-transform text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </summary>
            
            <div class="pt-10 pb-4">
              
              <div class="relative max-w-2xl mx-auto pt-4 pb-16">
                <div class="hidden sm:block absolute top-1/2 left-0 w-full border-t-[2px] border-dotted border-slate-200 -z-10 -translate-y-[1px]"></div>
                <div class="hidden sm:block absolute top-1/2 left-0 border-t-[2px] border-solid border-slate-900 -z-10 -translate-y-[1px] transition-all duration-700" style="width: ${((activeStep - 1) / 3) * 100}%"></div>
                
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-1 gap-y-8 w-full">
                  <div class="min-w-0 flex flex-col items-center gap-4 bg-white px-1 sm:px-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">1</div>
                    <span class="max-w-full break-words text-center text-xs font-bold tracking-normal sm:tracking-[0.15em] uppercase ${activeStep >= 1 ? 'text-slate-900' : 'text-slate-400'}">${step1}</span>
                  </div>
                  <div class="min-w-0 flex flex-col items-center gap-4 bg-white px-1 sm:px-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">2</div>
                    <span class="max-w-full break-words text-center text-xs font-bold tracking-normal sm:tracking-[0.15em] uppercase ${activeStep >= 2 ? 'text-slate-900' : 'text-slate-400'}">${step2}</span>
                  </div>
                  <div class="min-w-0 flex flex-col items-center gap-4 bg-white px-1 sm:px-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">3</div>
                    <span class="max-w-full break-words text-center text-xs font-bold tracking-normal sm:tracking-[0.15em] uppercase ${activeStep >= 3 ? 'text-slate-900' : 'text-slate-400'}">${step3}</span>
                  </div>
                  <div class="min-w-0 flex flex-col items-center gap-4 bg-white px-1 sm:px-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 4 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">4</div>
                    <span class="max-w-full break-words text-center text-xs font-bold tracking-normal sm:tracking-[0.15em] uppercase ${activeStep >= 4 ? 'text-slate-900' : 'text-slate-400'}">${step4}</span>
                  </div>
                </div>
              </div>

              <div class="flex flex-col items-center justify-center max-w-3xl mx-auto border-t border-slate-100 pt-8">
                 <div class="text-center">
                    <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">${isPickup ? 'Pick-up Location' : 'Delivery tracking'}</p>
                    <p class="text-sm font-serif text-slate-900">${isPickup ? escapeHtml(order.location || 'Pavilion KL Boutique') : trackingDisplay}</p>
                 </div>
              </div>
            </div>
          </details>`}

        </div>
      `;
    }).join('');
  }

  const mainContent = `
    <div class="w-full min-w-0 max-w-4xl pl-0 lg:pl-12">
      <div class="mb-12 border-b border-slate-200 pb-6">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Order History</h1>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Track and manage your boutique purchases</p>
      </div>
      ${orders.length && !ordersError ? `<nav class="flex gap-6 overflow-x-auto border-b border-slate-200 mb-6" aria-label="Order status">
        <button type="button" data-order-tab="pay" class="min-h-11 shrink-0 border-b-2 border-transparent text-sm text-slate-500">To Pay</button>
        <button type="button" data-order-tab="ship" class="min-h-11 shrink-0 border-b-2 border-transparent text-sm text-slate-500">To Ship</button>
        <button type="button" data-order-tab="receive" class="min-h-11 shrink-0 border-b-2 border-transparent text-sm text-slate-500">To Receive</button>
        <button type="button" data-order-tab="completed" class="min-h-11 shrink-0 border-b-2 border-transparent text-sm text-slate-500">Completed</button>
      </nav>` : ''}
      
      <div class="space-y-8">
        ${ordersHtml}
        <p id="orders-empty" class="hidden py-12 text-center text-slate-500">No orders in this stage.</p>
      </div>
    </div>
  `;

  root.innerHTML = sidebar + mainContent;
  const tabs = [...root.querySelectorAll('[data-order-tab]')];
  const cards = [...root.querySelectorAll('[data-order-group]')];
  const showGroup = (group) => {
    tabs.forEach(tab => {
      const active = tab.dataset.orderTab === group;
      tab.setAttribute('aria-pressed', String(active));
      tab.classList.toggle('border-slate-900', active);
      tab.classList.toggle('border-transparent', !active);
      tab.classList.toggle('text-slate-900', active);
      tab.classList.toggle('text-slate-500', !active);
    });
    const visible = cards.filter(card => {
      const match = card.dataset.orderGroup === group;
      card.classList.toggle('hidden', !match);
      return match;
    });
    root.querySelector('#orders-empty').classList.toggle('hidden', visible.length > 0);
    if (visible.length) {
      const details = visible[0].querySelector('details');
      if (details) details.open = true;
    }
  };
  tabs.forEach(tab => tab.addEventListener('click', () => showGroup(tab.dataset.orderTab)));
  if (tabs.length) showGroup(orderGroup(orders[0]));
}

init().catch(console.error);
