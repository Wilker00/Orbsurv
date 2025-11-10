/**
 * API Documentation Page JavaScript
 * Handles navigation, code copying, and mobile menu
 */

(function() {
  'use strict';

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    setupNavigation();
    setupCodeCopy();
    setupMobileMenu();
    setupScrollSpy();
  }

  /**
   * Setup smooth scroll navigation with active state
   */
  function setupNavigation() {
    const navLinks = document.querySelectorAll('.api-nav-link');
    const sections = document.querySelectorAll('.api-section');

    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const headerOffset = 100;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          // Update active state
          navLinks.forEach(a => a.classList.remove('active'));
          this.classList.add('active');

          // Close mobile menu if open
          const navList = document.querySelector('.api-nav-list');
          if (navList && navList.classList.contains('is-open')) {
            navList.classList.remove('is-open');
            const toggle = document.querySelector('.api-nav-toggle');
            if (toggle) {
              toggle.setAttribute('aria-expanded', 'false');
            }
          }
        }
      });
    });
  }

  /**
   * Setup scroll spy to highlight active navigation item
   */
  function setupScrollSpy() {
    const sections = document.querySelectorAll('.api-section');
    const navLinks = document.querySelectorAll('.api-nav-link');

    if (sections.length === 0 || navLinks.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -66%',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => {
      observer.observe(section);
    });
  }

  /**
   * Setup code copy functionality
   */
  function setupCodeCopy() {
    const copyButtons = document.querySelectorAll('.code-copy-btn');

    copyButtons.forEach(button => {
      button.addEventListener('click', function() {
        const codeBlock = this.closest('.code-block');
        const code = codeBlock ? codeBlock.querySelector('code') : null;
        
        if (code) {
          const text = code.textContent || code.innerText;
          copyToClipboard(text, this);
        }
      });
    });
  }

  /**
   * Copy text to clipboard
   */
  function copyToClipboard(text, button) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback(button);
      }).catch(() => {
        fallbackCopy(text, button);
      });
    } else {
      fallbackCopy(text, button);
    }
  }

  /**
   * Fallback copy method for older browsers
   */
  function fallbackCopy(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      showCopyFeedback(button);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }

    document.body.removeChild(textArea);
  }

  /**
   * Show visual feedback when code is copied
   */
  function showCopyFeedback(button) {
    const icon = button.querySelector('i');
    const originalIcon = icon.className;

    icon.className = 'fas fa-check';
    button.setAttribute('aria-label', 'Copied!');
    
    setTimeout(() => {
      icon.className = originalIcon;
      button.setAttribute('aria-label', 'Copy code');
    }, 2000);
  }

  /**
   * Setup mobile navigation menu toggle
   */
  function setupMobileMenu() {
    const toggle = document.querySelector('.api-nav-toggle');
    const navList = document.querySelector('.api-nav-list');

    if (!toggle || !navList) return;

    toggle.addEventListener('click', function() {
      const isOpen = navList.classList.contains('is-open');
      
      if (isOpen) {
        navList.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        navList.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        if (!toggle.contains(e.target) && !navList.contains(e.target)) {
          navList.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }
})();


