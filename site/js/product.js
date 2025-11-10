(() => {
  document.addEventListener('DOMContentLoaded', () => {
    setupAccordion();
    setupRevealAnimations();
    setupAnchorScroll();
  });

  function setupAccordion() {
    const container = document.querySelector('[data-accordion]');
    if (!container) {
      return;
    }

    const items = Array.from(container.querySelectorAll('details'));
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) {
          return;
        }
        items.forEach((other) => {
          if (other !== item) {
            other.open = false;
          }
        });
      });
    });
  }

  function setupRevealAnimations() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) {
      return;
    }

    document.body.classList.add('reveal-ready');

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.2
    });

    targets.forEach((el) => observer.observe(el));
  }

  function setupAnchorScroll() {
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    internalLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const hash = link.getAttribute('href');
        if (!hash || hash === '#') {
          return;
        }
        const target = document.querySelector(hash);
        if (!target) {
          return;
        }
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.removeAttribute('tabindex');
      });
    });
  }
})();
