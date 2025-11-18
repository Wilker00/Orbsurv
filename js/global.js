const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/three.min.js';
const THREE_ORBIT_CONTROLS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/examples/js/controls/OrbitControls.js';
const THREE_STL_LOADER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/examples/js/loaders/STLLoader.js';

const externalScriptCache = new Map();

function loadExternalScript(src) {
  if (externalScriptCache.has(src)) {
    return externalScriptCache.get(src);
  }
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
  externalScriptCache.set(src, promise);
  return promise;
}

async function ensureThreeBundle() {
  if (!window.THREE || !window.THREE.WebGLRenderer) {
    await loadExternalScript(THREE_CDN);
  }
  const pending = [];
  if (!window.THREE || !window.THREE.OrbitControls) {
    pending.push(loadExternalScript(THREE_ORBIT_CONTROLS_CDN));
  }
  if (!window.THREE || !window.THREE.STLLoader) {
    pending.push(loadExternalScript(THREE_STL_LOADER_CDN));
  }
  if (pending.length) {
    await Promise.all(pending);
  }
  if (!window.THREE || !window.THREE.WebGLRenderer) {
    throw new Error('three.js failed to load');
  }
  return window.THREE;
}

// Expose ensureThreeBundle on window for use in other scripts
window.ensureThreeBundle = ensureThreeBundle;
const DEFAULT_API_BASE = 'https://api.orbsurv.com';
const SITE_ROOT = (() => {
  const script =
    document.currentScript || document.querySelector('script[src$="js/global.js"]');
  if (script) {
    try {
      const url = new URL(script.getAttribute('src'), window.location.href);
      const rootHref = url.href.replace(/js\/global\.js.*$/, '');
      return rootHref.endsWith('/') ? rootHref : `${rootHref}/`;
    } catch (_) {
      /* fall through to fallback */
    }
  }
  const href = window.location.href;
  const index = href.lastIndexOf('/');
  return index >= 0 ? href.slice(0, index + 1) : href;
})();

function pageRootPrefix() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (!path) return '';
  const segments = path.split('/');
  const depth = Math.max(segments.length - 1, 0);
  return '../'.repeat(depth);
}

function applyLocalPrefixes(host, prefix) {
  if (!prefix) return;

  const shouldSkip = (value) =>
    !value ||
    value.startsWith('#') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('//') ||
    value.startsWith('../') ||
    value.startsWith('./') ||
    value.startsWith('javascript:');

  host.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (shouldSkip(href)) return;
    anchor.setAttribute('href', `${prefix}${href}`);
  });

  host
    .querySelectorAll('img[src], video[src], source[src], link[rel=\"icon\"][href]')
    .forEach((el) => {
      const src = el.getAttribute('src') || el.getAttribute('href');
      if (shouldSkip(src)) return;
      if (el.hasAttribute('src')) {
        el.setAttribute('src', `${prefix}${src}`);
      } else {
        el.setAttribute('href', `${prefix}${src}`);
      }
    });
}

function resolveApiBase() {
  const api = window.OrbsurvApi;
  if (api && api.API_BASE) {
    return String(api.API_BASE).replace(/\/+$/, '');
  }
  const meta = document.querySelector('meta[name=\"orbsurv-api-base\"]');
  const configured =
    window.ORBSURV_API_BASE ||
    (meta && meta.getAttribute('content')) ||
    DEFAULT_API_BASE;
  return String(configured).replace(/\/+$/, '');
}

function ensureSiteMessageHost() {
  let host = document.querySelector('[data-site-messages]');
  if (!host) {
    host = document.createElement('div');
    host.dataset.siteMessages = 'true';
    host.className = 'site-messages';
    document.body.appendChild(host);
  }
  return host;
}

