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

  let appointments = [];
  let fetchError = null;
  try {
    const res = await api(`/api/care/my-bookings?t=${Date.now()}`);
    appointments = res.bookings || res.data || [];
  } catch (err) {
    fetchError = err;
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
    contentHtml = `<div class="space-y-6">` + appointments.map(apt => {
      const isCancelled = apt.status === 'CANCELLED';
      const statusColor = isCancelled ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700';
      
      return `
      <div class="border border-slate-200 bg-white p-6 relative">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-2">Booking #${escapeHtml(apt.booking_id)}</p>
            <h3 class="text-xl font-serif text-slate-900">${escapeHtml(apt.service_category)}</h3>
          </div>
          <span class="inline-block border px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${statusColor}">
            ${escapeHtml(apt.status || 'SCHEDULED')}
          </span>
        </div>
        
        <details class="group mt-4 border-t border-slate-100 pt-4">
          <summary class="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase cursor-pointer hover:text-slate-900 transition-colors select-none flex justify-between items-center outline-none">
            View Details & Manage
            <svg class="w-4 h-4 transform group-open:rotate-180 transition-transform text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </summary>
          <div class="pt-6 space-y-4 text-sm text-slate-600">
            <p><strong class="text-slate-900">Preferred Date:</strong> ${escapeHtml(apt.preferred_date || 'TBD')}</p>
            <p><strong class="text-slate-900">Services Selected:</strong> ${escapeHtml(apt.services)}</p>
            
            ${!isCancelled ? `
            <div class="pt-6 border-t border-slate-100">
              <button data-cancel-id="${escapeHtml(apt.booking_id)}" class="text-red-600 hover:text-red-800 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                Cancel Appointment
              </button>
            </div>
            ` : ''}
          </div>
        </details>
      </div>
    `}).join('') + `</div>`;
  }

  root.innerHTML = sidebar + `
    <div class="w-full min-w-0 max-w-4xl pl-0 lg:pl-12">
      <div class="mb-12 border-b border-slate-200 pb-6">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Care Appointments</h1>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Track your boutique services</p>
      </div>
      ${contentHtml}
    </div>
  `;

  // Attach cancel listeners
  document.querySelectorAll('[data-cancel-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm('Are you sure you want to cancel this appointment?')) return;
      
      const btnEl = e.currentTarget;
      const id = btnEl.getAttribute('data-cancel-id');
      const originalText = btnEl.innerHTML;
      btnEl.innerHTML = 'Canceling...';
      btnEl.disabled = true;

      try {
        const res = await api(`/api/care/cancel/${id}`, { method: 'POST' });
        if (res.success) {
          toast('Appointment cancelled successfully.', 'success');
          setTimeout(() => location.reload(), 1000);
        } else {
          throw new Error(res.error || 'Failed to cancel');
        }
      } catch (err) {
        btnEl.innerHTML = originalText;
        btnEl.disabled = false;
        toast(err.message, 'error');
      }
    });
  });
}

init().catch(console.error);