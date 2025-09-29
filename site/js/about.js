document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', (event) => handleFormSubmit(event, contactForm));
    }

    const toggle = document.getElementById('theme-toggle');
    const applyTheme = (dark) => document.body.classList.toggle('dark-mode', dark);
    const saved = localStorage.getItem('orbsurv-theme');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved ? saved === 'dark' : prefers);

    if (toggle) {
      toggle.checked = document.body.classList.contains('dark-mode');
      toggle.addEventListener('change', () => {
        const next = toggle.checked;
        applyTheme(next);
        localStorage.setItem('orbsurv-theme', next ? 'dark' : 'light');
      });
    }
  });