function showSiteMessage(message, tone = 'info') {
  if (!message) return;
  const host = ensureSiteMessageHost();
  const notice = document.createElement('div');
  notice.className = `site-message site-message--${tone}`;
  notice.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  notice.textContent = message;
  host.appendChild(notice);
  requestAnimationFrame(() => {
    notice.classList.add('is-visible');
  });
  window.setTimeout(() => {
    notice.classList.remove('is-visible');
    window.setTimeout(() => {
      if (notice.parentNode === host) {
        host.removeChild(notice);
      }
    }, 300);
  }, 4000);
}

async function loadLayoutPartials() {
  const hosts = Array.from(document.querySelectorAll('[data-include]'));
  if (!hosts.length) return;

  const prefix = pageRootPrefix();
  await Promise.all(
    hosts.map(async (host) => {
      const path = host.getAttribute('data-include');
      if (!path) return;
      try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error(`Failed to load ${path} (${response.status})`);
        }
        host.innerHTML = await response.text();
        applyLocalPrefixes(host, prefix);
      } catch (error) {
        console.warn('Partial load failed:', path, error);
        host.innerHTML =
          '<div class=\"wrap partial-error\" role=\"status\">Unable to load shared layout.</div>';
        showSiteMessage(`We couldn't load ${path}.`, 'error');
      }
    })
  );
}

function normaliseRoute(href) {
  if (!href) {
    return null;
  }
  try {
    const url = href.includes('://') ? new URL(href) : new URL(href, window.location.href);
    if (url.origin !== window.location.origin) {
      return null;
    }
    let path = url.pathname.replace(/^\//, '');
    if (!path) {
      return 'index.html';
    }
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    if (!path) {
      return 'index.html';
    }
    if (!path.includes('.') && !path.endsWith('.html')) {
      return `${path}.html`;
    }
    return path;
  } catch (error) {
    return null;
  }
}

function currentRoute() {
  let path = window.location.pathname.replace(/^\//, '');
  if (!path) {
    return 'index.html';
  }
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  if (!path) {
    return 'index.html';
  }
  if (!path.includes('.') && !path.endsWith('.html')) {
    return `${path}.html`;
  }
  return path;
}

function navigateTo(target) {
  try {
    const destination = new URL(target, SITE_ROOT);
    window.location.href = destination.href;
  } catch (error) {
    console.warn('Fallback navigation applied', error);
    window.location.href = target;
  }
}

function markActiveNavigation() {
  const route = currentRoute();
  ['.nav-links a', '.footer-links a'].forEach((selector) => {
    document.querySelectorAll(selector).forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) {
        link.removeAttribute('aria-current');
        return;
      }
      const targetRoute = normaliseRoute(href);
      if (targetRoute && targetRoute === route) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  });
}

function bindGlobalFormHandlers() {
  if (typeof window.handleFormSubmit !== 'function') {
    return;
  }
  const forms = document.querySelectorAll('form[data-endpoint]');
  forms.forEach((form) => {
    if (form.dataset.orbsurvBound === 'true') {
      return;
    }
    form.addEventListener('submit', (event) => {
      window.handleFormSubmit(event, form);
    });
    form.dataset.orbsurvBound = 'true';
  });
}

let formObserver = null;
function observeFormMounts() {
  if (formObserver || typeof MutationObserver !== 'function') {
    return;
  }
  formObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const candidates = Array.from(mutation.addedNodes).filter(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          ((node.matches && node.matches('form[data-endpoint]')) ||
            (node.querySelector && node.querySelector('form[data-endpoint]')))
      );
      if (candidates.length) {
        bindGlobalFormHandlers();
        break;
      }
    }
  });
  formObserver.observe(document.body, { childList: true, subtree: true });
}

let navigationFallbackBound = false;
function setupNavigationFallback() {
  if (navigationFallbackBound) {
    return;
  }
  navigationFallbackBound = true;
  document.body.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const anchor = event.target.closest('a');
    if (!anchor) {
      return;
    }
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) {
      return;
    }
    const protocolMatch = href.match(/^[a-zA-Z]+:/);
    if (protocolMatch && !href.startsWith(window.location.origin)) {
      const protocol = protocolMatch[0].toLowerCase();
      if (protocol !== 'http:' && protocol !== 'https:') {
        return;
      }
    }
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      return;
    }
    const targetRoute = normaliseRoute(href);
    if (!targetRoute) {
      return;
    }
    event.preventDefault();
    navigateTo(href);
  });
}

