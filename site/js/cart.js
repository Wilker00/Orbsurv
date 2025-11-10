/**
 * Cart management system for Orbsurv
 * Handles adding, removing, and managing cart items in localStorage
 */
(function () {
  'use strict';

  const CART_STORAGE_KEY = 'orbsurv:cart';
  const CART_EXPIRY_DAYS = 30;

  // Plan information mapping
  const PLAN_INFO = {
    starter: {
      name: 'Starter',
      price: 299,
      image: '/Image/camera_image.png',
      features: [
        'Single rail up to 30ft',
        '30-day event retention',
        'Mobile alerts + email',
        'Remote calibration support'
      ],
      description: 'Perfect for small deployments and pilot programs.'
    },
    perimeter: {
      name: 'Perimeter',
      price: 649,
      image: '/Image/mid.jpg',
      features: [
        'Up to 3 connected rails',
        '90-day event retention',
        'SMS + mobile alerts',
        'Weekly analytics digest',
        '24/7 proactive monitoring'
      ],
      description: 'Ideal for medium-sized facilities requiring comprehensive coverage.'
    },
    enterprise: {
      name: 'Enterprise',
      price: 0, // Custom pricing
      image: '/Image/right.jpg',
      features: [
        'Unlimited rails & zones',
        'Dedicated private cloud or on-prem',
        'API access & SIEM integration',
        'Joint incident response playbooks',
        'White-glove install & onsite training'
      ],
      description: 'Custom solutions for large-scale deployments.'
    }
  };

  /**
   * Get cart from localStorage
   */
  function getCart() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) {
        return { items: [], updated_at: Date.now() };
      }
      const cart = JSON.parse(stored);
      
      // Check if cart has expired
      const expiryTime = CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      if (cart.updated_at && (Date.now() - cart.updated_at) > expiryTime) {
        clearCart();
        return { items: [], updated_at: Date.now() };
      }
      
      return cart;
    } catch (error) {
      console.error('Error reading cart:', error);
      return { items: [], updated_at: Date.now() };
    }
  }

  /**
   * Save cart to localStorage
   */
  function saveCart(cart) {
    try {
      cart.updated_at = Date.now();
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      updateCartBadge();
      return true;
    } catch (error) {
      console.error('Error saving cart:', error);
      return false;
    }
  }

  /**
   * Add item to cart
   */
  function addToCart(planType, customData = {}) {
    const planInfo = PLAN_INFO[planType];
    if (!planInfo) {
      console.error('Invalid plan type:', planType);
      return false;
    }

    const cart = getCart();
    
    // Check if item already exists
    const existingIndex = cart.items.findIndex(item => item.plan_type === planType);
    
    const item = {
      plan_type: planType,
      name: planInfo.name,
      price: customData.price || planInfo.price,
      image: planInfo.image,
      features: [...planInfo.features],
      description: planInfo.description,
      added_at: Date.now()
    };

    if (existingIndex >= 0) {
      // Update existing item
      cart.items[existingIndex] = item;
    } else {
      // Add new item
      cart.items.push(item);
    }

    return saveCart(cart);
  }

  /**
   * Remove item from cart
   */
  function removeFromCart(planType) {
    const cart = getCart();
    cart.items = cart.items.filter(item => item.plan_type !== planType);
    return saveCart(cart);
  }

  /**
   * Clear entire cart
   */
  function clearCart() {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      updateCartBadge();
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  /**
   * Get cart item count
   */
  function getCartCount() {
    const cart = getCart();
    return cart.items.length;
  }

  /**
   * Calculate cart total
   */
  function getCartTotal() {
    const cart = getCart();
    return cart.items.reduce((total, item) => {
      return total + (item.price || 0);
    }, 0);
  }

  /**
   * Update cart badge in header
   */
  function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    const count = getCartCount();
    
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        // CSS will handle display via :not(:empty) selector
      } else {
        badge.textContent = '';
      }
    }
  }

  /**
   * Initialize cart badge on page load
   */
  function initCartBadge() {
    updateCartBadge();
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartBadge);
  } else {
    initCartBadge();
  }

  // Export to window
  window.OrbsurvCart = {
    addToCart,
    removeFromCart,
    getCart,
    clearCart,
    getCartCount,
    getCartTotal,
    updateCartBadge,
    PLAN_INFO
  };
})();

