import { fallbackProducts } from './catalog-fallback.js'

const cfg = window.APP_CONFIG || {}
const API_BASE = String(cfg.API_BASE || '').replace(/\/$/, '')

function localFallback(path) {
  if (path === '/api/products') return { products: fallbackProducts }
  const match = path.match(/^\/api\/products\/([^/]+)$/)
  const product = match && fallbackProducts.find((item) => item.id === decodeURIComponent(match[1]))
  return product ? { product } : null
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include'
    })
  } catch (error) {
    const fallback = localFallback(path)
    if (fallback && (!options.method || options.method === 'GET')) return fallback
    throw error
  }

  let data = null
  try { data = await response.json() } catch { data = null }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

export async function getCurrentUser() {
  try {
    const data = await api('/api/auth/get-session')
    return data?.user || null
  } catch {
    return null
  }
}
