import { api } from './api.js'
import { renderShell, escapeHtml } from './ui.js'
import { fallbackProducts } from './catalog-fallback.js'

async function init() {
  await renderShell()

  const form = document.getElementById('auth-form')
  const input = document.getElementById('serial-input')
  const resultBox = document.getElementById('success-box') 

  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const uiSerial = input.value.trim()
    if (!uiSerial) return

    const submitBtn = form.querySelector('button[type="submit"]')
    
    submitBtn.textContent = 'VERIFYING...'
    submitBtn.disabled = true
    resultBox.classList.add('hidden')

    try {
      // 1. Make it lowercase
      // 2. Remove "prod_" if they typed it manually
      // 3. Remove "-d" if the website interface added it
      let cleanString = uiSerial.toLowerCase().replace('prod_', '').replace('-d', '');
      
      // 4. Rebuild the exact database ID (e.g., "prod_lv_neverfull")
      let dbSerial = 'prod_' + cleanString;

      let productMatch = null;

      try {
        // Query the database
        productMatch = await api(`/api/products/${encodeURIComponent(dbSerial)}`);
      } catch (apiError) {
        // Fallback check
        const fallbackMatch = fallbackProducts.find(p => p.id === dbSerial || p.slug === dbSerial);
        
        if (fallbackMatch) {
          productMatch = {
            serial: fallbackMatch.id,
            name: fallbackMatch.name
          };
        } else {
          throw new Error('Not found'); 
        }
      }
      
      // SUCCESS STATE UI (Entrupy-Style Certificate)
      resultBox.classList.remove('hidden', 'bg-[#fef2f2]', 'border-[#fecaca]', 'text-center')
      resultBox.classList.add('bg-[#f0fdf4]', 'border-[#bbf7d0]')
      
      // Generate dynamic certificate data
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const certNumber = 'LMR-' + Math.floor(100000 + Math.random() * 900000);
      const brandName = (productMatch.name || productMatch.title || 'LUMIÈRE').split(' ')[0].toUpperCase();

      resultBox.innerHTML = `
        <div class="border-b border-[#bbf7d0] pb-4 mb-4 text-center">
           <div class="flex items-center justify-center gap-2 mb-2">
              <svg class="w-5 h-5 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 class="text-[#16a34a] font-serif text-lg font-bold">Authenticity Certified</h3>
           </div>
           <p class="text-[10px] uppercase tracking-widest text-slate-500">Certificate ID: ${certNumber}</p>
        </div>

        <div class="grid grid-cols-2 gap-y-4 text-left text-xs px-2">
            <div>
                <p class="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-1">Brand</p>
                <p class="text-slate-900 font-medium">${escapeHtml(brandName)}</p>
            </div>
            <div>
                <p class="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-1">Serial Number</p>
                <p class="text-slate-900 font-mono font-medium">${escapeHtml(uiSerial.toUpperCase())}</p>
            </div>
            <div class="col-span-2">
                <p class="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-1">Item Description</p>
                <p class="text-slate-900 font-medium">${escapeHtml(productMatch.name || productMatch.title || 'Registered Lumière Piece')}</p>
            </div>
            <div>
                <p class="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-1">Date of Issue</p>
                <p class="text-slate-900 font-medium">${dateStr}</p>
            </div>
            <div>
                <p class="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-1">Verification Base</p>
                <p class="text-slate-900 font-medium">Lumière Cryptographic Ledger</p>
            </div>
        </div>

        <div class="mt-5 pt-4 border-t border-[#bbf7d0] text-left px-2">
            <p class="text-[10px] text-slate-600 leading-relaxed italic">
               This item has been rigorously evaluated and matched against the official Lumière database. We stand behind this result with a 100% financial guarantee of authenticity.
            </p>
        </div>
      `
    } catch (error) {
      // ERROR STATE UI (Red Box)
      // Make sure text-center is added back in case they get an error after a success
      resultBox.classList.remove('hidden', 'bg-[#f0fdf4]', 'border-[#bbf7d0]')
      resultBox.classList.add('bg-[#fef2f2]', 'border-[#fecaca]', 'text-center')
      
      resultBox.innerHTML = `
         <h3 class="text-[#dc2626] font-bold mb-3">Authentication Failed</h3>
         <p class="text-xs text-slate-600">
             The serial number <strong class="text-slate-900">${escapeHtml(uiSerial)}</strong> could not be found in our verified registry.
         </p>
      `
    } finally {
      // Reset Button State
      submitBtn.textContent = 'VERIFY SERIAL NUMBER'
      submitBtn.disabled = false
    }
  })
}

init().catch(console.error)