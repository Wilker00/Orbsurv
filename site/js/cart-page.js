/**
 * Cart page functionality
 * Handles displaying cart items, removing items, and checkout
 */
(function () {
  'use strict';

  if (!window.OrbsurvCart) {
    console.error('Cart system not loaded');
    return;
  }

  const cartItemsList = document.getElementById('cart-items-list');
  const emptyCart = document.getElementById('empty-cart');
  const orderSummaryItems = document.getElementById('order-summary-items');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartTotal = document.getElementById('cart-total');
  const checkoutForm = document.getElementById('cart-checkout-form');
  const checkoutMessage = document.getElementById('checkout-message');
  const API_BASE = window.ORBSURV_API_BASE || 'http://localhost:8000';

  /**
   * Render cart items
   */
  function renderCart() {
    const cart = window.OrbsurvCart.getCart();
    const items = cart.items || [];

    // Show/hide empty state
    if (items.length === 0) {
      if (emptyCart) emptyCart.classList.add('is-visible');
      if (cartItemsList) cartItemsList.style.display = 'none';
      if (checkoutForm) checkoutForm.classList.remove('is-visible');
      renderOrderSummary([]);
      return;
    }

    if (emptyCart) emptyCart.classList.remove('is-visible');
    if (cartItemsList) cartItemsList.style.display = 'block';
    if (checkoutForm) checkoutForm.classList.add('is-visible');

    // Render cart items
    if (cartItemsList) {
      cartItemsList.innerHTML = items.map((item, index) => `
        <div class="cart-item card" data-plan-type="${item.plan_type}">
          <div class="cart-item-image">
            <img src="${item.image || '/Image/camera_image.png'}" alt="${item.name} plan" loading="lazy">
          </div>
          <div class="cart-item-content">
            <div class="cart-item-header">
              <h3 class="cart-item-title">${item.name}</h3>
              <div class="cart-item-price">$${item.price > 0 ? item.price.toFixed(2) : 'Custom'} / month</div>
            </div>
            <p class="cart-item-description">${item.description || ''}</p>
            <ul class="cart-item-features">
              ${item.features.map(feature => `<li><i class="fa-solid fa-check"></i> ${feature}</li>`).join('')}
            </ul>
            <div class="cart-item-actions">
              <button class="cart-item-remove" data-plan-type="${item.plan_type}" aria-label="Remove ${item.name} from cart">
                <i class="fa-solid fa-trash"></i> Remove
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Render order summary
    renderOrderSummary(items);

    // Attach remove handlers
    attachRemoveHandlers();
  }

  /**
   * Render order summary
   */
  function renderOrderSummary(items) {
    if (!orderSummaryItems) return;

    orderSummaryItems.innerHTML = items.map(item => `
      <div class="summary-item">
        <span class="summary-item-name">${item.name}</span>
        <span class="summary-item-price">$${item.price > 0 ? item.price.toFixed(2) : 'Custom'}</span>
      </div>
    `).join('');

    const total = window.OrbsurvCart.getCartTotal();
    if (cartSubtotal) {
      cartSubtotal.textContent = `$${total.toFixed(2)}`;
    }
    if (cartTotal) {
      cartTotal.textContent = `$${total.toFixed(2)}`;
    }
  }

  /**
   * Attach remove item handlers
   */
  function attachRemoveHandlers() {
    const removeButtons = document.querySelectorAll('.cart-item-remove');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const planType = btn.dataset.planType;
        if (planType && confirm(`Remove ${planType} from cart?`)) {
          window.OrbsurvCart.removeFromCart(planType);
          renderCart();
          window.OrbsurvCart.updateCartBadge();
        }
      });
    });
  }

  /**
   * Handle checkout form submission
   */
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessage();

      const formData = new FormData(checkoutForm);
      const name = formData.get('name');
      const email = formData.get('email');

      if (!name || !email) {
        showMessage('Please fill in all required fields.', 'error');
        return;
      }

      const cart = window.OrbsurvCart.getCart();
      if (cart.items.length === 0) {
        showMessage('Your cart is empty.', 'error');
        return;
      }

      const submitBtn = checkoutForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

      try {
        // Process each item as a separate order
        const orders = [];
        for (const item of cart.items) {
          const orderData = {
            name,
            email,
            plan_type: item.plan_type,
            price: item.price || 0
          };

          const response = await fetch(`${API_BASE}/api/v1/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.detail || result.message || `Order failed for ${item.name}`);
          }

          orders.push(result);
        }

        // Success - clear cart and show message
        window.OrbsurvCart.clearCart();
        showMessage(
          `Purchase successful! We've sent an order confirmation and account registration link to ${email}. Check your inbox (and spam folder) to complete your account setup and access your order details.`,
          'success'
        );

        // Redirect after delay
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 5000);

      } catch (error) {
        console.error('Checkout error:', error);
        showMessage(
          error.message || 'An error occurred during checkout. Please try again or contact support.',
          'error'
        );
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  /**
   * Show message
   */
  function showMessage(text, type = 'info') {
    if (!checkoutMessage) return;
    checkoutMessage.textContent = text;
    checkoutMessage.className = `form-message ${type}`;
    checkoutMessage.style.display = 'block';
    checkoutMessage.setAttribute('role', 'alert');
  }

  /**
   * Clear message
   */
  function clearMessage() {
    if (!checkoutMessage) return;
    checkoutMessage.textContent = '';
    checkoutMessage.className = 'form-message';
    checkoutMessage.style.display = 'none';
    checkoutMessage.removeAttribute('role');
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCart);
  } else {
    renderCart();
  }
})();

