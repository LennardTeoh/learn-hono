// Assuming you have an api.js or authClient setup. 
// If using standard fetch, adjust the endpoints as needed.
import { authClient } from './api.js'; 

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const twoFactorForm = document.getElementById('two-factor-form'); // The form from your screenshot
  
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const otpInput = document.getElementById('otp-code'); // The 6-digit input

  // --- STEP 1: HANDLE INITIAL LOGIN ---
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const { data, error } = await authClient.signIn.email({
          email: emailInput.value,
          password: passwordInput.value,
        });

        if (error) throw new Error(error.message);

        // If the backend requires 2FA, it pauses login and flags this true
        if (data?.twoFactorRedirect) {
          
          // CRITICAL: Explicitly tell Better Auth to trigger the Brevo email
          await authClient.twoFactor.sendOtp();
          
          // Hide login form, show your 6-digit PIN screen
          loginForm.classList.add('hidden');
          twoFactorForm.classList.remove('hidden');
          return;
        }

        // If no 2FA is required, redirect straight to admin
        window.location.replace('/admin/');

      } catch (err) {
        alert(err.message || 'Login failed.');
      }
    });
  }

  // --- STEP 2: HANDLE 6-DIGIT OTP SUBMISSION ---
  if (twoFactorForm) {
    twoFactorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const { data, error } = await authClient.twoFactor.verifyOtp({
          code: otpInput.value.trim()
        });

        if (error) throw new Error('Invalid or expired code.');

        // Authentication complete! Send them to the dashboard.
        window.location.replace('/admin/');

      } catch (err) {
        alert(err.message);
      }
    });
  }
});