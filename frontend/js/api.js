const cfg = window.APP_CONFIG || {}
const API_BASE = String(cfg.API_BASE || '').replace(/\/$/, '')

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })

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
