import { renderShell, setBusy } from './ui.js';

async function init() {
  // 1. This line is crucial! It loads your header and footer onto the page.
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

      // 2. Trigger your existing UI loading state
      setBusy(submitBtn, true, 'VERIFYING...');
      successBox.style.display = 'none';

      try {
          // 3. Simulate API database check (1.2 seconds)
          await new Promise(resolve => setTimeout(resolve, 1200));

          // 4. Populate and reveal success box
          displaySerial.textContent = serialNumber;
          successBox.style.display = 'block';
          
      } catch (error) {
          console.error('Verification failed:', error);
      } finally {
          // 5. Restore button
          setBusy(submitBtn, false);
      }
  });
}

// Boot up the page
init().catch(console.error);