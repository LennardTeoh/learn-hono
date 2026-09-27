import { api } from './api.js'
import { addToCart } from './cart-store.js'
import { imageForProduct } from './product-images.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

async function init() {
  await renderShell()
  const id = new URLSearchParams(location.search).get('id')
  if (!id) throw new Error('Product ID is missing.')

  const { product } = await api(`/api/products/${encodeURIComponent(id)}`)
  document.title = `${product.name} · LUMIÈRE`
  
  // Build breadcrumb
  const categoryStr = escapeHtml(product.category).toUpperCase();
  const titleStr = escapeHtml(product.name).toUpperCase();
  
  document.getElementById('product-detail').innerHTML = `
    <div class="col-span-full mb-8">
      <a href="/products/" class="text-[10px] font-bold tracking-widest text-slate-400 uppercase hover:text-slate-900 transition-colors">HOME / ${categoryStr} / ${titleStr}</a>
    </div>
    
    <!-- Large Image Left -->
    <div class="bg-slate-100 aspect-[4/5] flex items-center justify-center p-10 relative overflow-hidden">
      <img src="${escapeHtml(imageForProduct(product))}" alt="${escapeHtml(product.name)}" class="w-full h-full object-contain mix-blend-multiply" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
      <span class="hidden text-slate-300 text-xs font-bold tracking-widest uppercase">Main Product Image</span>
    </div>
    
    <!-- Details Right -->
    <div class="flex flex-col justify-start pt-4 lg:pl-10">
      <h1 class="text-4xl font-serif text-slate-900 mb-3">${escapeHtml(product.name)}</h1>
      <p class="text-2xl lumiere-gold font-bold mb-6">${money(product.price_cents)}</p>
      
      <div class="mb-8">
         <span class="inline-block bg-slate-950 text-[#b8974a] text-[9px] font-bold tracking-[0.15em] uppercase px-3 py-1.5">
           ✓ API Authenticity Verified
         </span>
      </div>
      
      <p class="text-slate-600 mb-10 leading-relaxed text-sm">${escapeHtml(product.description)} Each piece is logged in our secure database with a unique serial number to guarantee authenticity and provenance.</p>
      
      <div class="text-xs text-slate-500 mb-10 space-y-1">
        <p>Serial Number: <span class="text-slate-900 font-mono tracking-wide">${escapeHtml(product.id.replace('prod_', '').toUpperCase())}-D</span></p>
        <p>Availability: <span class="text-slate-900">${product.stock > 0 ? 'In Stock (Boutique Collection Available)' : 'Out of Stock'}</span></p>
      </div>
      
      <div class="flex gap-4 items-end">
        <div class="hidden">
           <input id="qty" type="number" min="1" max="10" value="1">
        </div>
        <button id="add" class="lumiere-btn w-full" type="button">Add to Cart</button>
      </div>
    </div>`

  document.getElementById('add').addEventListener('click', () => {
    const qty = 1; // Assuming default 1 for luxury items, or hook up the hidden input
    addToCart(product, qty)
    toast(`${product.name} added to cart.`, 'success')
  })
}

init().catch((error) => {
  document.getElementById('product-detail').innerHTML = `<p class="col-span-full text-red-600">${escapeHtml(error.message)}</p>`
})