(function(){
  const DEFAULT_BASE = 'http://127.0.0.1:8000';
  const configuredBase = (window.ORBSURV_API_BASE || DEFAULT_BASE).toString().trim();
  const API_BASE = configuredBase.endsWith('/') ? configuredBase.slice(0, -1) : configuredBase;

  function resolveEndpoint(endpoint) {
    if (!endpoint) {
      throw new Error('Missing API endpoint');
    }
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }
    return `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  async function postJSON(endpoint, payload) {
    const response = await fetch(resolveEndpoint(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let body = null;
    try {
      body = await response.json();
    } catch (error) {
      // Ignore JSON parsing errors for empty responses.
    }

    if (!response.ok) {
      const message = body && body.error ? body.error : `Request failed (${response.status})`;
      const err = new Error(message);
      err.status = response.status;
      err.body = body;
      throw err;
    }

    return body || {};
  }

  function showMessage(target, text, type) {
    if (!target) return;
    target.textContent = text;
    target.style.display = 'block';
    target.classList.add('is-visible');
    target.classList.toggle('is-error', type === 'error');

    clearTimeout(target._orbsurvTimeout);
    target._orbsurvTimeout = window.setTimeout(() => {
      target.classList.remove('is-visible');
      target.classList.remove('is-error');
    }, 4000);
  }

  function sanitizePayload(payload) {
    const snapshot = {};
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (typeof key === 'string' && key.toLowerCase().includes('password')) {
        snapshot[key] = '[redacted]';
      } else {
        snapshot[key] = value;
      }
    });
    return snapshot;
  }

  async function handleFormSubmit(event, form) {
    event.preventDefault();
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      console.warn('Form missing data-endpoint attribute', form);
      return;
    }

    const successMessage = form.dataset.successMessage || 'Thanks! We received your submission.';
    const errorMessage = form.dataset.errorMessage || 'Sorry, there was a problem. Please try again.';
    const targetId = form.dataset.messageTarget || (form.id ? `${form.id.replace(/-form$/, '')}-message` : '');
    const messageBox = targetId ? document.getElementById(targetId) : null;

    if (messageBox) {
      messageBox.textContent = 'Sending...';
      messageBox.style.display = 'block';
      messageBox.classList.add('is-visible');
      messageBox.classList.remove('is-error');
    }

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });

    const safePayload = sanitizePayload(payload);

    try {
      await postJSON(endpoint, payload);
      form.dispatchEvent(new CustomEvent('orbsurv:form-success', { detail: { endpoint, payload: safePayload } }));
      if (messageBox) {
        showMessage(messageBox, successMessage, 'success');
      } else {
        window.alert(successMessage);
      }
      form.reset();
    } catch (error) {
      const message = error && error.message ? error.message : errorMessage;
      form.dispatchEvent(new CustomEvent('orbsurv:form-error', { detail: { endpoint, payload: safePayload, message } }));
      console.error('Submission failed', error);
      if (messageBox) {
        showMessage(messageBox, message, 'error');
      } else {
        window.alert(message);
      }
    }
  }

  window.handleFormSubmit = handleFormSubmit;
  window.OrbsurvForms = { handleFormSubmit, showMessage, postJSON, API_BASE };
})();
