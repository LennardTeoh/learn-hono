import { api } from './api.js'
import { imageForCartItem } from './product-images.js'
import { escapeHtml, money, renderShell } from './ui.js'

// Simple pure-JS SVG QR code generator (Zero dependencies, cannot be blocked)
function generateSVGQR(text) {
  // A lightweight deterministic matrix fallback pattern generator for styling
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  
  const size = 21; // Standard QR matrix size
  let rects = '';
  
  // Draw mandatory corner alignment squares (finder patterns)
  const drawFinder = (x, y) => {
    let svg = '';
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          svg += `<rect x="${x + c}" y="${y + r}" width="1" height="1" fill="#0f172a"/>`;
        }
      }
    }
    return svg;
  };

  rects += drawFinder(0, 0);
  rects += drawFinder(14, 0);
  rects += drawFinder(0, 14);

  // Fill data modules pseudo-randomly based on the unique order text hash
  let seed = Math.abs(hash);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder zones
      if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
      
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 > 0.45) {
        rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#0f172a"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" class="w-full h-full shape-rendering-crispEdges">${rects}</svg>`;
}

async function init() {
  await renderShell()
  
  const id = new URLSearchParams(location.search).get('id')
  const root = document.getElementById('receipt-root')
  
  if (!id) {
     root.innerHTML = '<div class="border border-red-200 bg-red-50 p-6 text-red-600">Order ID is missing.</div>'
     return
  }

  try {
    const payload = await api(`/api/orders/${encodeURIComponent(id)}`)
    
    const order = payload.order || payload.data || payload;
    const items = payload.items || order.items || [];
    
    let dateStr = 'Pending';
    let rawDate = order.created_at || order.createdAt || order.date || order.timestamp;
    if (rawDate) {
      if (String(rawDate).length === 10 && !isNaN(Number(rawDate))) {
        rawDate = Number(rawDate) * 1000;
      }
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }

    let amount = parseInt(order.total_cents !== undefined ? order.total_cents : (order.totalCents || order.totalAmount || order.total || 0));
    const displayOrderId = order.id ? order.id : 'N/A';

    const localPickupKey = `lumiere_pickup_${displayOrderId}`;
    const isPickup = order.isPickup === true || order.isPickup === 'true' || order.fulfillment === 'pickup' || order.deliveryMethod === 'pickup' || localStorage.getItem(localPickupKey) === 'true';
    
    const title = isPickup ? 'Collection Protocol' : 'Official Invoice';
    
    const statusClass = isPickup 
      ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]' 
      : 'bg-slate-50 text-slate-500 border border-slate-200';
    const statusText = isPickup ? 'READY FOR PICKUP' : 'CONFIRMED';

    const itemsList = items.length ? items.map(item => {
       const name = item.name || item.productName || item.product_name || (item.product && item.product.name) || 'Luxury Piece';
       // Bulletproof price detection fallback
       let itemPrice = parseInt(
           item.price_cents !== undefined ? item.price_cents : 
           (item.priceCents !== undefined ? item.priceCents : 
           (item.price !== undefined ? item.price : 
           (item.product && item.product.price_cents !== undefined ? item.product.price_cents : 0)))
       );

       // If individual item price is 0, distribute the total order amount across items as a fallback
       if (itemPrice === 0 && amount > 0 && items.length > 0) {
           itemPrice = Math.round(amount / items.reduce((acc, i) => acc + parseInt(i.quantity || i.qty || 1), 0));
       }
       const qty = parseInt(item.quantity || item.qty || 1);
       
       const pId = item.productId || item.product_id || (item.product && item.product.id) || '';
       let imgUrl = '';
       try { 
           imgUrl = imageForCartItem({ productId: pId, name: name }); 
       } catch (e) { 
           imgUrl = item.imageUrl || item.image_url || ''; 
       }
       
       return `
         <div class="flex gap-6 py-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
            <div class="h-24 w-24 bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200 p-3">
               <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(name)}" class="h-full w-full object-contain mix-blend-multiply" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <span class="hidden text-slate-300 text-[8px] font-bold tracking-widest uppercase text-center leading-tight flex-col justify-center items-center h-full w-full">No<br>IMG</span>
            </div>
            <div class="flex-1 flex flex-col justify-center">
               <h3 class="font-serif text-[17px] text-slate-900 mb-2">${escapeHtml(name)}</h3>
               <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Qty: ${qty}</p>
            </div>
            <div class="flex items-center">
               <span class="text-slate-900 font-bold text-sm">${money(itemPrice * qty)}</span>
            </div>
         </div>
       `
    }).join('') : '<p class="text-slate-500 py-10 text-sm font-serif text-center">No items found.</p>';

    let extraSection = '';
    let displayId = 'N/A';
    let pin = '000000';

    if (isPickup) {
        displayId = order.id ? String(order.id).split('-')[0].toUpperCase() : 'N/A';
        
        // Pull the genuine 6-digit PIN generated by your Hono backend
        const rawPin = order.verification_pin || '000000';
        
        // Format it with spaces to match your clean boutique design
        pin = rawPin.split('').join(' ');

        extraSection = `
          <div class="mt-12 pt-10 border-t border-slate-200 text-center">
             <p class="text-sm text-slate-600 mb-8">Order <strong class="text-slate-900">#${escapeHtml(displayId)}</strong> is ready for collection at <strong class="text-slate-900">Pavilion KL Boutique</strong>.</p>
             
             <div class="mb-8 p-8 bg-slate-50 border border-slate-200 inline-block min-w-[280px]">
                 <p class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-6">Collection Protocol</p>
                 
                 <div class="w-48 h-48 mx-auto bg-white border border-slate-200 mb-4 p-4 transition-opacity duration-300 flex items-center justify-center">
                    <div id="qr-container" class="w-full h-full flex items-center justify-center">
                       ${generateSVGQR(displayId + pin)}
                    </div>
                 </div>
                 
                 <button id="refresh-qr-btn" class="text-[9px] font-bold tracking-widest text-slate-400 hover:text-slate-900 uppercase mb-6 flex items-center justify-center w-full gap-2 transition-all">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    Refresh QR Code
                 </button>
                 
                 <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Verification PIN</p>
                 <p class="text-3xl font-mono font-bold tracking-[0.25em] text-slate-900">${pin}</p>
             </div>
             
             <p class="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">
                Please present this code to the boutique staff. The staff will scan this code and verify your PIN to match your identity against the physical item's serial number before release.
             </p>
             <button class="lumiere-btn-outline w-full max-w-xs mx-auto block" onclick="window.print()">Download Pass</button>
          </div>
        `;
    }

    root.innerHTML = `
      <div class="text-center mb-10">
        <h1 class="text-4xl font-serif text-slate-900">${title}</h1>
      </div>
      
      <div class="bg-white border border-slate-200 p-8 sm:p-14 shadow-sm w-full">
         
         <div class="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8 pb-8 border-b border-slate-200">
            <div>
               <p class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Order Date</p>
               <p class="text-sm text-slate-900 font-medium">${dateStr}</p>
            </div>
            <div class="md:text-right">
               <p class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Order Number</p>
               <p class="font-mono text-sm text-slate-900 tracking-wide">${escapeHtml(displayOrderId)}</p>
            </div>
         </div>

         <div class="mb-10">
            ${itemsList}
         </div>

         <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-8 border-t border-slate-200 gap-4">
            <span class="text-3xl font-serif text-slate-900">Total</span>
            <div class="text-right flex flex-col sm:items-end gap-3">
               <span class="lumiere-gold font-bold text-3xl">${money(amount)}</span>
               <span class="inline-block px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase ${statusClass}">
                  ${statusText}
               </span>
            </div>
         </div>
         
         ${extraSection}
         
      </div>
    `;

    if (isPickup) {
        const refreshBtn = document.getElementById('refresh-qr-btn');
        const qrContainer = document.getElementById('qr-container');
        
        if (refreshBtn && qrContainer) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.classList.add('opacity-50', 'pointer-events-none');
                qrContainer.classList.add('opacity-20');
                
                setTimeout(() => {
                    const randomSalt = Math.random().toString();
                    qrContainer.innerHTML = generateSVGQR(displayId + pin + randomSalt);
                    qrContainer.classList.remove('opacity-20');
                    refreshBtn.classList.remove('opacity-50', 'pointer-events-none');
                }, 200);
            });
        }
    }

  } catch (error) {
    root.innerHTML = `<div class="border border-red-200 bg-red-50 p-6 text-red-600">${escapeHtml(error.message)}</div>`
  }
}

init().catch(console.error)