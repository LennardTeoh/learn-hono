const CART_KEY = 'nimble_cart_v1'
import { imageForProduct } from './product-images.js'

export function getCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('nimble:cart-changed'))
}

export function addToCart(product, quantity = 1) {
  const items = getCart()
  const existing = items.find((item) => item.productId === product.id)
  if (existing) {
    existing.quantity = Math.min(10, existing.quantity + quantity)
  } else {
    items.push({
      productId: product.id,
      name: product.name,
      priceCents: product.price_cents,
      imageUrl: imageForProduct(product),
      quantity: Math.min(10, Math.max(1, quantity))
    })
  }
  saveCart(items)
}

export function updateQuantity(productId, quantity) {
  const items = getCart()
  const item = items.find((entry) => entry.productId === productId)
  if (!item) return
  item.quantity = Math.min(10, Math.max(1, Number(quantity) || 1))
  saveCart(items)
}

export function removeFromCart(productId) {
  saveCart(getCart().filter((item) => item.productId !== productId))
}

export function clearCart() {
  saveCart([])
}

export function cartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0)
}

export function cartSubtotal() {
  return getCart().reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
}
