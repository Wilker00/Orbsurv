// Interactive Pitch Deck - Improved with smooth slide animations
(function() {
  'use strict';

  let currentCardIndex = 0;
  let totalCards = 0;
  let isAnimating = false;
  let touchStartX = 0;
  let touchEndX = 0;
  let isDragging = false;

  // Initialize pitch deck when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    const pitchdeckStack = document.getElementById('pitchdeck-stack');
    if (!pitchdeckStack) return;

    const cards = pitchdeckStack.querySelectorAll('.pitchdeck-card');
    totalCards = cards.length;

    if (totalCards === 0) return;

    // Initialize progress dots
    initProgressDots();
    
    // Initialize navigation buttons
    initNavigationButtons();
    
    // Initialize keyboard navigation
    initKeyboardNavigation();
    
    // Initialize swipe/touch gestures
    initSwipeGestures();
    
    // Initialize click-to-advance
    initClickToAdvance();
    
    // Initialize download button
    initDownloadButton();
    
    // Update initial state
    updateCardDisplay();
    updateProgress();
  });

  // Initialize progress dots
  function initProgressDots() {
    const dotsContainer = document.getElementById('pitchdeck-dots');
    if (!dotsContainer) return;

    for (let i = 0; i < totalCards; i++) {
      const dot = document.createElement('button');
      dot.className = 'pitchdeck-progress-dot';
      if (i === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Go to card ${i + 1}`);
      dot.setAttribute('data-index', i);
      dot.addEventListener('click', () => goToCard(i));
      dotsContainer.appendChild(dot);
    }
  }

  // Initialize navigation buttons
  function initNavigationButtons() {
    const prevBtn = document.getElementById('pitchdeck-prev');
    const nextBtn = document.getElementById('pitchdeck-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => navigateCard(-1));
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => navigateCard(1));
    }
  }

  // Initialize keyboard navigation
  function initKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
      const pitchdeckSection = document.getElementById('interactive-pitchdeck');
      if (!pitchdeckSection) return;

      // Check if pitch deck is in viewport
      const rect = pitchdeckSection.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      if (!isVisible) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateCard(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateCard(1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToCard(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToCard(totalCards - 1);
      }
    });
  }

  // Initialize swipe gestures
  function initSwipeGestures() {
    const viewport = document.querySelector('.pitchdeck-viewport');
    if (!viewport) return;

    // Touch events
    viewport.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewport.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Mouse drag events
    viewport.addEventListener('mousedown', handleMouseDown);
    viewport.addEventListener('mouseup', handleMouseUp);
    viewport.addEventListener('mouseleave', handleMouseUp);
  }

  // Touch event handlers
  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
  }

  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }

  // Mouse drag handlers
  function handleMouseDown(e) {
    isDragging = true;
    touchStartX = e.clientX;
    e.preventDefault();
  }

  function handleMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    touchEndX = e.clientX;
    handleSwipe();
  }

  // Handle swipe gesture
  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        navigateCard(-1);
      } else {
        navigateCard(1);
      }
    }
  }

  // Initialize click-to-advance
  function initClickToAdvance() {
    const viewport = document.querySelector('.pitchdeck-viewport');
    if (!viewport) return;

    viewport.addEventListener('click', function(e) {
      // Don't advance if clicking on navigation buttons or progress dots
      if (e.target.closest('.pitchdeck-nav-btn') || 
          e.target.closest('.pitchdeck-progress-dot') ||
          e.target.closest('.pitchdeck-controls')) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;

      // Click on right half to advance, left half to go back
      if (clickX > width / 2) {
        navigateCard(1);
      } else {
        navigateCard(-1);
      }
    });
  }

  // Initialize download button
  function initDownloadButton() {
    const downloadBtn = document.getElementById('pitchdeck-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // Placeholder for future PDF export functionality
        alert('PDF download feature coming soon!');
      });
    }
  }

  // Navigate to a specific card
  function navigateCard(direction) {
    if (isAnimating) return;

    const newIndex = currentCardIndex + direction;
    if (newIndex >= 0 && newIndex < totalCards) {
      goToCard(newIndex);
    }
  }

  // Go to a specific card
  function goToCard(index) {
    if (isAnimating || index === currentCardIndex || index < 0 || index >= totalCards) {
      return;
    }

    isAnimating = true;
    const previousIndex = currentCardIndex;
    currentCardIndex = index;

    // Animate card transition with smooth slide
    animateCardTransition(previousIndex, currentCardIndex);

    // Update display after animation
    setTimeout(() => {
      updateCardDisplay();
      updateProgress();
      isAnimating = false;
    }, 400);
  }

  // Animate card transition with smooth slide (not 3D flip)
  function animateCardTransition(fromIndex, toIndex) {
    const cards = document.querySelectorAll('.pitchdeck-card');
    const fromCard = cards[fromIndex];
    const toCard = cards[toIndex];

    if (!fromCard || !toCard) return;

    const direction = toIndex > fromIndex ? 1 : -1;

    // Add animation classes for smooth slide
    fromCard.classList.add('pitchdeck-card-exit');
    fromCard.classList.add(direction > 0 ? 'pitchdeck-card-slide-out-left' : 'pitchdeck-card-slide-out-right');
    
    toCard.classList.add('pitchdeck-card-enter');
    toCard.classList.add(direction > 0 ? 'pitchdeck-card-slide-in-right' : 'pitchdeck-card-slide-in-left');

    // Remove classes after animation
    setTimeout(() => {
      fromCard.classList.remove('pitchdeck-card-exit', 'pitchdeck-card-slide-out-left', 'pitchdeck-card-slide-out-right');
      toCard.classList.remove('pitchdeck-card-enter', 'pitchdeck-card-slide-in-right', 'pitchdeck-card-slide-in-left');
    }, 400);
  }

  // Update card display
  function updateCardDisplay() {
    const cards = document.querySelectorAll('.pitchdeck-card');
    cards.forEach((card, index) => {
      if (index === currentCardIndex) {
        card.classList.add('active');
        card.setAttribute('aria-hidden', 'false');
        
        // Trigger animations for specific cards
        if (index === 1) {
          // Market card - animate market size
          setTimeout(() => animateMarketSize(), 200);
        }
      } else {
        card.classList.remove('active');
        card.setAttribute('aria-hidden', 'true');
      }
    });

    // Update navigation buttons
    const prevBtn = document.getElementById('pitchdeck-prev');
    const nextBtn = document.getElementById('pitchdeck-next');

    if (prevBtn) {
      prevBtn.disabled = currentCardIndex === 0;
      prevBtn.setAttribute('aria-disabled', currentCardIndex === 0);
    }

    if (nextBtn) {
      nextBtn.disabled = currentCardIndex === totalCards - 1;
      nextBtn.setAttribute('aria-disabled', currentCardIndex === totalCards - 1);
    }
  }

  // Update progress indicators
  function updateProgress() {
    // Update counter
    const currentSpan = document.getElementById('pitchdeck-current');
    const totalSpan = document.getElementById('pitchdeck-total');
    
    if (currentSpan) {
      currentSpan.textContent = currentCardIndex + 1;
    }
    if (totalSpan) {
      totalSpan.textContent = totalCards;
    }

    // Update progress bar
    const progressFill = document.getElementById('pitchdeck-progress-fill');
    if (progressFill) {
      const progress = ((currentCardIndex + 1) / totalCards) * 100;
      progressFill.style.width = progress + '%';
    }

    // Update progress dots
    const dots = document.querySelectorAll('.pitchdeck-progress-dot');
    dots.forEach((dot, index) => {
      if (index === currentCardIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  // Animate market size number
  function animateMarketSize() {
    const marketSizeEl = document.getElementById('market-size');
    if (!marketSizeEl) return;

    const target = 60; // $60B
    let current = 0;
    const duration = 1500;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      current = Math.floor(easeOut * target);

      marketSizeEl.textContent = '$' + current + 'B+';

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }
})();


