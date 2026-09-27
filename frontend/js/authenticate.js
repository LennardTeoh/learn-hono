import { renderShell, setBusy } from './ui.js';

async function init() {
  await renderShell();

  const form = document.getElementById('auth-form');
  const successBox = document.getElementById('success-box');
  const serialInput = document.getElementById('serial-input');
  const displaySerial = document.getElementById('display-serial');
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const serialNumber = serialInput.value.trim().toUpperCase();
      if (!serialNumber) return;

      setBusy(submitBtn, true, 'VERIFYING...');
      successBox.classList.add('hidden');

      try {
          await new Promise(resolve => setTimeout(resolve, 1200));

          displaySerial.textContent = serialNumber;
          successBox.classList.remove('hidden');
          
      } catch (error) {
          console.error('Verification failed:', error);
      } finally {
          setBusy(submitBtn, false);
      }
  });
}

init().catch(console.error);