import { api } from './api.js'
import { addToCart } from './cart-store.js'
import { imageForProduct } from './product-images.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

async function init() {
  await renderShell()
  const id = new URLSearchParams(location.search).get('id')
  if (!id) throw new Error('Product ID is missing.')

  const { product } = await api(`/api/products/${encodeURIComponent(id)}`)
  document.title = `${product.name} · PetitBakery`
  document.getElementById('product-detail').innerHTML = `
    <div class="overflow-hidden rounded-3xl bg-[color:var(--pb-peach)]">
      <img src="${escapeHtml(imageForProduct(product))}" alt="${escapeHtml(product.name)}" class="aspect-square h-full w-full object-cover">
    </div>
    <div class="flex flex-col justify-center">
      <p class="text-sm font-semibold uppercase tracking-wider text-[color:var(--pb-muted)]">${escapeHtml(product.category)}</p>
      <h1 class="pb-display mt-3 text-4xl font-black tracking-tight text-[color:var(--pb-ink)] sm:text-5xl">${escapeHtml(product.name)}</h1>
      <p class="mt-5 text-lg leading-8 text-[color:var(--pb-muted)]">${escapeHtml(product.description)}</p>
      <div class="mt-7 flex items-end justify-between">
        <p class="text-3xl font-black">${money(product.price_cents)}</p>
        <p class="text-sm text-[color:var(--pb-muted)]">${product.stock} available</p>
      </div>
      <div class="mt-7 flex gap-3">
        <input id="qty" type="number" min="1" max="10" value="1" aria-label="Quantity" class="w-24 rounded-xl border border-[color:var(--pb-line)] bg-[color:var(--pb-card)] px-4 py-3">
        <button id="add" class="pb-button flex-1" type="button">Add to box</button>
      </div>
      <p class="mt-4 text-xs leading-5 text-[color:var(--pb-muted)]">Price shown is recalculated by the server during checkout. Client-side cart data is never trusted for order totals.</p>
    </div>`

  document.getElementById('add').addEventListener('click', () => {
    const qty = Math.min(10, Math.max(1, Number(document.getElementById('qty').value) || 1))
    addToCart(product, qty)
    toast(`${product.name} added to cart.`, 'success')
  })
}

init().catch((error) => {
  document.getElementById('product-detail').innerHTML = `<p class="text-red-600">${escapeHtml(error.message)}</p>`
})
