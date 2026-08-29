import { api } from './api.js'
import { renderShell, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  const form = document.getElementById('resend-form')
  const fromQuery = new URLSearchParams(location.search).get('email')
  if (fromQuery) form.email.value = fromQuery

  const sitekey = window.APP_CONFIG?.TURNSTILE_SITE_KEY
  if (sitekey && window.turnstile) {
    window.turnstile.render(form.querySelector('[data-turnstile]'), {
      sitekey,
      callback: (token) => { form.turnstileToken.value = token },
      'expired-callback': () => { form.turnstileToken.value = '' }
    })
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const button = form.querySelector('button[type="submit"]')
    setBusy(button, true, 'Sending…')
    try {
      const data = await api('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.value, turnstileToken: form.turnstileToken.value })
      })
      document.getElementById('resend-status').textContent = data.message
    } catch (error) {
      toast(error.message, 'error')
    } finally {
      setBusy(button, false)
    }
  })
}

window.addEventListener('load', init)
