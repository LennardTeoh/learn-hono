const cfg = window.APP_CONFIG || {}
const API_BASE = String(cfg.API_BASE || '').replace(/\/$/, '')

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const csrf = sessionStorage.getItem('nimble_csrf')
  if (csrf && !['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', csrf)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })

  let data = null
  try { data = await response.json() } catch { data = null }

  if (data?.csrfToken) sessionStorage.setItem('nimble_csrf', data.csrfToken)
  if (response.status === 401) sessionStorage.removeItem('nimble_csrf')

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

export async function getCurrentUser() {
  try {
    const data = await api('/api/auth/me')
    return data.user
  } catch {
    return null
  }
}
