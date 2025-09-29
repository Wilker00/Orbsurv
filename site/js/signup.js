document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-endpoint]').forEach((form) => {
    form.addEventListener('submit', (event) => handleFormSubmit(event, form));
  });

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('orbsurv:form-success', (event) => {
      const detail = event.detail || {};
      const payload = detail.payload || {};
      const email = typeof payload.email === 'string' ? payload.email : '';
      if (email) {
        sessionStorage.setItem('orbsurv:lastSignupEmail', email);
      }
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 900);
    });
  }

  
  const toggle = document.getElementById('theme-toggle');
  const applyTheme = (dark) => document.body.classList.toggle('dark-mode', dark);
  const saved = localStorage.getItem('orbsurv-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialDark = saved ? saved === 'dark' : prefersDark;
  applyTheme(initialDark);
  if (toggle) {
    toggle.checked = initialDark;
    toggle.addEventListener('change', () => {
      const next = toggle.checked;
      applyTheme(next);
      localStorage.setItem('orbsurv-theme', next ? 'dark' : 'light');
    });
  }
});
