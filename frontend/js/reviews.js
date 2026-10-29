document.addEventListener('DOMContentLoaded', () => {
  const reviewsList = document.getElementById('reviews-list');
  const reviewForm = document.getElementById('review-form');
  // Use your existing API URL from the previous logs
  const API_BASE = 'https://lumiere-api.p22014454.workers.dev/api/reviews';

  async function loadReviews() {
    try {
      const response = await fetch(API_BASE);
      const reviews = await response.json();

      if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = '<p class="text-gray-500 text-center bg-white p-8 rounded-xl border border-gray-200">No reviews yet. Be the first!</p>';
        return;
      }

      reviewsList.innerHTML = reviews.map(r => `
        <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex justify-between items-start mb-3">
            <h4 class="font-serif font-semibold text-lg text-gray-900">${escapeHtml(r.title)}</h4>
            <span class="text-amber-500 text-lg tracking-widest">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          </div>
          <p class="text-gray-600 leading-relaxed mb-4">${escapeHtml(r.comment)}</p>
          <div class="text-xs text-gray-400 flex justify-between border-t border-gray-100 pt-3">
            <span class="font-medium text-gray-700">Verified Collector: ${escapeHtml(r.user_name || 'Anonymous')}</span>
            <span>${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load reviews:', err);
      reviewsList.innerHTML = '<p class="text-red-500 text-center">Unable to load reviews.</p>';
    }
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const sessionData = JSON.parse(localStorage.getItem('better-auth_session') || '{}');
      const userId = sessionData?.user?.id;

      if (!userId) {
        alert('Please log in to submit a review.');
        window.location.href = '/login';
        return;
      }

      const payload = {
        userId: userId,
        rating: parseInt(document.getElementById('review-rating').value),
        title: document.getElementById('review-title').value,
        comment: document.getElementById('review-comment').value
      };

      try {
        const res = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          reviewForm.reset();
          loadReviews();
          alert('Review published successfully!');
        } else {
          alert('Failed to publish review.');
        }
      } catch (err) {
        console.error('Error submitting review:', err);
      }
    });
  }

  loadReviews();
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}