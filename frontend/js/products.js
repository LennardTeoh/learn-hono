import { api } from './api.js'
import { addToCart } from './cart-store.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

let allProducts = []

function card(product) {
  return `<article class="pb-product-card"><a href="/product/?id=${encodeURIComponent(product.id)}" class="pb-product-image"><img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy"></a><div class="pb-product-copy"><div class="pb-product-meta"><span>${escapeHtml(product.category)}</span><span>${product.stock} left</span></div><a href="/product/?id=${encodeURIComponent(product.id)}"><h2>${escapeHtml(product.name)}</h2></a><p>${escapeHtml(product.description)}</p><div class="pb-product-bottom"><span class="pb-price">${money(product.price_cents)}</span><button data-add="${escapeHtml(product.id)}" class="pb-mini-button" type="button">Add to box</button></div></div></article>`
}

function render(products) {
  const grid = document.getElementById('product-grid')
  grid.innerHTML = products.length ? products.map(card).join('') : '<div class="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No products match your search.</div>'
  grid.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => {
    const product = allProducts.find((item) => item.id === button.dataset.add)
    if (product) { addToCart(product); toast(`${product.name} added to cart.`, 'success') }
  }))
}

async function init() {
  await renderShell()
  allProducts = (await api('/api/products')).products
  const search = document.getElementById('search')
  const category = document.getElementById('category')
  category.value = new URLSearchParams(location.search).get('category') || ''
  const apply = () => {
    const q = search.value.trim().toLowerCase()
    render(allProducts.filter((product) => (!q || `${product.name} ${product.description}`.toLowerCase().includes(q)) && (!category.value || product.category === category.value)))
  }
  search.addEventListener('input', apply)
  category.addEventListener('change', () => {
    const url = new URL(location.href)
    if (category.value) url.searchParams.set('category', category.value)
    else url.searchParams.delete('category')
    history.replaceState(null, '', url)
    apply()
  })
  apply()
}

init().catch((error) => { document.getElementById('product-grid').innerHTML = `<p class="col-span-full text-red-600">${escapeHtml(error.message)}</p>` })
