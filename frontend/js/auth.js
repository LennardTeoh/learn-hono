import { api } from './api.js'
import { renderShell, setBusy, toast } from './ui.js'

const state = document.body.dataset.authState || new URLSearchParams(location.search).get('state') || 'signin'
const root = document.getElementById('auth-root')

const form = (title, subtitle, fields, button, links = '') => `
  <div class="text-center mb-10">
    <p class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">${subtitle}</p>
    <h1 class="text-4xl font-serif text-slate-900">${title}</h1>
  </div>
  <form class="space-y-6 text-left">
    ${fields}
    <button class="w-full lumiere-btn mt-4">${button}</button>
  </form>
  <div class="mt-8 text-center text-xs text-slate-500">${links}</div>
`;

const email = `<div><label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Email</label><input name="email" type="email" required placeholder="Enter your email" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white"></div>`
const password = `<div><label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Password</label><input name="password" type="password" required minlength="12" maxlength="128" placeholder="Enter your password" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white"></div>`

function go(value) { 
  location.href = `${{ signin: '/login/', signup: '/register/', forgot: '/forgot-password/', resend: '/resend-verification/', reset: '/reset-password/', verified: '/verify/', sent: '/verification/' }[value]}` 
}

await renderShell()
root.className = "bg-white border border-slate-200 p-10 sm:p-14 w-full max-w-lg mx-auto";

if (state === 'verified') root.innerHTML = '<h1 class="text-4xl font-serif text-slate-900 text-center">Email verified</h1><p class="mt-4 text-slate-500 text-center">Your LUMIÈRE account is ready.</p><a class="mt-8 block w-full lumiere-btn text-center" href="/login/">Log In</a>'
else if (state === 'sent') root.innerHTML = '<h1 class="text-4xl font-serif text-slate-900 text-center">Check your inbox</h1><p class="mt-4 text-slate-500 text-center">We sent a verification link. Once confirmed, return here.</p><a class="mt-8 block w-full lumiere-btn text-center" href="/login/">Log In</a>'
else if (state === 'signup') root.innerHTML = form('Create Account', 'Welcome', `<div><label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Full Name</label><input name="name" required minlength="2" maxlength="60" placeholder="Enter your name" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white"></div>` + email + password, 'Sign Up', `Already have an account? <a class="underline text-slate-900 hover:text-slate-500" href="/login/">Log in</a>`)
else if (state === 'forgot') root.innerHTML = form('Reset Password', 'Recovery', email, 'Send reset link', `<a class="underline text-slate-900 hover:text-slate-500" href="/login/">Back to Log In</a>`)
else root.innerHTML = form('Log In', 'Welcome Back', email + password, 'Log In', `New to Lumière? <a class="underline text-slate-900 hover:text-slate-500" href="/register/">Create an account</a><br><br><a class="text-slate-400 hover:text-slate-900" href="/forgot-password/">Forgot password?</a>`)

if (!['verified', 'sent'].includes(state)) {
  root.querySelector('form').addEventListener('submit', async event => { 
    event.preventDefault(); 
    const button = root.querySelector('button'); 
    setBusy(button, true); 
    const data = Object.fromEntries(new FormData(event.currentTarget)); 
    try {
      if (state === 'signup') { 
        await api('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ ...data, callbackURL: '/verify/' }) }); 
        go('sent'); 
      }
      else if (state === 'forgot') { 
        await api('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email: data.email, redirectTo: '/reset-password/' }) }); 
        root.innerHTML = '<h1 class="text-4xl font-serif text-slate-900 text-center">Check your inbox</h1><p class="mt-4 text-slate-500 text-center">If that address has an account, a reset link is on its way.</p>'; 
      }
      else { 
        // 1. Execute initial sign-in request
        const response = await api('/api/auth/sign-in/email', { 
          method: 'POST', 
          body: JSON.stringify({ email: data.email, password: data.password }) 
        });
        
        // 2. Intercept Better Auth's Two-Factor requirement
        if (response && response.twoFactorRedirect) {
          root.innerHTML = form(
            'Two-Factor Authentication', 
            'Security Check', 
            `<div>
               <label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">6-Digit Code</label>
               <input name="otp" type="text" required pattern="[a-zA-Z0-9]{6}" placeholder="Enter the code sent to your email" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white">
             </div>`, 
            'Verify & Log In'
          );
          
          // 3. Handle the OTP submission
          root.querySelector('form').addEventListener('submit', async otpEvent => {
            otpEvent.preventDefault();
            const otpButton = root.querySelector('button');
            setBusy(otpButton, true);
            const otpData = Object.fromEntries(new FormData(otpEvent.currentTarget));
            
            try {
              // Send the OTP back to Better Auth for final verification
              await api('/api/auth/two-factor/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ code: otpData.otp })
              });
              
              // Direct successful admins to their dashboard, regular users to the home page
              const userEmail = String(data.email).trim().toLowerCase();
window.location.replace(userEmail === 'lumiere.csproject@gmail.com' ? '/admin/' : '/');
            } catch (error) {
              toast(error.message, 'error');
              setBusy(otpButton, false);
            }
          });
        } else {
          // If no 2FA is required, redirect immediately based on email
          const userEmail = String(data.email).trim().toLowerCase();
window.location.replace(userEmail === 'lumiere.csproject@gmail.com' ? '/admin/' : '/');
        }
      }
    } catch (error) { 
      toast(error.message, 'error'); 
      setBusy(button, false); 
    } 
  })
}