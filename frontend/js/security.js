import { api, getCurrentUser } from './api.js';
import { renderShell, toast } from './ui.js';

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/security/';
    return;
  }

  // Handle password change
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true
        })
      });
      toast('Password updated successfully.', 'success');
      e.currentTarget.reset();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

init().catch(console.error);