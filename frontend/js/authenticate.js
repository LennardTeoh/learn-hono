import { getCurrentUser } from './api.js'
import { renderShell, escapeHtml } from './ui.js'

// Ensure this matches your live Worker
const API_URL = 'https://lumiere-api.p22014454.workers.dev';

async function init() {
  await renderShell();

  // If a user is already logged in and navigates to the login page, redirect them immediately
  const user = await getCurrentUser();
  if (user) {
    window.location.href = user.email === 'admin@lumiere.com' ? '/admin/' : '/account/';
    return;
  }

  // Bind to your existing HTML login form
  const loginForm = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error'); // Optional: Add <div id="login-error"></div> to your login HTML

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Assumes your inputs have id="email" and id="password"
      const emailInput = document.getElementById('email').value.trim();
      const passwordInput = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (submitBtn) {
        submitBtn.textContent = 'AUTHENTICATING...';
        submitBtn.disabled = true;
      }

      if (errorDiv) errorDiv.innerHTML = '';

      try {
        const response = await fetch(`${API_URL}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: emailInput,
            password: passwordInput
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Invalid email or password.');
        }

        // --- THE ROUTING LOGIC ---
        // If the credentials match the master admin account, bypass the customer account page
        if (emailInput === 'admin@lumiere.com') {
          window.location.href = '/admin/';
        } else {
          window.location.href = '/account/';
        }

      } catch (error) {
        console.error('Login Error:', error);
        if (errorDiv) {
          errorDiv.innerHTML = `<div class="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-serif mb-4">${escapeHtml(error.message)}</div>`;
        } else {
          alert(`Login failed: ${error.message}`);
        }
        
        if (submitBtn) {
          submitBtn.textContent = 'SIGN IN'; // Reset button text on failure
          submitBtn.disabled = false;
        }
      }
    });
  }
}

init().catch(console.error);