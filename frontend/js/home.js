import { api } from './api.js'
import { addToCart } from './cart-store.js'
import { imageForProduct } from './product-images.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

let allProducts = []

function productCard(product) {
  return `
    <article class="pb-product-card">
      <a href="/product/?id=${encodeURIComponent(product.id)}" class="pb-product-image">
        <img src="${escapeHtml(imageForProduct(product))}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover" loading="lazy">
      </a>
      <div class="pb-product-copy">
        <div class="pb-product-meta">
          <span>${escapeHtml(product.category)}</span>
          <span>${product.stock} left</span>
        </div>
        <a href="/product/?id=${encodeURIComponent(product.id)}"><h3>${escapeHtml(product.name)}</h3></a>
        <p>${escapeHtml(product.description)}</p>
        <div class="pb-product-bottom">
          <span class="pb-price">${money(product.price_cents)}</span>
          <button data-add="${escapeHtml(product.id)}" class="pb-mini-button" type="button">Add to box</button>
        </div>
      </div>
    </article>`
}

function render(products) {
  const grid = document.getElementById('product-grid')
  grid.innerHTML = products.length
    ? products.map(productCard).join('')
    : '<div class="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No products match your search.</div>'

  grid.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const product = allProducts.find((item) => item.id === button.dataset.add)
      if (!product) return
      addToCart(product, 1)
      toast(`${product.name} added to cart.`, 'success')
    })
  })
}

async function init() {
  await renderShell()
  const data = await api('/api/products')
  allProducts = data.products
  render(allProducts.slice(0, 4))
}

init().catch((error) => {
  document.getElementById('product-grid').innerHTML = `<p class="col-span-full text-red-600">${escapeHtml(error.message)}</p>`
})
