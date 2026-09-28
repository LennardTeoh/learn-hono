import { api, getCurrentUser } from './api.js';
import { renderShell, escapeHtml, toast } from './ui.js';

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/security/';
    return;
  }

  const root = document.getElementById('account-root');
  const firstName = user.name ? user.name.split(' ')[0] : 'Client';

  // Upgraded luxury sidebar matching the details page
  const sidebar = `
    <aside class="pr-8 md:border-r md:border-slate-200 min-h-[60vh]">
      <h2 class="text-3xl font-serif text-slate-900 mb-10">Welcome, ${escapeHtml(firstName)}</h2>
      <ul class="space-y-6 text-sm">
        <li><a href="/account/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">My Orders</a></li>
        <li><a href="/account/details/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Account Details</a></li>
        <li><a href="/account/saved/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Saved Items</a></li>
        <li><a href="/account/security/" class="text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Security Settings</a></li>
      </ul>
    </aside>
  `;

  // Ultra-Luxury layout with minimalist inputs and the new 2FA toggle switch
  const mainContent = `
    <div class="w-full max-w-3xl pl-0 lg:pl-12">
      <div class="mb-16">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Security Settings</h1>
        <p class="text-sm text-slate-500 font-serif italic">Manage your credentials and account protection.</p>
      </div>

      <div class="space-y-16">
        
        <!-- Section: Credentials -->
        <div>
          <h3 class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8 border-b border-slate-200 pb-4">Account Credentials</h3>
          
          <form id="password-form" class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div class="md:col-span-2">
              <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Current Password</label>
              <input name="currentPassword" type="password" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Enter current password" required>
            </div>
            
            <div class="md:col-span-2">
              <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">New Password</label>
              <input name="newPassword" type="password" minlength="8" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Enter new password (min 8 characters)" required>
            </div>

            <div class="md:col-span-2 pt-4">
              <button type="submit" class="w-full md:w-auto bg-slate-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase px-14 py-4 hover:bg-slate-800 transition-colors">Update Password</button>
            </div>
          </form>
        </div>

        <!-- Section: 2FA Toggle -->
        <div>
          <h3 class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8 border-b border-slate-200 pb-4">Authentication</h3>
          
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div class="max-w-md">
              <h4 class="text-sm font-serif text-slate-900 mb-2">Two-Factor Authentication (2FA)</h4>
              <p class="text-xs text-slate-500 leading-relaxed">Protect your account by requiring an email-based verification code whenever you sign in from a new device.</p>
            </div>
            
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" id="tfa-toggle" class="sr-only peer">
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              <span id="tfa-status-text" class="ml-4 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 w-16">Inactive</span>
            </label>
          </div>
        </div>

        <!-- Section: Device History -->
        <div>
          <h3 class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8 border-b border-slate-200 pb-4">Device History</h3>
          
          <div class="flex justify-between items-center py-2">
            <div>
              <p class="text-sm text-slate-900 font-serif mb-1">Current Session</p>
              <p class="text-xs text-slate-400">Active right now</p>
            </div>
            <span class="text-[9px] tracking-[0.2em] font-bold uppercase text-slate-400">This Device</span>
          </div>
        </div>

      </div>
    </div>
  `;

  root.innerHTML = sidebar + mainContent;

  // --- PASSWORD UPDATE LOGIC ---
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'UPDATING...';

    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true
        })
      });
      toast('Password updated successfully.', 'success');
      e.currentTarget.reset();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  });

  // --- 2FA TOGGLE LOGIC ---
  const tfaToggle = document.getElementById('tfa-toggle');
  const tfaStatusText = document.getElementById('tfa-status-text');

  // Load existing preference from user database
  const is2faActive = user.twoFactorEnabled !== false; 
  tfaToggle.checked = is2faActive;
  
  function updateToggleText(isActive) {
    tfaStatusText.innerText = isActive ? 'ACTIVE' : 'INACTIVE';
    tfaStatusText.className = isActive 
      ? 'ml-4 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-900 w-16' 
      : 'ml-4 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 w-16';
  }
  updateToggleText(is2faActive);

  tfaToggle.addEventListener('change', async (e) => {
    const isActive = e.target.checked;
    tfaToggle.disabled = true; // Lock the toggle while saving to prevent spam

    try {
      await api('/api/auth/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twoFactorEnabled: isActive
        })
      });
      
      updateToggleText(isActive);
      toast(isActive ? 'Two-Factor Authentication enabled.' : 'Two-Factor Authentication disabled.', 'success');
    } catch (err) {
      // If the API fails, flip the toggle back visually
      e.target.checked = !isActive; 
      toast('Failed to update authentication settings.', 'error');
    } finally {
      tfaToggle.disabled = false;
    }
  });
}

init().catch(console.error);