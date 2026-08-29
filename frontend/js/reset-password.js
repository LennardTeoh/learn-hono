import { api } from './api.js'
import { renderShell, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  const token = new URLSearchParams(location.search).get('token')
  const form = document.getElementById('reset-form')
  if (!token) {
    form.innerHTML = '<p class="text-red-600">Reset token is missing.</p>'
    return
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const button = form.querySelector('button[type="submit"]')
    const password = form.password.value
    const confirm = form.confirmPassword.value
    if (password !== confirm) {
      toast('Passwords do not match.', 'error')
      return
    }
    setBusy(button, true, 'Updating…')
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      })
      location.href = 'login.html'
    } catch (error) {
      toast(error.message, 'error')
    } finally {
      setBusy(button, false)
    }
  })
}

init()
