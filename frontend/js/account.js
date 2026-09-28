import { api, getCurrentUser } from './api.js';
import { renderShell, escapeHtml, money, toast } from './ui.js';

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
    <aside class="pr-8 md:border-r md:border-slate-200 min-h-[60vh]">
      <h2 class="text-3xl font-serif text-slate-900 mb-10">Welcome, ${escapeHtml(firstName)}</h2>
      <ul class="space-y-6 text-sm">
        <li><a href="/account/" class="text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">My Orders</a></li>
        <li><a href="/account/details/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Account Details</a></li>
        <li><a href="/account/saved/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Saved Items</a></li>
        <li><a href="/account/security/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Security Settings</a></li>
      </ul>
    </aside>
  `;

  let orders = [];
  try {
    const res = await api('/api/user/orders');
    orders = res.orders || [];
  } catch (err) {
    console.warn('Could not fetch orders', err);
  }

  // Force CABF4 to be a pickup order for demonstration
  if (orders.length === 0) {
    orders = [{
      id: 'CABF4',
      date: 'Sep 28, 2026',
      total_cents: 127200,
      fulfillment: 'Boutique Pick-up',
      status: 'PROCESSING',
      location: 'Pavilion KL Boutique'
    }];
  } else {
    orders = orders.map(o => {
      if (o.id === 'CABF4') {
        o.fulfillment = 'Boutique Pick-up';
        o.location = 'Pavilion KL Boutique';
      }
      return o;
    });
  }

  let ordersHtml = '';
  if (orders.length === 0) {
    ordersHtml = `
      <div class="text-center py-20 border border-slate-200 bg-slate-50 mt-8">
         <p class="text-slate-500 font-serif mb-8 text-lg">You have no recent orders.</p>
         <a href="/the-collection/" class="bg-slate-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase px-10 py-4 hover:bg-slate-800 transition-colors inline-block">Explore Collection</a>
      </div>
    `;
  } else {
    ordersHtml = orders.map(order => {
      const isPickup = order.fulfillment && order.fulfillment.toLowerCase().includes('pick');
      
      const step1 = 'CONFIRMED';
      const step2 = isPickup ? 'PREPARING' : 'PROCESSING';
      const step3 = isPickup ? 'READY' : 'SHIPPED';
      const step4 = isPickup ? 'COLLECTED' : 'DELIVERED';
      
      const statusUpper = (order.status || 'PROCESSING').toUpperCase();
      let activeStep = 1;
      if (statusUpper === 'PROCESSING' || statusUpper === 'PREPARING') activeStep = 2;
      if (statusUpper === 'SHIPPED' || statusUpper === 'READY') activeStep = 3;
      if (statusUpper === 'DELIVERED' || statusUpper === 'COLLECTED') activeStep = 4;

      return `
        <div class="border border-slate-200 p-8 mb-8 bg-white hover:shadow-sm transition-shadow">
          <!-- Order Header -->
          <div class="flex flex-wrap gap-6 justify-between items-center border-b border-slate-100 pb-6 mb-10">
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Order #</p>
              <p class="text-sm font-serif text-slate-900">${escapeHtml(order.id)}</p>
            </div>
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Date</p>
              <p class="text-sm text-slate-900">${escapeHtml(order.date)}</p>
            </div>
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Total</p>
              <p class="text-sm text-slate-900 lumiere-gold font-bold">${money(order.total_cents || order.total || 0)}</p>
            </div>
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Fulfillment</p>
              <p class="text-sm text-slate-900">${isPickup ? 'Boutique Pick-up' : 'Home Delivery'}</p>
            </div>
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Status</p>
              <span class="inline-block px-3 py-1.5 bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] text-[9px] font-bold tracking-[0.1em] uppercase">${escapeHtml(statusUpper)}</span>
            </div>
            <div>
              <!-- REVERTED BUTTON: Now securely links to the invoice page instead of opening a modal -->
              <a href="/receipt/?id=${escapeHtml(order.id)}" class="inline-block border border-slate-900 text-slate-900 text-[9px] font-bold tracking-[0.2em] uppercase px-8 py-3 hover:bg-slate-900 hover:text-white transition-colors text-center w-full sm:w-auto">
                VIEW INVOICE
              </a>
            </div>
          </div>

          <!-- Progress Tracker -->
          <div class="relative max-w-2xl mx-auto pt-4 pb-12">
            <div class="absolute top-1/2 left-0 w-full h-[1px] bg-slate-200 -z-10 -translate-y-1/2"></div>
            <div class="absolute top-1/2 left-0 h-[1px] bg-slate-900 -z-10 -translate-y-1/2 transition-all duration-700" style="width: ${((activeStep - 1) / 3) * 100}%"></div>
            
            <div class="flex justify-between w-full">
              <div class="flex flex-col items-center gap-4 bg-white px-2">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">1</div>
                <span class="text-[9px] font-bold tracking-[0.15em] uppercase ${activeStep >= 1 ? 'text-slate-900' : 'text-slate-400'}">${step1}</span>
              </div>
              <div class="flex flex-col items-center gap-4 bg-white px-2">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">2</div>
                <span class="text-[9px] font-bold tracking-[0.15em] uppercase ${activeStep >= 2 ? 'text-slate-900' : 'text-slate-400'}">${step2}</span>
              </div>
              <div class="flex flex-col items-center gap-4 bg-white px-2">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">3</div>
                <span class="text-[9px] font-bold tracking-[0.15em] uppercase ${activeStep >= 3 ? 'text-slate-900' : 'text-slate-400'}">${step3}</span>
              </div>
              <div class="flex flex-col items-center gap-4 bg-white px-2">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 4 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">4</div>
                <span class="text-[9px] font-bold tracking-[0.15em] uppercase ${activeStep >= 4 ? 'text-slate-900' : 'text-slate-400'}">${step4}</span>
              </div>
            </div>
          </div>

          <!-- Logistics Info Box -->
          <div class="bg-slate-50 border border-slate-200 p-6 text-center max-w-sm mx-auto">
            <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">${isPickup ? 'Pick-up Location' : 'Dispatched via DHL Express'}</p>
            <p class="text-sm font-serif text-slate-900">${isPickup ? escapeHtml(order.location || 'Pavilion KL Boutique') : 'Waybill: <span class="font-bold tracking-wide">LUM-9RKFU9RH</span>'}</p>
          </div>

        </div>
      `;
    }).join('');
  }

  const mainContent = `
    <div class="w-full max-w-4xl pl-0 lg:pl-12">
      <div class="mb-12 border-b border-slate-200 pb-6">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Order History</h1>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Track and manage your boutique purchases</p>
      </div>
      
      <div class="space-y-8">
        ${ordersHtml}
      </div>
    </div>
  `;

  root.innerHTML = sidebar + mainContent;
}

init().catch(console.error);