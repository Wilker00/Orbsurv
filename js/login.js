document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-endpoint]').forEach((form) => {
    if (form.dataset.orbsurvBound === 'true') {
      return;
    }
    form.addEventListener('submit', (event) => handleFormSubmit(event, form));
    form.dataset.orbsurvBound = 'true';
  });

  // Handle dev access toggle
  const devAccessSection = document.querySelector('.dev-access-section');
  const otpInput = document.getElementById('login-otp');
  const scopeInput = document.getElementById('login-scope');
  
  if (devAccessSection && otpInput && scopeInput) {
    devAccessSection.addEventListener('toggle', (event) => {
      if (event.target.open) {
        scopeInput.value = 'dev';
        otpInput.required = true;
      } else {
        scopeInput.value = 'user';
        otpInput.required = false;
        otpInput.value = '';
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    // Ensure scope is set correctly when OTP is provided
    if (otpInput) {
      otpInput.addEventListener('input', () => {
        if (otpInput.value.trim() && scopeInput) {
          scopeInput.value = 'dev';
        } else if (scopeInput && !devAccessSection?.open) {
          scopeInput.value = 'user';
        }
      });
    }

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
      
      // Redirect based on role
      const role = (response && response.role) || (response && response.user && response.user.role);
      const returnToAdmin = sessionStorage.getItem('orbsurv:returnToAdmin');
      
      let nextRoute = 'account.html';
      if (role === 'dev' || returnToAdmin) {
        nextRoute = returnToAdmin || 'admin.html';
        sessionStorage.removeItem('orbsurv:returnToAdmin');
      }
      
      sessionStorage.removeItem('orbsurv:lastSignupEmail');
      setTimeout(() => {
        window.location.href = nextRoute;
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


