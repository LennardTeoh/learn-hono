// Strict URL enforcement: completely ignores window.APP_CONFIG
const API_BASE = window.location.hostname.includes('pages.dev') 
  ? 'https://lumiere-api.p22014454.workers.dev' 
  : 'http://127.0.0.1:8787';

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
    error.code = data?.code
    throw error
  }

  return data
}

export async function getCurrentUser() {
  try {
    const data = await api('/api/auth/get-session', { method: 'GET' })
    
    if (!data || !data.user) {
      return null
    }
    return data.user
  } catch (error) {
    console.error("Session Check Failed:", error.message);
    return null
  }
}