import { api } from './api.js'
import { renderShell, setBusy, toast } from './ui.js'

const state = document.body.dataset.authState || new URLSearchParams(location.search).get('state') || 'signin'
const next = ['/account/', '/checkout/'].includes(new URLSearchParams(location.search).get('next')) ? new URLSearchParams(location.search).get('next') : '/account/'
const root = document.getElementById('auth-root')
const form = (title, fields, button, links = '') => `<h1 class="text-3xl font-black">${title}</h1><form class="mt-6 space-y-4">${fields}<button class="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">${button}</button></form>${links}`
const email = '<label class="block"><span class="text-sm font-medium">Email</span><input name="email" type="email" required autocomplete="email" class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"></label>'
const password = '<label class="block"><span class="text-sm font-medium">Password</span><input name="password" type="password" required minlength="12" maxlength="128" autocomplete="current-password" class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"></label>'
const authRoute = (value) => ({ signin: '/login/', signup: '/register/', forgot: '/forgot-password/', resend: '/resend-verification/', reset: '/reset-password/', verified: '/verify/', sent: '/verification/' }[value])
function go(value) { location.href = `${authRoute(value)}${value === 'signin' ? `?next=${encodeURIComponent(next)}` : ''}` }

await renderShell()
if (state === 'verified') root.innerHTML = '<h1 class="text-3xl font-black">Email verified</h1><p class="mt-3 text-slate-500">Your PetitBakery account is ready.</p><a class="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white" href="/login/">Sign in</a>'
else if (state === 'sent') root.innerHTML = '<h1 class="text-3xl font-black">Check your inbox</h1><p class="mt-3 text-slate-500">We sent a verification link. Once confirmed, return here to sign in.</p><a class="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white" href="/login/">Sign in</a>'
else if (state === 'signup') root.innerHTML = form('Create your account', '<label class="block"><span class="text-sm font-medium">Name</span><input name="name" required minlength="2" maxlength="60" autocomplete="name" class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"></label>' + email + password.replace('current-password', 'new-password'), 'Create account', '<p class="mt-5 text-center text-sm">Already registered? <a class="underline" href="/login/">Sign in</a></p>')
else if (state === 'forgot') root.innerHTML = form('Reset your password', email, 'Send reset link', '<p class="mt-5 text-center text-sm"><a class="underline" href="/login/">Back to sign in</a></p>')
else if (state === 'reset') root.innerHTML = form('Choose a new password', password.replace('current-password', 'new-password'), 'Update password')
else if (state === 'resend') root.innerHTML = form('Resend verification', email, 'Send verification link')
else root.innerHTML = form('Welcome back', email + password, 'Sign in', '<div class="mt-5 flex justify-between text-sm"><a class="underline" href="/register/">Create account</a><a class="underline" href="/forgot-password/">Forgot password?</a></div><p class="mt-4 text-center text-xs"><a class="underline" href="/resend-verification/">Need a verification link?</a></p>')
if (!['verified', 'sent'].includes(state)) {
  root.querySelector('form').addEventListener('submit', async event => { event.preventDefault(); const button = root.querySelector('button'); setBusy(button, true); const data = Object.fromEntries(new FormData(event.currentTarget)); try {
    if (state === 'signup') { await api('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ ...data, callbackURL: '/verify/' }) }); go('sent') }
    else if (state === 'forgot') { await api('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email: data.email, redirectTo: '/reset-password/' }) }); root.innerHTML = '<h1 class="text-3xl font-black">Check your inbox</h1><p class="mt-3 text-slate-500">If that address has an account, a reset link is on its way.</p>' }
    else if (state === 'reset') { await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: new URLSearchParams(location.search).get('token'), newPassword: data.password }) }); go('signin') }
    else if (state === 'resend') { await api('/api/auth/send-verification-email', { method: 'POST', body: JSON.stringify({ email: data.email, callbackURL: '/verify/' }) }); go('sent') }
    else { await api('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email: data.email, password: data.password }) }); location.href = next }
  } catch (error) { toast(error.message, 'error') } finally { setBusy(button, false) } })
}
