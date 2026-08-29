import { api } from './api.js'
import { renderShell, setBusy, toast } from './ui.js'

function nextUrl(defaultValue = 'account.html') {
  const value = new URLSearchParams(location.search).get('next')
  return value && /^[a-z0-9-]+\.html(\?.*)?$/i.test(value) ? value : defaultValue
}

function getTurnstileToken(form) {
  const hidden = form.querySelector('[name="turnstileToken"]')
  return hidden?.value || ''
}

function initTurnstile(form) {
  const sitekey = window.APP_CONFIG?.TURNSTILE_SITE_KEY
  if (!sitekey || !window.turnstile) return
  const host = form.querySelector('[data-turnstile]')
  if (!host) return

  window.turnstile.render(host, {
    sitekey,
    callback: (token) => {
      const hidden = form.querySelector('[name="turnstileToken"]')
      if (hidden) hidden.value = token
    },
    'expired-callback': () => {
      const hidden = form.querySelector('[name="turnstileToken"]')
      if (hidden) hidden.value = ''
    }
  })
}

async function setup() {
  await renderShell()

  const register = document.getElementById('register-form')
  const login = document.getElementById('login-form')
  const forgot = document.getElementById('forgot-form')

  if (register) {
    initTurnstile(register)
    register.addEventListener('submit', async (event) => {
      event.preventDefault()
      const button = register.querySelector('button[type="submit"]')
      setBusy(button, true, 'Creating account…')
      try {
        const form = new FormData(register)
        await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            displayName: form.get('displayName'),
            email: form.get('email'),
            password: form.get('password'),
            turnstileToken: getTurnstileToken(register)
          })
        })
        location.href = `verify.html?email=${encodeURIComponent(String(form.get('email') || ''))}`
      } catch (error) {
        toast(error.message, 'error')
      } finally {
        setBusy(button, false)
      }
    })
  }

  if (login) {
    initTurnstile(login)
    login.addEventListener('submit', async (event) => {
      event.preventDefault()
      const button = login.querySelector('button[type="submit"]')
      setBusy(button, true, 'Signing in…')
      try {
        const form = new FormData(login)
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: form.get('email'),
            password: form.get('password'),
            turnstileToken: getTurnstileToken(login)
          })
        })
        location.href = nextUrl()
      } catch (error) {
        toast(error.message, 'error')
      } finally {
        setBusy(button, false)
      }
    })
  }

  if (forgot) {
    initTurnstile(forgot)
    forgot.addEventListener('submit', async (event) => {
      event.preventDefault()
      const button = forgot.querySelector('button[type="submit"]')
      setBusy(button, true, 'Sending…')
      try {
        const form = new FormData(forgot)
        const data = await api('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({
            email: form.get('email'),
            turnstileToken: getTurnstileToken(forgot)
          })
        })
        document.getElementById('forgot-status').textContent = data.message
        forgot.reset()
      } catch (error) {
        toast(error.message, 'error')
      } finally {
        setBusy(button, false)
      }
    })
  }
}

window.addEventListener('load', setup)
