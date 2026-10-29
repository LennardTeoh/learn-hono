import { renderShell, escapeHtml, toast } from './ui.js';
import { api } from './api.js';

async function init() {
  await renderShell();

  const reviewsList = document.getElementById('reviews-list');
  const reviewForm = document.getElementById('review-form');

  // Convert image file to Base64 string
  function getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  async function loadReviews() {
    try {
      const reviews = await api('/api/reviews', { method: 'GET' });

      if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = '<p class="text-slate-500 text-center bg-white p-8 border border-slate-200 shadow-sm">No reviews yet. Be the first to share your thoughts!</p>';
        return;
      }

      reviewsList.innerHTML = reviews.map(r => `
        <div class="bg-white p-6 border border-slate-200 shadow-sm">
          <div class="flex justify-between items-start mb-3">
            <h4 class="font-serif font-semibold text-lg text-slate-900">${escapeHtml(r.title)}</h4>
            <span class="text-amber-500 text-lg tracking-widest">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          </div>
          <p class="text-slate-600 leading-relaxed mb-4">${escapeHtml(r.comment)}</p>
          ${r.image_url ? `<img src="${r.image_url}" alt="Review Image" class="mb-4 max-h-64 object-cover border border-slate-200 shadow-sm">` : ''}
          <div class="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex justify-between border-t border-slate-100 pt-3 mt-3">
            <span>Verified Collector: ${escapeHtml(r.user_name || 'Anonymous')}</span>
            <span>${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load reviews:', err);
      reviewsList.innerHTML = '<p class="text-red-500 text-center text-sm py-4">Unable to load reviews. Ensure backend is deployed.</p>';
    }
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const sessionData = JSON.parse(localStorage.getItem('better-auth_session') || '{}');
      const userId = sessionData?.user?.id;

      if (!userId) {
        toast('Please log in to submit a review.', 'error');
        setTimeout(() => window.location.href = '/login/', 1500);
        return;
      }

      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      submitBtn.textContent = 'PUBLISHING...';
      submitBtn.disabled = true;

      // Handle the image file
      const fileInput = document.getElementById('review-image');
      let base64Image = null;
      
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) { // 2MB size limit
          toast('Image is too large. Maximum size is 2MB.', 'error');
          submitBtn.textContent = 'PUBLISH REVIEW';
          submitBtn.disabled = false;
          return;
        }
        base64Image = await getBase64(file);
      }

      const payload = {
        userId: userId,
        rating: parseInt(document.getElementById('review-rating').value),
        title: document.getElementById('review-title').value,
        comment: document.getElementById('review-comment').value,
        imageUrl: base64Image
      };

      try {
        await api('/api/reviews', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        
        reviewForm.reset();
        toast('Review published successfully!', 'success');
        loadReviews();
      } catch (err) {
        console.error('Error submitting review:', err);
        toast('Failed to publish review.', 'error');
      } finally {
        submitBtn.textContent = 'PUBLISH REVIEW';
        submitBtn.disabled = false;
      }
    });
  }

  loadReviews();
}

init().catch(console.error);