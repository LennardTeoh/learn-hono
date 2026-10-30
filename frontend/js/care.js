import { renderShell, toast, setBusy, money } from './ui.js';
import { getCurrentUser } from './api.js';

async function init() {
  await renderShell();

  const currentUser = await getCurrentUser();
  const user = currentUser?.user || currentUser;

  const nameInput = document.getElementById('care-name');
  const emailInput = document.getElementById('care-email');
  const dateInput = document.getElementById('care-date');
  const divisionSelect = document.getElementById('care-division');
  const notesInput = document.getElementById('care-notes');

  if (user) {
    if (nameInput && user.name) nameInput.value = user.name;
    if (emailInput && user.email) emailInput.value = user.email;
  }

  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }

  // Interactive Selection State
  const selectedServices = new Set();
  const countBadge = document.getElementById('selected-count-badge');
  const previewBox = document.getElementById('selected-services-preview');

  function updatePreview() {
    if (selectedServices.size > 0) {
      previewBox.classList.remove('hidden');
      countBadge.textContent = `${selectedServices.size} Service${selectedServices.size > 1 ? 's' : ''} Selected`;
      
      let tagsHtml = '<span class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mr-2">Selected:</span>';
      selectedServices.forEach(serviceName => {
        tagsHtml += `<span class="bg-slate-900 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 inline-flex items-center gap-1">${escapeHtml(serviceName)}</span>`;
      });
      previewBox.innerHTML = tagsHtml;
    } else {
      previewBox.classList.add('hidden');
      countBadge.textContent = '0 Services Selected';
    }
  }

  // Handle clicking on service items in the cards
  document.querySelectorAll('[data-service-item]').forEach(itemLi => {
    itemLi.addEventListener('click', (e) => {
      // Prevent double toggle if clicking directly on checkbox
      const checkbox = itemLi.querySelector('input[type="checkbox"]');
      const serviceName = itemLi.getAttribute('data-service-item');
      const parentCard = itemLi.closest('[data-service-card]');
      const categoryName = parentCard ? parentCard.getAttribute('data-service-card') : '';

      if (selectedServices.has(serviceName)) {
        selectedServices.delete(serviceName);
        checkbox.checked = false;
        itemLi.classList.remove('bg-amber-50/50', 'border-l-4', 'border-amber-600');
      } else {
        selectedServices.add(serviceName);
        checkbox.checked = true;
        itemLi.classList.add('bg-amber-50/50', 'border-l-4', 'border-amber-600');

        // Automatically switch the dropdown category to match the clicked item
        if (divisionSelect && categoryName) {
          divisionSelect.value = categoryName;
        }
      }

      updatePreview();

      // Smooth scroll down to booking form
      document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Handle Form Submission
  const form = document.getElementById('care-booking-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      setBusy(submitBtn, true, 'BOOKING APPOINTMENT...');

      await new Promise((resolve) => setTimeout(resolve, 800));
      const refCode = 'CARE-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const division = divisionSelect.value;
      const extraNotes = notesInput.value.trim();
      const servicesList = selectedServices.size > 0 ? Array.from(selectedServices).join(', ') : 'Standard Consultation';

      toast(`Appointment Confirmed (${refCode}) for ${division} [${servicesList}]. We will email your confirmation shortly.`, 'success');
      form.reset();
      selectedServices.clear();
      document.querySelectorAll('[data-service-item]').forEach(li => {
        li.querySelector('input').checked = false;
        li.classList.remove('bg-amber-50/50', 'border-l-4', 'border-amber-600');
      });
      updatePreview();

      if (user) {
        if (nameInput && user.name) nameInput.value = user.name;
        if (emailInput && user.email) emailInput.value = user.email;
      }

      setBusy(submitBtn, false);
    });
  }
}

init().catch(console.error);