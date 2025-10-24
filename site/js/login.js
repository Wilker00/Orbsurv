document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-endpoint]').forEach((form) => {
    if (form.dataset.orbsurvBound === 'true') {
      return;
    }
    form.addEventListener('submit', (event) => handleFormSubmit(event, form));
    form.dataset.orbsurvBound = 'true';
  });

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('orbsurv:form-success', (event) => {
      const detail = event.detail || {};
      const payload = detail.payload || {};
      const response = detail.response || {};
      if (response && typeof response === 'object' && window.OrbsurvAuth && typeof window.OrbsurvAuth.storeTokens === 'function') {
        window.OrbsurvAuth.storeTokens(response);
      }
      const email =
        (response && response.user && response.user.email) ||
        (typeof payload.email === 'string' ? payload.email : '');
      if (email) {
        sessionStorage.setItem('orbsurv:adminUser', email);
      }
      sessionStorage.removeItem('orbsurv:lastSignupEmail');
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 700);
    });

    loginForm.addEventListener('orbsurv:form-error', () => {
      sessionStorage.removeItem('orbsurv:adminUser');
      if (window.OrbsurvAuth && typeof window.OrbsurvAuth.clearTokens === 'function') {
        window.OrbsurvAuth.clearTokens();
      }
    });
  }

  const savedSignupEmail = sessionStorage.getItem('orbsurv:lastSignupEmail');
  if (savedSignupEmail) {
    const emailField = document.getElementById('login-email');
    if (emailField && !emailField.value) {
      emailField.value = savedSignupEmail;
    }
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
