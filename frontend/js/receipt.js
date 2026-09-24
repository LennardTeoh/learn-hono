import { api, getCurrentUser } from './api.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

async function init() {
  await renderShell()
  
  const user = await getCurrentUser()
  if (!user) {
    location.href = '/login/?next=' + encodeURIComponent(location.pathname + location.search)
    return
  }

  const params = new URLSearchParams(window.location.search)
  const orderId = params.get('id')

  if (!orderId) {
    document.getElementById('receipt-items').innerHTML = '<p class="text-red-500 text-center py-10">No order ID specified.</p>'
    document.getElementById('receipt-date').textContent = 'Error'
    return
  }

  try {
    let order, items;
    
    try {
        const response = await api(`/api/orders/${orderId}`);
        order = response.order || response;
        items = response.items || order.items || order.order_items || [];
    } catch (e) {
        const listResponse = await api('/api/orders');
        const ordersList = listResponse.orders || listResponse || [];
        order = ordersList.find(o => o.id === orderId);
        items = order?.items || order?.order_items || [];
    }

    if (!order) {
      document.getElementById('receipt-items').innerHTML = '<p class="text-slate-500 text-center py-10">Order not found.</p>'
      document.getElementById('receipt-date').textContent = 'Unknown'
      return
    }

    document.getElementById('receipt-id').textContent = escapeHtml(order.id)
    document.getElementById('receipt-date').textContent = new Date((order.created_at || order.createdAt) * 1000).toLocaleDateString()
    document.getElementById('receipt-status').textContent = escapeHtml(order.status || 'CONFIRMED')
    document.getElementById('receipt-total').textContent = money(order.total_cents || order.totalCents)

    const itemsContainer = document.getElementById('receipt-items')

    if (items && items.length > 0) {
      itemsContainer.innerHTML = items.map(item => {
        // Map exact properties from your backend console output
        const itemPrice = item.unit_price_cents || item.price_cents || item.price || 0;
        const itemQty = item.quantity || 1;
        const itemName = item.product_name || item.name || 'Curated Item';
        
        // Derive image path using product_id (e.g., prod_apm_meteorites -> apm-meteorites)
        let itemImage = item.image_url || item.imageUrl || item.image;
        if (!itemImage && item.product_id) {
            const cleanSlug = item.product_id.replace('prod_', '').replace(/_/g, '-');
            itemImage = `/assets/images/products/${cleanSlug}.png`;
        }

        return `
        <div class="flex justify-between items-center pb-6 border-b border-slate-100 last:border-0 last:pb-0">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              ${itemImage 
                ? `<img src="${escapeHtml(itemImage)}" class="w-full h-full object-contain p-1" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` 
                : ``}
              <span class="text-[10px] text-slate-400 font-medium ${itemImage ? 'hidden' : ''}">IMG</span>
            </div>
            <div>
              <p class="font-bold text-slate-900 font-serif text-lg">${escapeHtml(itemName)}</p>
              <p class="text-sm text-slate-500">Qty: ${itemQty}</p>
            </div>
          </div>
          <p class="font-bold text-slate-900">${money(itemPrice * itemQty)}</p>
        </div>
        `;
      }).join('')
    } else {
      itemsContainer.innerHTML = `
        <div class="text-center py-8">
            <p class="text-slate-900 font-medium mb-1">Your order was successfully processed.</p>
            <p class="text-slate-500 text-sm">Itemized breakdown is not available for this ledger entry.</p>
        </div>`
    }

  } catch (error) {
    console.error('Receipt error:', error)
    document.getElementById('receipt-items').innerHTML = '<p class="text-red-600 text-center py-10">Failed to load order details.</p>'
    document.getElementById('receipt-date').textContent = 'Error'
    toast('Could not load receipt data.', 'error')
  }
}

init().catch((error) => console.error(error))