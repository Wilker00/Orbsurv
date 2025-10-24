document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-form');
  const tokenInput = document.getElementById('reset-token');
  const passwordInput = document.getElementById('reset-password');
  const confirmInput = document.getElementById('reset-confirm');
  const messageBox = document.getElementById('reset-message');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token || !tokenInput) {
    if (messageBox) {
      messageBox.textContent = 'Reset link is missing or expired. Please request a new email.';
      messageBox.classList.add('is-visible', 'is-error');
    }
    if (form) {
      form.querySelectorAll('input, button').forEach((el) => {
        el.disabled = true;
      });
    }
    return;
  }

  tokenInput.value = token;

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    const password = passwordInput.value.trim();
    const confirm = confirmInput.value.trim();
    if (password !== confirm) {
      event.preventDefault();
      if (messageBox) {
        messageBox.textContent = 'Passwords do not match.';
        messageBox.classList.add('is-visible', 'is-error');
      }
      return;
    }
    handleFormSubmit(event, form);
  });

  form.addEventListener('orbsurv:form-success', () => {
    if (messageBox) {
      messageBox.classList.remove('is-error');
    }
    window.setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  });
});
