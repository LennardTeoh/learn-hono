import { renderShell, toast, setBusy } from './ui.js';
import { getCurrentUser } from './api.js';

async function init() {
  // 1. Inject the global LUMIÈRE Header and Footer
  await renderShell();

  // 2. Pre-fill collector details if logged in
  const currentUser = await getCurrentUser();
  const user = currentUser?.user || currentUser;

  const nameInput = document.getElementById('care-name');
  const emailInput = document.getElementById('care-email');
  const dateInput = document.getElementById('care-date');

  if (user) {
    if (nameInput && user.name) nameInput.value = user.name;
    if (emailInput && user.email) emailInput.value = user.email;
  }

  // Set minimum appointment date to tomorrow
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }

  // 3. Handle Private Salon Consultation Submission
  const form = document.getElementById('care-booking-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      setBusy(submitBtn, true, 'ARRANGING PRIVATE INVITATION...');

      // Simulate concierge registration & generate bespoke dossier code
      await new Promise((resolve) => setTimeout(resolve, 900));
      const refCode = 'PRIVÉ-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const division = document.getElementById('care-division').value;

      toast(`Private Invitation Registered (${refCode}) for ${division}. Our Directrice de Clientèle will contact you shortly.`, 'success');
      form.reset();

      // Restore collector's name/email after reset
      if (user) {
        if (nameInput && user.name) nameInput.value = user.name;
        if (emailInput && user.email) emailInput.value = user.email;
      }

      setBusy(submitBtn, false);
    });
  }
}

init().catch(console.error);