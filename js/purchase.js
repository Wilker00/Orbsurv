/**
 * Purchase form handler - Add to cart functionality
 */
(function () {
  'use strict';

  // Wait for cart.js to load
  if (!window.OrbsurvCart) {
    console.warn('Cart system not loaded');
    return;
  }

  // Handle "Add to cart" button clicks
  document.addEventListener('click', (e) => {
    const buyBtn = e.target.closest('[data-buy-now]');
    if (!buyBtn) return;

    e.preventDefault();

    const plan = buyBtn.dataset.plan;
    const price = parseFloat(buyBtn.dataset.price);

    if (!plan) {
      console.error('Invalid plan data');
      return;
    }

    // Add to cart
    const success = window.OrbsurvCart.addToCart(plan, { price: price || 0 });
    
    if (success) {
      // Show feedback
      const originalText = buyBtn.textContent;
      buyBtn.textContent = 'Added!';
      buyBtn.disabled = true;
      
      // Redirect to cart after a brief delay
      setTimeout(() => {
        window.location.href = 'cart.html';
      }, 500);
    } else {
      alert('Failed to add item to cart. Please try again.');
    }
  });

  // Handle purchase modal if it exists (for direct checkout option)
  const modal = document.getElementById('purchase-modal');
  const form = document.getElementById('purchase-form');
  const closeBtn = document.getElementById('close-modal');
  const messageEl = document.getElementById('purchase-message');
  const planTypeInput = document.getElementById('purchase-plan-type');
  const priceInput = document.getElementById('purchase-price');
  const planDisplay = document.getElementById('purchase-plan-display');
  const priceDisplay = document.getElementById('purchase-price-display');

  if (!modal || !form) {
    return; // Modal not present on this page
  }

  // Get API base from forms.js
  const API_BASE = window.ORBSURV_API_BASE || 'http://localhost:8000';

  // Plan name mapping
  const planNames = {
    starter: 'Starter',
    perimeter: 'Perimeter',
    enterprise: 'Enterprise'
  };

  // Close modal
  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    clearMessage();
    form.reset();
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      plan_type: formData.get('plan_type'),
      price: parseFloat(formData.get('price'))
    };

    // Validate
    if (!data.name || !data.email || !data.plan_type || !data.price) {
      showMessage('Please fill in all required fields.', 'error');
      return;
    }

    // Disable form
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
      const endpoint = form.dataset.endpoint || '/orders';
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}/api/v1${endpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.detail || result.message || `Purchase failed (${response.status})`;
        showMessage(errorMsg, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }

      // Success
      showMessage(
        'Purchase successful! Check your email for a registration link to create your account.',
        'success'
      );
      
      // Reset form after a delay
      setTimeout(() => {
        closeModal();
      }, 3000);

    } catch (error) {
      console.error('Purchase error:', error);
      showMessage(
        'An error occurred. Please try again or contact support.',
        'error'
      );
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Message display functions
  function showMessage(text, type = 'info') {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `form-message ${type}`;
    messageEl.style.display = 'block';
    messageEl.setAttribute('role', 'alert');
  }

  function clearMessage() {
    if (!messageEl) return;
    messageEl.textContent = '';
    messageEl.className = 'form-message';
    messageEl.style.display = 'none';
    messageEl.removeAttribute('role');
  }
})();



