import { api, getCurrentUser } from './api.js';
import { renderShell, escapeHtml, toast } from './ui.js';

// Helper function to dynamically format Malaysian phone numbers
function formatPhoneNumber(value) {
  if (!value) return '';
  
  // Strip all non-numeric characters except the leading plus
  let clean = value.replace(/[^\d+]/g, '');
  
  // Auto-convert standard local '01X' to '+60'
  if (clean.startsWith('01')) clean = '+60' + clean.substring(1);
  else if (clean.startsWith('60')) clean = '+' + clean;
  else if (!clean.startsWith('+') && clean.length > 0) clean = '+' + clean;

  // Apply the +60 XX XXX XXXX spacing
  if (clean.startsWith('+60')) {
    let num = clean.substring(3);
    let formatted = '+60';
    
    if (num.length > 0) formatted += ' ' + num.substring(0, 2);
    if (num.length > 2) formatted += ' ' + num.substring(2, 5);
    if (num.length > 5) formatted += ' ' + num.substring(5, 9);
    if (num.length > 9) formatted += num.substring(9);
    
    return formatted.trim();
  }
  
  return clean;
}

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/details/';
    return;
  }

  const root = document.getElementById('account-root');
  const firstName = user.name ? user.name.split(' ')[0] : 'Client';

  const sidebar = `
    <aside class="pr-8 md:border-r md:border-slate-200 min-h-[60vh]">
      <h2 class="text-3xl font-serif text-slate-900 mb-10">Welcome, ${escapeHtml(firstName)}</h2>
      <ul class="space-y-6 text-sm">
        <li><a href="/account/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">My Orders</a></li>
        <li><a href="/account/details/" class="text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Account Details</a></li>
        <li><a href="/account/saved/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Saved Items</a></li>
        <li><a href="/account/security/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Security Settings</a></li>
      </ul>
    </aside>
  `;

  const mainContent = `
    <div class="w-full max-w-4xl pl-0 lg:pl-12">
      <div class="mb-16">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Account Details</h1>
        <p class="text-sm text-slate-500 font-serif italic">Manage your personal information and boutique preferences.</p>
      </div>

      <form id="details-form" class="space-y-16">
        
        <!-- Section: Personal Profile -->
        <div>
          <h3 class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8 border-b border-slate-200 pb-4">Personal Profile</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div class="md:col-span-2">
              <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Full Name</label>
              <input name="name" id="account-name" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Your full name" required>
            </div>

            <div>
              <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Email Address (Read-Only)</label>
              <input name="email" id="account-email" type="email" class="w-full border-b border-slate-200 py-3 bg-transparent text-sm text-slate-400 cursor-not-allowed" disabled>
            </div>

            <div>
              <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Mobile Number</label>
              <input name="phone" id="account-phone" type="tel" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="+60 1X XXX XXXX">
            </div>
          </div>
        </div>

        <!-- Section: Granular Address Book -->
        <div>
          <h3 class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8 border-b border-slate-200 pb-4">Address Book</h3>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-12">
            
            <!-- Shipping Column -->
            <div class="space-y-8">
              <h4 class="text-[9px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-4">Shipping Address</h4>
              
              <div>
                <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Street Address</label>
                <input name="shipping_street1" id="shipping-street1" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300 mb-4" placeholder="Line 1 (Street name and number)">
                <input name="shipping_street2" id="shipping-street2" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Line 2 (Apartment, suite, etc.)">
              </div>

              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">City</label>
                  <input name="shipping_city" id="shipping-city" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="City">
                </div>
                <div>
                  <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Postal Code</label>
                  <input name="shipping_postal" id="shipping-postal" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Postal Code">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">State / Province</label>
                  <input name="shipping_state" id="shipping-state" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="State">
                </div>
                <div>
                  <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Country</label>
                  <input name="shipping_country" id="shipping-country" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Country">
                </div>
              </div>
            </div>

            <!-- Billing Column -->
            <div class="space-y-8">
              <h4 class="text-[9px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-4">Billing Address</h4>
              
              <div>
                <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Street Address</label>
                <input name="billing_street1" id="billing-street1" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300 mb-4" placeholder="Line 1 (Street name and number)">
                <input name="billing_street2" id="billing-street2" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Line 2 (Apartment, suite, etc.)">
              </div>

              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">City</label>
                  <input name="billing_city" id="billing-city" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="City">
                </div>
                <div>
                  <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Postal Code</label>
                  <input name="billing_postal" id="billing-postal" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Postal Code">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">State / Province</label>
                  <input name="billing_state" id="billing-state" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="State">
                </div>
                <div>
                  <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Country</label>
                  <input name="billing_country" id="billing-country" type="text" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Country">
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Action Button -->
        <div class="pt-8">
          <button type="submit" class="w-full md:w-auto bg-slate-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase px-14 py-4 hover:bg-slate-800 transition-colors">Save Changes</button>
        </div>
      </form>
    </div>
  `;

  root.innerHTML = sidebar + mainContent;

  // 1. Populate basic profile data
  document.getElementById('account-name').value = user.name || '';
  document.getElementById('account-email').value = user.email || '';
  
  // Real-time Phone Formatting setup
  const phoneInput = document.getElementById('account-phone');
  if (user.phone) {
    phoneInput.value = formatPhoneNumber(user.phone);
  }
  
  phoneInput.addEventListener('input', (e) => {
    e.target.value = formatPhoneNumber(e.target.value);
  });

  // 2. Unpack and populate structured address data
  if (user.address) {
    try {
      const parsedAddress = JSON.parse(user.address);
      
      if (parsedAddress.shipping) {
        document.getElementById('shipping-street1').value = parsedAddress.shipping.street1 || '';
        document.getElementById('shipping-street2').value = parsedAddress.shipping.street2 || '';
        document.getElementById('shipping-city').value = parsedAddress.shipping.city || '';
        document.getElementById('shipping-postal').value = parsedAddress.shipping.postal || '';
        document.getElementById('shipping-state').value = parsedAddress.shipping.state || '';
        document.getElementById('shipping-country').value = parsedAddress.shipping.country || '';
      }
      
      if (parsedAddress.billing) {
        document.getElementById('billing-street1').value = parsedAddress.billing.street1 || '';
        document.getElementById('billing-street2').value = parsedAddress.billing.street2 || '';
        document.getElementById('billing-city').value = parsedAddress.billing.city || '';
        document.getElementById('billing-postal').value = parsedAddress.billing.postal || '';
        document.getElementById('billing-state').value = parsedAddress.billing.state || '';
        document.getElementById('billing-country').value = parsedAddress.billing.country || '';
      }
    } catch (e) {
      document.getElementById('shipping-street1').value = user.address;
    }
  }

  // Form Submit handler
  document.getElementById('details-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'SAVING...';
    
    try {
      const formData = new FormData(e.currentTarget);
      
      const bundledAddress = JSON.stringify({
        shipping: {
          street1: formData.get('shipping_street1'),
          street2: formData.get('shipping_street2'),
          city: formData.get('shipping_city'),
          postal: formData.get('shipping_postal'),
          state: formData.get('shipping_state'),
          country: formData.get('shipping_country')
        },
        billing: {
          street1: formData.get('billing_street1'),
          street2: formData.get('billing_street2'),
          city: formData.get('billing_city'),
          postal: formData.get('billing_postal'),
          state: formData.get('billing_state'),
          country: formData.get('billing_country')
        }
      });

      // Strip the spaces before saving to the database to maintain clean raw data
      const rawPhone = formData.get('phone').replace(/\s/g, '');

      await api('/api/auth/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          phone: rawPhone,
          address: bundledAddress
        })
      });
      toast('Profile details updated successfully.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
}

init().catch(console.error);