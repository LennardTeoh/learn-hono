import { api } from './api.js'
import { addToCart } from './cart-store.js'
import { imageForProduct } from './product-images.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

let allProducts = []

function card(product) {
  return `<article class="pb-product-card"><a href="/product/?id=${encodeURIComponent(product.id)}" class="pb-product-image"><img src="${escapeHtml(imageForProduct(product))}" alt="${escapeHtml(product.name)}" loading="lazy"></a><div class="pb-product-copy"><div class="pb-product-meta"><span>${escapeHtml(product.category)}</span><span>${product.stock} left</span></div><a href="/product/?id=${encodeURIComponent(product.id)}"><h2>${escapeHtml(product.name)}</h2></a><p>${escapeHtml(product.description)}</p><div class="pb-product-bottom"><span class="pb-price">${money(product.price_cents)}</span><button data-add="${escapeHtml(product.id)}" class="pb-mini-button" type="button">Add to box</button></div></div></article>`
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
  const sortSelect = document.getElementById('sort')
  const pills = document.querySelectorAll('.category-pill')
  
  let currentCategory = new URLSearchParams(location.search).get('category') || ''
  
  const apply = () => {
    const q = search.value.trim().toLowerCase()
    const sortValue = sortSelect ? sortSelect.value : 'featured'

    let filtered = allProducts.filter((product) => 
      (!q || `${product.name} ${product.description}`.toLowerCase().includes(q)) && 
      (!currentCategory || product.category === currentCategory)
    )

    if (sortValue === 'az') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortValue === 'za') {
      filtered.sort((a, b) => b.name.localeCompare(a.name))
    } else if (sortValue === 'price-asc') {
      filtered.sort((a, b) => a.price_cents - b.price_cents)
    } else if (sortValue === 'price-desc') {
      filtered.sort((a, b) => b.price_cents - a.price_cents)
    }

    render(filtered)
  }

  // Handle category pill clicks
  pills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      currentCategory = e.target.dataset.category
      
      // Update visual styles: remove dark from all, add light
      pills.forEach(p => {
        p.classList.remove('bg-slate-900', 'text-white', 'border-slate-900')
        p.classList.add('bg-transparent', 'text-slate-700', 'border-slate-300')
      })
      
      // Apply dark style to clicked pill
      e.target.classList.remove('bg-transparent', 'text-slate-700', 'border-slate-300')
      e.target.classList.add('bg-slate-900', 'text-white', 'border-slate-900')

      // Update URL silently
      const url = new URL(location.href)
      if (currentCategory) url.searchParams.set('category', currentCategory)
      else url.searchParams.delete('category')
      history.replaceState(null, '', url)

      apply()
    })
  })

  // Set initial pill state if URL has a category parameter
  if (currentCategory) {
    const activePill = Array.from(pills).find(p => p.dataset.category === currentCategory)
    if (activePill) activePill.click()
  }

  search.addEventListener('input', apply)
  if (sortSelect) sortSelect.addEventListener('change', apply)
  
  apply()
}

init().catch((error) => { document.getElementById('product-grid').innerHTML = `<p class="col-span-full text-red-600">${escapeHtml(error.message)}</p>` })