import { renderShell, toast, setBusy } from './ui.js';
import { getCurrentUser } from './api.js';

async function init() {
  await renderShell();

  const currentUser = await getCurrentUser();
  const user = currentUser?.user || currentUser;

  const nameInput = document.getElementById('care-name');
  const emailInput = document.getElementById('care-email');
  const dateInput = document.getElementById('care-date');

  if (user) {
    if (nameInput && user.name) nameInput.value = user.name;
    if (emailInput && user.email) emailInput.value = user.email;
  }

  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }

  const form = document.getElementById('care-booking-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      setBusy(submitBtn, true, 'BOOKING APPOINTMENT...');

      await new Promise((resolve) => setTimeout(resolve, 800));
      const refCode = 'CARE-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const division = document.getElementById('care-division').value;

      toast(`Appointment Confirmed (${refCode}) for ${division}. We will email your confirmation shortly.`, 'success');
      form.reset();

      if (user) {
        if (nameInput && user.name) nameInput.value = user.name;
        if (emailInput && user.email) emailInput.value = user.email;
      }

      setBusy(submitBtn, false);
    });
  }
}

init().catch(console.error);