function wireNavButtons() {
  const buttons = document.querySelectorAll('[data-nav-target]');
  buttons.forEach((button) => {
    if (button.dataset.navBound === 'true') {
      return;
    }
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const target = button.getAttribute('data-nav-target');
      if (!target) {
        return;
      }
      navigateTo(target);
    });
    button.dataset.navBound = 'true';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadLayoutPartials();
  } catch (error) {
    console.error('Failed to load shared layout partials', error);
    showSiteMessage('Navigation failed to load. Use the footer links while we recover.', 'error');
  } finally {
    document.dispatchEvent(new CustomEvent('orbsurv:partials-loaded'));
  }

  bindGlobalFormHandlers();
  observeFormMounts();
  document.addEventListener('orbsurv:bind-forms', bindGlobalFormHandlers);
  setupNavigationFallback();
  wireNavButtons();
  markActiveNavigation();

  // --- 1. Mobile Navigation Toggle ---
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('primary-nav-menu');
  const navBackdrop = document.getElementById('nav-backdrop');
  const MOBILE_MENU_BREAKPOINT = 960;

  // Store original body styles for scroll lock
  let originalBodyStyles = {
    overflow: '',
    position: '',
    width: '',
    top: ''
  };

  const getFocusableNavItems = () => {
    if (!navMenu) return [];
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([type="hidden"]):not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(navMenu.querySelectorAll(selectors.join(',')));
  };

  const lockBodyScroll = () => {
    if (window.innerWidth > MOBILE_MENU_BREAKPOINT) return;
    
    // Store current scroll position
    const scrollY = window.scrollY;
    
    // Store original styles
    originalBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.body.style.width,
      top: document.body.style.top
    };

    // Lock scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
  };

  const unlockBodyScroll = () => {
    if (window.innerWidth > MOBILE_MENU_BREAKPOINT) return;

    // Restore original styles
    document.body.style.overflow = originalBodyStyles.overflow;
    document.body.style.position = originalBodyStyles.position;
    document.body.style.width = originalBodyStyles.width;
    
    // Restore scroll position
    const scrollY = document.body.style.top;
    document.body.style.top = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  };

  const setNavMenuState = (isOpen) => {
    if (!navToggle || !navMenu) {
      return;
    }
    const expanded = Boolean(isOpen);
    navToggle.setAttribute('aria-expanded', expanded.toString());
    navMenu.dataset.mobileOpen = expanded ? 'true' : 'false';
    navMenu.classList.toggle('is-open', expanded);

    // Handle backdrop
    if (navBackdrop) {
      navBackdrop.classList.toggle('is-visible', expanded);
      navBackdrop.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    }

    if (window.innerWidth <= MOBILE_MENU_BREAKPOINT) {
      navMenu.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      
      // Handle body scroll lock
      if (expanded) {
        lockBodyScroll();
        const focusable = getFocusableNavItems();
        if (focusable.length) {
          window.requestAnimationFrame(() => focusable[0].focus());
        }
      } else {
        unlockBodyScroll();
      }
    } else {
      navMenu.removeAttribute('aria-hidden');
      if (navBackdrop) {
        navBackdrop.classList.remove('is-visible');
        navBackdrop.setAttribute('aria-hidden', 'true');
      }
      unlockBodyScroll();
    }

    if (!expanded && document.activeElement && navMenu.contains(document.activeElement)) {
      navToggle.focus();
    }
  };

  const closeNavMenu = () => setNavMenuState(false);

  if (navToggle && navMenu) {
    setNavMenuState(false);

    navToggle.addEventListener('click', (event) => {
      event.preventDefault();
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      setNavMenuState(!isExpanded);
    });

    // Handle backdrop click to close menu
    if (navBackdrop) {
      navBackdrop.addEventListener('click', () => {
        if (navMenu.classList.contains('is-open')) {
          closeNavMenu();
        }
      });
    }

    document.addEventListener('click', (event) => {
      if (!navMenu.classList.contains('is-open')) {
        return;
      }
      if (event.target === navToggle || navToggle.contains(event.target)) {
        return;
      }
      if (event.target === navBackdrop || navBackdrop?.contains(event.target)) {
        return; // Handled by backdrop click handler
      }
      if (navMenu.contains(event.target)) {
        return;
      }
      closeNavMenu();
    });

    navMenu.addEventListener('click', (event) => {
      const trigger = event.target.closest('a[href], button[data-nav-target]');
      if (!trigger) {
        return;
      }
      if (window.innerWidth > MOBILE_MENU_BREAKPOINT) {
        return;
      }
      window.setTimeout(closeNavMenu, 0);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navMenu.classList.contains('is-open')) {
        closeNavMenu();
      }
      if (event.key === 'Tab' && navMenu.classList.contains('is-open')) {
        const focusable = getFocusableNavItems();
        if (!focusable.length) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    let resizeTimer = null;
    const handleResize = () => {
      if (window.innerWidth > MOBILE_MENU_BREAKPOINT) {
        navMenu.removeAttribute('aria-hidden');
        navMenu.dataset.mobileOpen = 'false';
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        if (navBackdrop) {
          navBackdrop.classList.remove('is-visible');
          navBackdrop.setAttribute('aria-hidden', 'true');
        }
        unlockBodyScroll();
      } else if (navToggle.getAttribute('aria-expanded') === 'true') {
        navMenu.setAttribute('aria-hidden', 'false');
        if (navBackdrop) {
          navBackdrop.classList.add('is-visible');
          navBackdrop.setAttribute('aria-hidden', 'false');
        }
        lockBodyScroll();
      } else {
        navMenu.setAttribute('aria-hidden', 'true');
        if (navBackdrop) {
          navBackdrop.classList.remove('is-visible');
          navBackdrop.setAttribute('aria-hidden', 'true');
        }
        unlockBodyScroll();
      }
    };

    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(handleResize, 150);
    });

    handleResize();
  }

  // --- 2. Theme (Dark/Light Mode) Switcher ---
  const themeToggles = document.querySelectorAll('.theme-switch input');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  const readStoredTheme = () => {
    try {
      return localStorage.getItem('orbsurv-theme');
    } catch (_) {
      return null;
    }
  };

  const writeStoredTheme = (value) => {
    try {
      localStorage.setItem('orbsurv-theme', value);
    } catch (_) {
      /* no-op */
    }
  };
  
  const applyTheme = (isDark, { persist = true } = {}) => {
    document.body.classList.toggle('dark-mode', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeToggles.forEach(toggle => {
      toggle.checked = isDark;
    });
    if (persist) {
      writeStoredTheme(isDark ? 'dark' : 'light');
    }
  };

  if (themeToggles.length) {
    themeToggles.forEach(toggle => {
      toggle.addEventListener('change', (event) => {
        applyTheme(event.target.checked);
      });
    });
  }
  
  const storedTheme = readStoredTheme();
  const initialDark = storedTheme ? storedTheme === 'dark' : prefersDark.matches;
  applyTheme(initialDark, { persist: false });
  
  const handlePrefersChange = (event) => {
    if (readStoredTheme()) return;
    applyTheme(event.matches, { persist: false });
  };

  if (typeof prefersDark.addEventListener === 'function') {
    prefersDark.addEventListener('change', handlePrefersChange);
  } else if (typeof prefersDark.addListener === 'function') {
    prefersDark.addListener(handlePrefersChange);
  }

  // --- 3. Enhanced Smooth Scrolling ---
  // Enhanced smooth scrolling with momentum effect
  function smoothScrollTo(target, duration = 800) {
    const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetElement) return;

    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easeInOutCubic(progress);
      
      window.scrollTo(0, startPosition + distance * ease);
      
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        // Ensure we end at the exact target
        window.scrollTo(0, targetPosition);
        targetElement.focus({ preventScroll: true });
      }
    }

    requestAnimationFrame(animation);
  }

  // Enhanced anchor link scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#!') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        smoothScrollTo(target, 800);
      }
    });
  });

  // --- 4. Section Indicator (Replaces Blue Progress Bar) ---
  function createSectionIndicator() {
    // Section name mapping
    const sectionNames = {
      'hero-section': 'Hero',
      'early-interest': 'Early Interest',
      'product-showcase-section': 'Product Showcase',
      'camera-components': 'Camera Components',
      'details': 'How It Works',
      'demo-teaser': 'Demo',
      'availability': 'Pilot Program',
      'install': 'Installation',
      'privacy': 'Privacy'
    };

    // Get all sections with IDs
    const sections = Array.from(document.querySelectorAll('main section[id]')).filter(section => {
      return section.id && section.id !== 'main-content';
    });

    if (sections.length === 0) return;

    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'section-indicator';
    indicator.setAttribute('aria-label', 'Current section');
    indicator.innerHTML = `
      <span class="section-indicator__current"></span>
      <span class="section-indicator__name"></span>
      <span class="section-indicator__next"></span>
    `;
    
    // Position is handled by CSS (left side, vertically centered)
    document.body.appendChild(indicator);

    const currentEl = indicator.querySelector('.section-indicator__current');
    const nameEl = indicator.querySelector('.section-indicator__name');
    const nextEl = indicator.querySelector('.section-indicator__next');

    let currentSectionIndex = 0;
    let lastScrollDirection = 'down';

    function getSectionName(section) {
      return sectionNames[section.id] || section.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function updateIndicator() {
      // Find the section most visible in viewport
      let maxVisibility = 0;
      let mostVisibleIndex = 0;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const sectionTop = Math.max(0, rect.top);
        const sectionBottom = Math.min(viewportHeight, rect.bottom);
        const visibleHeight = Math.max(0, sectionBottom - sectionTop);
        const visibility = visibleHeight / Math.min(viewportHeight, rect.height);

        if (visibility > maxVisibility) {
          maxVisibility = visibility;
          mostVisibleIndex = index;
        }
      });

      // Determine scroll direction
      if (mostVisibleIndex > currentSectionIndex) {
        lastScrollDirection = 'down';
      } else if (mostVisibleIndex < currentSectionIndex) {
        lastScrollDirection = 'up';
      }

      currentSectionIndex = mostVisibleIndex;
      const currentSection = sections[currentSectionIndex];
      const totalSections = sections.length;
      const sectionNumber = currentSectionIndex + 1;

      // Update current section info
      currentEl.textContent = `Section ${sectionNumber} of ${totalSections}`;
      nameEl.textContent = getSectionName(currentSection);

      // Determine next section
      let nextSection = null;
      if (lastScrollDirection === 'down' && currentSectionIndex < totalSections - 1) {
        nextSection = sections[currentSectionIndex + 1];
      } else if (lastScrollDirection === 'up' && currentSectionIndex > 0) {
        nextSection = sections[currentSectionIndex - 1];
      } else if (currentSectionIndex === totalSections - 1) {
        // At the end, show previous
        nextSection = currentSectionIndex > 0 ? sections[currentSectionIndex - 1] : null;
      } else if (currentSectionIndex === 0) {
        // At the start, show next
        nextSection = sections[1] || null;
      }

      if (nextSection) {
        const nextName = getSectionName(nextSection);
        const nextLabel = lastScrollDirection === 'down' ? 'Next' : 'Previous';
        nextEl.textContent = `${nextLabel}: ${nextName}`;
        nextEl.style.display = '';
      } else {
        nextEl.style.display = 'none';
      }

      // Add fade animation
      indicator.classList.add('is-updating');
      setTimeout(() => {
        indicator.classList.remove('is-updating');
      }, 300);
    }

    // Use IntersectionObserver for better performance
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      updateIndicator();
    }, observerOptions);

    sections.forEach(section => {
      sectionObserver.observe(section);
    });

    // Initial update
    updateIndicator();

    // Update on scroll for direction detection
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateIndicator();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // Initialize section indicator
  createSectionIndicator();

  // --- 5. Enhanced Animate on Scroll ---
  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { 
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px' // Trigger slightly before element enters viewport
  });

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    scrollObserver.observe(el);
  });

  // --- 4. Hybrid Storage View Toggle ---
  const viewToggle = document.querySelector('.view-toggle');
  if (viewToggle) {
    const customerOnlyCard = document.querySelector('.mini-card.customer-only');
    const itOnlyCard = document.querySelector('.mini-card.it-only');

    viewToggle.addEventListener('click', (e) => {
      if (!e.target.matches('button')) return;

      const view = e.target.dataset.view;
      
      // Update buttons
      viewToggle.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      });
      e.target.classList.add('is-active');
      e.target.setAttribute('aria-selected', 'true');

      // Toggle cards
      if (customerOnlyCard && itOnlyCard) {
        const isITView = view === 'it';
        customerOnlyCard.classList.toggle('hidden', isITView);
        itOnlyCard.classList.toggle('hidden', !isITView);
      }
    });
  }

  // --- 5. Waitlist Form Submission ---
  const waitlistForm = document.getElementById('waitlist-form');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const emailInput = form.querySelector('#email');
      const submitButton = form.querySelector('button[type="submit"]');
      const messageTarget = document.getElementById(form.dataset.messageTarget);

      if (!messageTarget || !submitButton) {
        return;
      }

      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.innerHTML;
      submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Requesting...';
      messageTarget.className = 'form-message';

      const apiBase = resolveApiBase();
      const endpoint = form.dataset.endpoint || '/waitlist';

      try {
        const api = window.OrbsurvApi;
        if (api && typeof api.postJSON === 'function') {
          await api.postJSON(endpoint, { email: emailInput.value });
        } else {
          const url = endpoint.startsWith('/') ? `${apiBase}${endpoint}` : `${apiBase}/${endpoint}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email: emailInput.value }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result && result.error ? result.error : `Request failed (${response.status})`);
          }
        }

        messageTarget.textContent = form.dataset.successMessage || 'Success!';
        messageTarget.classList.add('success', 'show');
        emailInput.value = '';
        submitButton.innerHTML = '<i class="fa-solid fa-check"></i> Success!';
      } catch (error) {
        console.error('Form submission error:', error);
        messageTarget.textContent = (error && error.message) || 'Something went wrong. Please try again.';
        messageTarget.classList.add('error', 'show');
        submitButton.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Request invite';
        submitButton.disabled = false;
      } finally {
        window.setTimeout(() => {
          messageTarget.classList.remove('show');
        }, 5000);
      }
    });
  }

  // --- 6. Footer Year ---
  const yearSpan = document.querySelector('[data-year]');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // --- 7. 3D Model (STL) Viewer ---
  const stlSlide = document.querySelector('.stl-slide');
  if (stlSlide) {
    const canvas = stlSlide.querySelector('.stl-canvas');
    const modelPath = stlSlide.dataset.stl;

    if (canvas && modelPath) {
      const statusEl = canvas.querySelector('.stl-canvas-status');
      if (statusEl) {
        statusEl.textContent = 'Preparing 3D preview...';
      }

      ensureThreeBundle()
        .then((THREE) => {
          if (!THREE || !THREE.OrbitControls || !THREE.STLLoader) {
            throw new Error('Three.js helpers not available');
          }

          const scene = new THREE.Scene();
          scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim());

          const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
          camera.position.z = 150;

          const renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(canvas.clientWidth, canvas.clientHeight);
          renderer.setPixelRatio(window.devicePixelRatio);
          canvas.appendChild(renderer.domElement);

          const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
          scene.add(ambientLight);
          const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
          directionalLight.position.set(50, 50, 100);
          scene.add(directionalLight);

          const controls = new THREE.OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
          controls.dampingFactor = 0.05;
          controls.autoRotate = true;
          controls.autoRotateSpeed = 1.0;

          const loader = new THREE.STLLoader();
          loader.load(
            modelPath,
            (geometry) => {
              const material = new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                metalness: 0.25,
                roughness: 0.75,
              });
              const mesh = new THREE.Mesh(geometry, material);

              geometry.computeBoundingBox();
              const box = geometry.boundingBox;
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              const scale = 100 / maxDim;

              mesh.position.sub(center.multiplyScalar(scale));
              mesh.scale.set(scale, scale, scale);

              scene.add(mesh);
              if (statusEl) {
                statusEl.remove();
              }
            },
            (xhr) => {
              if (statusEl) {
                const percent = xhr.total ? Math.round((xhr.loaded / xhr.total) * 100) : Math.round(xhr.loaded);
                statusEl.textContent = `Loading 3D model... ${percent}%`;
              }
            },
            (error) => {
              console.error('An error happened while loading the STL model:', error);
              if (statusEl) {
                statusEl.textContent = 'Error: Could not load 3D model.';
              } else {
                canvas.textContent = 'Error: Could not load 3D model.';
              }
            }
          );

          function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
          }
          animate();

          window.addEventListener('resize', () => {
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
          });
        })
        .catch((error) => {
          console.error('3D viewer initialisation failed:', error);
          if (statusEl) {
            statusEl.textContent = 'Error: Could not load 3D model.';
          } else {
            canvas.textContent = 'Error: Could not load 3D model.';
          }
        });
    }
  }
});

const reportedErrors = new Set();

function enqueueClientError(report) {
  if (!report || !report.message) {
    return;
  }
  if (reportedErrors.size > 50) {
    reportedErrors.clear();
  }
  const keyParts = [report.message, report.url, report.line, report.column].filter(Boolean);
  const key = keyParts.join('|');
  if (reportedErrors.has(key)) {
    return;
  }
  reportedErrors.add(key);

  const payload = {
    message: report.message || 'Unknown client error',
    stack: report.stack ? String(report.stack).slice(0, 8000) : undefined,
    url: report.url || window.location.href,
    line: report.line ?? undefined,
    column: report.column ?? undefined,
    user_agent: navigator.userAgent,
  };

  const api = window.OrbsurvApi;
  if (api && typeof api.postJSON === 'function') {
    api.postJSON('/client_errors', payload).catch(() => {
      /* swallow */
    });
    return;
  }

  const base = resolveApiBase();
  const url = `${base}/client_errors`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* swallow */
  });
}

window.addEventListener('error', (event) => {
  if (!event) {
    return;
  }
  const ignoreMessages = ['ResizeObserver loop limit exceeded', 'ResizeObserver loop completed with undelivered notifications.'];
  if (ignoreMessages.includes(event.message)) {
    return;
  }
  const payload = {
    message: event.message,
    stack: event.error && event.error.stack,
    url: event.filename || window.location.href,
    line: event.lineno,
    column: event.colno,
  };
  enqueueClientError(payload);
});

window.addEventListener('unhandledrejection', (event) => {
  if (!event) {
    return;
  }
  const reason = event.reason;
  let message = 'Unhandled promise rejection';
  if (typeof reason === 'string' && reason) {
    message = reason;
  } else if (reason && typeof reason === 'object' && typeof reason.message === 'string' && reason.message) {
    message = reason.message;
  }
  const payload = {
    message,
    stack: reason && reason.stack,
    url: window.location.href,
  };
  enqueueClientError(payload);
});
window.showSiteMessage = showSiteMessage;
window.OrbsurvUI = Object.assign({}, window.OrbsurvUI || {}, {
  showMessage: showSiteMessage,
  bindForms: bindGlobalFormHandlers,
});
window.resolveApiBase = resolveApiBase;
