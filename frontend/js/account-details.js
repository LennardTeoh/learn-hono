import { api, getCurrentUser } from './api.js';
import { renderShell, escapeHtml, toast } from './ui.js';

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/details/';
    return;
  }

  // Populate form fields with current user data
  document.getElementById('account-name').value = user.name || '';
  document.getElementById('account-email').value = user.email || '';
  document.getElementById('account-address').value = user.address || '';

  // Handle profile updates
  document.getElementById('details-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button');
    btn.disabled = true;

    try {
      const formData = new FormData(e.currentTarget);
      await api('/api/auth/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          address: formData.get('address'),
          notification: formData.get('notification')
        })
      });
      toast('Account details updated successfully.', 'success');
    } catch (err) {
      toast('Failed to update: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

init().catch(console.error);