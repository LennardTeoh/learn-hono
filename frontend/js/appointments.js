import { api, getCurrentUser } from './api.js';
import { renderShell, escapeHtml, toast } from './ui.js';

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/appointments/';
    return;
  }

  const root = document.getElementById('account-root');
  const firstName = user.name ? user.name.split(' ')[0] : 'Client';

  const sidebar = `
    <aside class="pr-8 lg:border-r lg:border-slate-200 lg:min-h-[60vh]">
      <h2 class="text-3xl font-serif text-slate-900 mb-6 lg:mb-10">Welcome, ${escapeHtml(firstName)}</h2>
      <ul class="space-y-2 lg:space-y-6 text-sm">
        <li><a href="/account/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">My Orders</a></li>
        <li><a href="/account/appointments/" class="text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">My Appointments</a></li>
        <li><a href="/account/details/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Account Details</a></li>
        <li><a href="/account/saved/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Saved Items</a></li>
        <li><a href="/account/security/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Security Settings</a></li>
      </ul>
    </aside>
  `;

  // Start with a loading state for the main content
  root.innerHTML = sidebar + `
    <div class="w-full min-w-0 max-w-4xl pl-0 lg:pl-12">
      <div class="mb-12 border-b border-slate-200 pb-6">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Care Appointments</h1>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Track your boutique services</p>
      </div>
      <div class="p-8 text-center border border-slate-200 text-slate-500 text-sm">
        Loading your appointments...
      </div>
    </div>
  `;

  // Fetch appointments (We will add this backend route later)
  let appointments = [];
  let fetchError = null;
  try {
    const res = await api(`/api/care/my-bookings?t=${Date.now()}`);
    appointments = res.bookings || res.data || [];
  } catch (err) {
    fetchError = err;
    // Don't crash entirely if the route isn't built yet
    console.warn("Backend route for appointments not ready yet", err);
  }

  let contentHtml = '';
  if (fetchError && !fetchError.message.includes('404')) {
    contentHtml = `<p class="border border-red-200 bg-red-50 p-6 text-red-700">Unable to load appointments at this time.</p>`;
  } else if (!appointments || appointments.length === 0) {
    contentHtml = `
      <div class="text-center py-20 border border-slate-200 bg-slate-50 mt-8">
         <p class="text-slate-500 font-serif mb-8 text-lg">You have no upcoming care appointments.</p>
         <a href="/care/" class="lumiere-btn">Book an Appointment</a>
      </div>
    `;
  } else {
    // We will render the real cards here once the backend is connected
    contentHtml = `<div class="space-y-6">` + appointments.map(apt => `
      <div class="border border-slate-200 bg-white p-6">
        <p class="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-2">Booking #${escapeHtml(apt.booking_id)}</p>
        <h3 class="text-xl font-serif text-slate-900">${escapeHtml(apt.service_category)}</h3>
        <p class="text-sm text-slate-600 mt-2">${escapeHtml(apt.services)}</p>
      </div>
    `).join('') + `</div>`;
  }

  // Update DOM with fetched data
  root.innerHTML = sidebar + `
    <div class="w-full min-w-0 max-w-4xl pl-0 lg:pl-12">
      <div class="mb-12 border-b border-slate-200 pb-6">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Care Appointments</h1>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Track your boutique services</p>
      </div>
      ${contentHtml}
    </div>
  `;
}

init().catch(console.error);