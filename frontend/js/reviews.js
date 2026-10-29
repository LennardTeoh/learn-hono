import { renderShell, escapeHtml, toast } from './ui.js';
import { api, getCurrentUser } from './api.js'; // <-- Added getCurrentUser here

async function init() {
  await renderShell();
  
  // Fetch the actual logged-in user properly using your API
  const currentUser = await getCurrentUser();

  const reviewsList = document.getElementById('reviews-list');
  const reviewForm = document.getElementById('review-form');

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

      reviewsList.innerHTML = reviews.map(r => {
        let imagesHtml = '';
        if (r.image_url) {
          try {
            const urls = JSON.parse(r.image_url);
            if (Array.isArray(urls)) {
              imagesHtml = `<div class="flex flex-wrap gap-3 mb-4 mt-2">` + 
                urls.map(url => `<img src="${url}" alt="Review Photo" class="h-24 w-24 object-cover border border-slate-200 shadow-sm rounded">`).join('') + 
                `</div>`;
            }
          } catch(e) {
             imagesHtml = `<img src="${r.image_url}" alt="Review Photo" class="mb-4 mt-2 h-24 w-24 object-cover border border-slate-200 shadow-sm rounded">`;
          }
        }

        return `
        <div class="bg-white p-6 border border-slate-200 shadow-sm">
          <div class="flex justify-between items-start mb-3">
            <h4 class="font-serif font-semibold text-lg text-slate-900">${escapeHtml(r.title)}</h4>
            <span class="text-amber-500 text-lg tracking-widest">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          </div>
          <p class="text-slate-600 leading-relaxed">${escapeHtml(r.comment)}</p>
          ${imagesHtml}
          <div class="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex justify-between border-t border-slate-100 pt-3 mt-4">
            <span>Verified Collector: ${escapeHtml(r.user_name || 'Anonymous')}</span>
            <span>${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load reviews:', err);
      reviewsList.innerHTML = '<p class="text-red-500 text-center text-sm py-4">Unable to load reviews. Ensure backend is deployed.</p>';
    }
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Ensure the user is actually logged in and retrieve their ID safely
      if (!currentUser) {
        toast('Please log in to submit a review.', 'error');
        setTimeout(() => window.location.href = '/login/', 1500);
        return;
      }
      
      // Handle nested user object if better-auth returns { user: { id: ... } }
      const userId = currentUser.id || currentUser.user?.id;

      if (!userId) {
         toast('User ID not found. Please log in again.', 'error');
         return;
      }

      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      submitBtn.textContent = 'PUBLISHING...';
      submitBtn.disabled = true;

      const fileInput = document.getElementById('review-images');
      let base64Images = [];
      
      if (fileInput.files.length > 0) {
        for (const file of fileInput.files) {
          if (file.size > 2 * 1024 * 1024) { 
            toast(`Image ${file.name} is too large. Maximum size is 2MB per image.`, 'error');
            submitBtn.textContent = 'PUBLISH REVIEW';
            submitBtn.disabled = false;
            return;
          }
          const base64 = await getBase64(file);
          base64Images.push(base64);
        }
      }

      const payload = {
        userId: userId,
        rating: parseInt(document.getElementById('review-rating').value),
        title: document.getElementById('review-title').value,
        comment: document.getElementById('review-comment').value,
        imageUrls: base64Images
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