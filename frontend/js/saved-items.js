import { api, getCurrentUser } from './api.js';
import { renderShell, money, escapeHtml } from './ui.js';

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/saved/';
    return;
  }

  const root = document.getElementById('wishlist-root');

  try {
    // Fetch saved wishlist items from backend (or fallback to localStorage)
    let savedItems = [];
    try {
      const res = await api('/api/user/wishlist');
      savedItems = res.items || [];
    } catch (e) {
      // LocalStorage fallback for wishlist prototyping
      const localWishlist = JSON.parse(localStorage.getItem('lumiere_wishlist') || '[]');
      savedItems = localWishlist;
    }

    if (!savedItems.length) {
      root.innerHTML = `
        <div class="bg-white p-8 border border-slate-200 text-center col-span-full py-16">
          <p class="text-slate-500 text-sm font-serif mb-4">Your saved wishlist is currently empty.</p>
          <a href="/the-collection/" class="lumiere-btn-outline inline-block">Explore Collection</a>
        </div>
      `;
      return;
    }

    root.innerHTML = savedItems.map(item => `
      <div class="bg-white p-6 border border-slate-200 flex gap-4 items-center">
        <div class="w-20 h-20 bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0">
          <img src="${escapeHtml(item.imageUrl || '')}" alt="" class="w-full h-full object-contain">
        </div>
        <div class="flex-1">
          <h3 class="font-serif text-base text-slate-900">${escapeHtml(item.name)}</h3>
          <p class="text-xs lumiere-gold font-bold mt-1">${money(item.price_cents || 0)}</p>
        </div>
        <a href="/product/?id=${item.id}" class="lumiere-btn-outline !py-2 !px-3 !text-[9px]">View</a>
      </div>
    `).join('');

  } catch (err) {
    root.innerHTML = `<p class="text-red-600 text-sm">Failed to load saved items.</p>`;
  }
}

init().catch(console.error);