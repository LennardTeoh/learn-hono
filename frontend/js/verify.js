import { api } from './api.js'
import { escapeHtml, renderShell } from './ui.js'

async function init() {
  await renderShell()
  const token = new URLSearchParams(location.search).get('token')
  const email = new URLSearchParams(location.search).get('email')
  const host = document.getElementById('verify-status')

  if (!token) {
    host.innerHTML = `<h1 class="text-3xl font-black">Check your inbox</h1><p class="mt-3 text-slate-500">We sent a verification link${email ? ` to <strong>${escapeHtml(email)}</strong>` : ''}. Open it to activate your account.</p><div class="mt-6 flex justify-center gap-3"><a href="login.html" class="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">Back to sign in</a><a href="resend-verification.html${email ? `?email=${encodeURIComponent(email)}` : ''}" class="rounded-xl border border-slate-300 px-5 py-3 font-semibold">Resend</a></div>`
    return
  }

  host.innerHTML = '<p class="text-slate-500">Verifying your email…</p>'
  try {
    const data = await api('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    })
    host.innerHTML = `<div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-2xl text-white">✓</div><h1 class="mt-5 text-3xl font-black">Email verified</h1><p class="mt-3 text-slate-500">${escapeHtml(data.message)}</p><a href="login.html" class="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">Sign in</a>`
  } catch (error) {
    host.innerHTML = `<h1 class="text-3xl font-black text-red-700">Verification failed</h1><p class="mt-3 text-slate-500">${escapeHtml(error.message)}</p><a href="register.html" class="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">Create account</a>`
  }
}

init()
