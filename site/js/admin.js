const ADMIN_PASS = 'ORBSURV-DEV-2025';
const DEV_CREDENTIALS = {
  email: 'admin@orbsurv.com',
  password: 'admin123',
  otp: '000000',
  scope: 'dev'
};

const STORAGE_KEYS = {
  unlocked: 'orbsurv_admin_unlocked',
  data: 'orbsurv_admin_data'
};
const THEME_KEY = 'orbsurv-theme';

const INITIAL_STATE = {
  submissions: [],
  passwordEvents: [],
  audit: [],
  summary: null,
  users: []
};

let state = clone(INITIAL_STATE);
let backendLoadPromise = null;
let hasLoadedBackendData = false;
let isUsingBackendData = false;

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => console.error('Admin init failed', error));
});

async function init() {
  await loadLayoutPartials();
  document.body.classList.add('is-admin-page');
  initThemeSwitch();
  revealDevBadge();

  bindUI();

  const unlocked = readUnlocked();

  if (unlocked) {
    try {
      const hasAccess = await ensureDevAccess({ interactive: false });
      if (hasAccess) {
        await unlockDashboard({ skipAudit: true });
        return;
      }
    } catch (error) {
      console.warn('Unable to restore dev session automatically', error);
    }
  }

  writeUnlocked(false);
  if (unlocked) {
    showToast('Sign in again to continue.', 'info');
  }
  showPasscodeModal();
}

function bindUI() {
  const passcodeForm = document.querySelector('[data-passcode-form]');
  if (passcodeForm) {
    passcodeForm.addEventListener('submit', handlePasscodeSubmit);
  }

  const submissionsBody = document.querySelector('[data-submissions-body]');
  if (submissionsBody) {
    submissionsBody.addEventListener('click', handleSubmissionAction);
  }

  const emailForm = document.querySelector('[data-email-form]');
  if (emailForm) {
    emailForm.addEventListener('submit', handleEmailSubmit);
    emailForm.addEventListener('click', handleEmailAux);
  }

  const controlsContainer = document.querySelector('.system-actions');
  if (controlsContainer) {
    controlsContainer.addEventListener('click', handleSystemAction);
  }

  const importInput = document.querySelector('[data-import-input]');
  if (importInput) {
    importInput.addEventListener('change', handleImportChange);
  }
}

function readTokenRecord() {
  const orbsurvAuth = window.OrbsurvAuth;
  if (orbsurvAuth && typeof orbsurvAuth.getTokens === 'function') {
    return orbsurvAuth.getTokens();
  }
  try {
    const raw = localStorage.getItem('orbsurv:authTokens');
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

async function ensureDevAccess({ interactive = false } = {}) {
  const tokenRecord = readTokenRecord();
  const orbsurvAuth = window.OrbsurvAuth;

  try {
    const token = await getAuthToken();
    if (token && tokenRecord && tokenRecord.role === 'dev') {
      return true;
    }
  } catch (error) {
    console.error('Unable to resolve auth token for admin access', error);
  }

  if (!interactive) {
    return false;
  }

  await authenticateWithBackend();

  const refreshed = readTokenRecord();
  const nextToken = await getAuthToken().catch(() => null);
  if (nextToken && refreshed && refreshed.role === 'dev') {
    return true;
  }

  return false;
}

function redirectToLogin() {
  try {
    sessionStorage.setItem('orbsurv:returnToAdmin', window.location.pathname);
  } catch (_) {
    /* ignore storage errors */
  }
  window.location.href = 'login.html';
}

async function ensureBackendData() {
  if (hasLoadedBackendData) {
    return;
  }
  if (!backendLoadPromise) {
    backendLoadPromise = loadBackendData()
      .then(() => {
        hasLoadedBackendData = true;
      })
      .catch((error) => {
        hasLoadedBackendData = false;
        throw error;
      });
  }
  try {
    await backendLoadPromise;
  } finally {
    if (!hasLoadedBackendData) {
      backendLoadPromise = null;
    }
  }
}

async function loadLayoutPartials() {
  const partialHosts = Array.from(document.querySelectorAll('[data-include]'));
  if (!partialHosts.length) return;

  await Promise.all(
    partialHosts.map(async (host) => {
      const path = host.getAttribute('data-include');
      if (!path) return;
      try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`);
        const markup = await response.text();
        host.innerHTML = markup;
      } catch (error) {
        console.warn('Partial load failed:', path, error);
        host.innerHTML = `<div class="wrap" style="padding:24px;color:#dc2626;">Unable to load ${path}</div>`;
      }
    })
  );
}

function revealDevBadge() {
  const badge = document.querySelector('[data-dev-badge]');
  if (badge) {
    badge.hidden = !window.location.pathname.includes('admin.html');
  }
}

function initThemeSwitch() {
  const toggles = document.querySelectorAll('.theme-switch input');
  if (!toggles.length) return;

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  const readTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (_) {
      return null;
    }
  };

  const writeTheme = (value) => {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (_) {
      /* ignore */
    }
  };

  const applyTheme = (isDark, { persist = true } = {}) => {
    document.body.classList.toggle('dark-mode', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    toggles.forEach((toggle) => {
      toggle.checked = isDark;
    });
    if (persist) {
      writeTheme(isDark ? 'dark' : 'light');
    }
  };

  toggles.forEach((toggle) => {
    toggle.addEventListener('change', (event) => {
      applyTheme(event.target.checked);
    });
  });

  const storedTheme = readTheme();
  const initialDark = storedTheme ? storedTheme === 'dark' : prefersDark.matches;
  applyTheme(initialDark, { persist: !!storedTheme });

  if (!storedTheme) {
    const listener = (event) => applyTheme(event.matches, { persist: false });
    if (typeof prefersDark.addEventListener === 'function') {
      prefersDark.addEventListener('change', listener);
    } else if (typeof prefersDark.addListener === 'function') {
      prefersDark.addListener(listener);
    }
  }
}

async function handlePasscodeSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector('#admin-passcode');
  const feedback = form.querySelector('[data-passcode-feedback]');
  if (!input) return;

  const value = input.value.trim();
  if (!value.length) {
    setFeedback(feedback, 'Enter the admin passcode to continue.', true);
    return;
  }

  if (value === ADMIN_PASS) {
    let hasAccess = false;
    try {
      hasAccess = await ensureDevAccess({ interactive: true });
    } catch (error) {
      console.error('Dev authentication failed during unlock', error);
    }

    writeUnlocked(true);

    try {
      await unlockDashboard();
      input.value = '';
      setFeedback(feedback, '');
      showToast(hasAccess ? 'Dev Mode unlocked.' : 'Dev Mode unlocked (limited data).', 'success');
    } catch (error) {
      console.error('Unable to unlock Dev Mode', error);
      setFeedback(feedback, 'Unable to load admin data. Try again.', true);
      return;
    }

    if (!hasAccess) {
      showToast('Sign in with a developer account to see live data.', 'info');
    }
  } else {
    setFeedback(feedback, 'Incorrect passcode. Try again.', true);
    input.focus();
  }
}

async function authenticateWithBackend() {
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: DEV_CREDENTIALS.email,
        password: DEV_CREDENTIALS.password,
        scope: DEV_CREDENTIALS.scope,
        otp: DEV_CREDENTIALS.otp
      })
    });

    if (!response.ok) {
      let detail = '';
      try {
        const failure = await response.json();
        detail = failure?.detail || failure?.message || failure?.error || '';
      } catch (_) {
        detail = await response.text();
      }
      throw new Error(detail || `Login failed (${response.status})`);
    }

    const data = await response.json();

    if (window.OrbsurvAuth && typeof window.OrbsurvAuth.storeTokens === 'function') {
      window.OrbsurvAuth.storeTokens(data);
    } else {
      const record = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        role: data.role,
        user: data.user,
        tokenType: data.token_type,
        storedAt: Date.now()
      };
      try {
        localStorage.setItem('orbsurv:authTokens', JSON.stringify(record));
      } catch (error) {
        console.warn('Unable to persist auth tokens to storage', error);
      }
    }

    return data;
  } catch (error) {
    console.error('Backend authentication failed:', error);
    throw error;
  }
}

async function unlockDashboard({ skipAudit = false } = {}) {
  const modal = document.querySelector('[data-passcode-modal]');
  const content = document.querySelector('[data-admin-content]');

  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('hidden', 'hidden');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.add('is-hidden');
    requestAnimationFrame(() => {
      if (modal && modal.parentElement) {
        modal.parentElement.removeChild(modal);
      }
    });
  }
  if (content) {
    content.style.display = 'block';
    content.removeAttribute('hidden');
  }
  document.body.classList.add('admin-unlocked');
  document.body.classList.remove('admin-locked');

  try {
    await ensureBackendData();
  } catch (error) {
    console.error('Unable to ensure backend data while unlocking dashboard', error);
    showToast('Unable to load admin data. Refresh and try again.', 'error');
    return;
  }
  
  if (skipAudit) {
    render();
  } else {
    commit({ audit: 'Unlocked Dev Mode' });
  }
}

function showPasscodeModal() {
  const modal = document.querySelector('[data-passcode-modal]');
  const content = document.querySelector('[data-admin-content]');
  const input = document.querySelector('#admin-passcode');
  
  if (modal) {
    modal.style.display = 'grid';
    modal.removeAttribute('hidden');
    modal.removeAttribute('aria-hidden');
    modal.classList.remove('is-hidden');
  }
  if (content) {
    content.style.display = 'none';
    content.setAttribute('hidden', 'hidden');
  }
  if (input) {
    setTimeout(() => input.focus(), 100);
  }
  document.body.classList.add('admin-locked');
  document.body.classList.remove('admin-unlocked');
}

function handleSubmissionAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;
  if (!id) return;

  const submission = state.submissions.find((item) => item.id === id);
  if (!submission) return;

  switch (button.dataset.action) {
    case 'view': {\n      console.info('Viewing submission', submission);\n      showToast(`${submission.name} <${submission.email}> - ${submission.source}`, 'info');\n      commit({ audit: `Viewed submission ${id}`, render: false });\n      renderAudit();\n      break;\n    }\n    case 'email': {
      console.info('Emailing submission', submission);
      openMailClient(submission.email, `Follow-up from Orbsurv`, '');
      commit({ audit: `Opened mail client for ${submission.email}` });
      break;
    }
    case 'delete': {
      if (isUsingBackendData) {
        showToast('Use backend tools to remove live submissions.', 'info');
        return;
      }
      const confirmed = window.confirm(`Delete submission ${id}?`);
      if (!confirmed) return;
      state.submissions = state.submissions.filter((item) => item.id !== id);
      commit({ audit: `Deleted submission ${id}` });
      showToast(`Submission ${id} deleted`, 'info');
      break;
    }
    default:
      break;
  }
}

async function handleEmailSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = form.querySelector('[data-email-feedback]');
  const submitButton = form.querySelector('[type="submit"]');
  const formData = new FormData(form);
  const to = (formData.get('to') || '').toString().trim();
  const subject = (formData.get('subject') || '').toString().trim();
  const body = (formData.get('body') || '').toString().trim();

  if (!to || !subject || !body) {
    setFeedback(feedback, 'All fields are required to send email.', true);
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending';
  }

  try {
    const token = await requireAuthToken();
    const response = await fetch('/api/v1/admin/send-email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ to, subject, body })
    });

    if (!response.ok) {
      let detail = '';
      try {
        const data = await response.json();
        detail = data?.detail || data?.message || data?.error || '';
      } catch (_) {
        detail = await response.text();
      }
      throw new Error(detail || `Request failed (${response.status})`);
    }

    setFeedback(feedback, 'Email sent and logged.');
    commit({ audit: `Sent email to ${to}` });
    showToast(`Email sent to ${to}`, 'success');
    form.reset();
  } catch (error) {
    console.error('Email send failed', error);
    setFeedback(feedback, error && error.message ? error.message : 'Unable to send email.', true);
    showToast('Email delivery failed.', 'error');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      if (submitButton.dataset.originalText) {
        submitButton.innerHTML = submitButton.dataset.originalText;
      }
    }
  }
}

function handleEmailAux(event) {
  const button = event.target.closest('button[data-email-action="mailto"]');
  if (!button) return;

  const form = button.closest('form');
  if (!form) return;

  const formData = new FormData(form);
  const to = (formData.get('to') || '').toString().trim();
  const subject = (formData.get('subject') || '').toString().trim();
  const body = (formData.get('body') || '').toString().trim();

  if (!to) {
    setFeedback(form.querySelector('[data-email-feedback]'), 'Provide an email address first.', true);
    return;
  }

  openMailClient(to, subject, body);
  commit({ audit: `Opened mail client for ${to}` });
  showToast(`Mail client opened for ${to}`, 'info');
}

function handleSystemAction(event) {
  const button = event.target.closest('button[data-system-action]');
  if (!button) return;

  const action = button.dataset.systemAction;
  switch (action) {
    case 'export':
      exportJSON();
      break;
    case 'import':
      triggerImport();
      break;
    case 'clear':
      clearAllData();
      break;
    default:
      break;
  }
}

function exportJSON() {
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orbsurv-admin-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    commit({ audit: 'Exported admin data' });
    showToast('Admin data exported.', 'success');
  } catch (error) {
    console.error('Export failed', error);
    showToast('Export failed. See console for details.', 'error');
  }
}

function triggerImport() {
  const input = document.querySelector('[data-import-input]');
  if (input) {
    input.value = '';
    input.click();
  }
}

function handleImportChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (isUsingBackendData) {
    showToast('Import is disabled while viewing live backend data.', 'info');
    event.target.value = '';
    return;
  }

  const proceed = window.confirm('Replace current admin data with imported JSON?');
  if (!proceed) {
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    try {
      const raw = loadEvent.target?.result;
      const parsed = JSON.parse(raw);
      const validated = sanitizeData(parsed);
      state = validated;
      commit({ audit: `Imported admin data from ${file.name}` });
      showToast('Import successful.', 'success');
    } catch (error) {
      console.error('Import failed', error);
      showToast('Import failed. Invalid JSON.', 'error');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  const confirmed = window.confirm('Clear all admin data? This cannot be undone.');
  if (!confirmed) return;

  if (isUsingBackendData) {
    showToast('Live data is sourced from the backend. Refresh to re-sync latest submissions.', 'info');
    return;
  }

  state = clone(INITIAL_STATE);
  commit({ audit: 'Cleared all admin data' });
  showToast('All admin data cleared.', 'info');
}

async function requireAuthToken() {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required for admin data');
  }
  return token;
}

async function loadBackendData() {
  const token = await requireAuthToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  };

  const fetchJson = async (url) => {
    let response;
    try {
      response = await fetch(url, { headers });
    } catch (networkError) {
      throw new Error(`Network request failed for ${url}: ${networkError && networkError.message ? networkError.message : networkError}`);
    }

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.detail || body?.message || body?.error || '';
      } catch (_) {
        detail = await response.text();
      }
      throw new Error(`${url} failed (${response.status})${detail ? `: ${detail}` : ''}`);
    }

    return response.json();
  };

  const [summary, logsData, usersData, waitlistData, contactData, pilotData, investorData] = await Promise.all([
    fetchJson('/api/v1/admin/summary'),
    fetchJson('/api/v1/admin/logs'),
    fetchJson('/api/v1/admin/users'),
    fetchJson('/api/v1/admin/waitlist'),
    fetchJson('/api/v1/admin/contacts'),
    fetchJson('/api/v1/admin/pilot-requests'),
    fetchJson('/api/v1/admin/investor-interest')
  ]);

  state = {
    submissions: buildSubmissions(waitlistData, contactData, pilotData, investorData),
    passwordEvents: Array.isArray(state.passwordEvents) ? state.passwordEvents : [],
    audit: buildAuditEntries(logsData?.items),
    summary,
    users: Array.isArray(usersData?.items) ? usersData.items : []
  };

  isUsingBackendData = true;
}

function buildAuditEntries(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .filter(Boolean)
    .map((log) => ({
      id: `a-${log.id}`,
      text: `${log.action}${log.actor_email ? ` by ${log.actor_email}` : ''}`,
      at: log.created_at
    }))
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
}

function buildSubmissions(waitlistData, contactData, pilotData, investorData) {
  const submissions = [];

  if (Array.isArray(waitlistData?.items)) {
    submissions.push(
      ...waitlistData.items.map((item) => ({
        id: `w-${item.id}`,
        name: item.name || 'Anonymous',
        email: item.email,
        source: item.source || 'waitlist',
        createdAt: item.created_at,
        type: 'waitlist'
      }))
    );
  }

  if (Array.isArray(contactData?.items)) {
    submissions.push(
      ...contactData.items.map((item) => ({
        id: `c-${item.id}`,
        name: item.name,
        email: item.email,
        source: 'contact form',
        createdAt: item.created_at,
        type: 'contact',
        message: item.message
      }))
    );
  }

  if (Array.isArray(pilotData?.items)) {
    submissions.push(
      ...pilotData.items.map((item) => ({
        id: `p-${item.id}`,
        name: item.name,
        email: item.email,
        source: `pilot request - ${item.org}`,
        createdAt: item.created_at,
        type: 'pilot',
        useCase: item.use_case
      }))
    );
  }

  if (Array.isArray(investorData?.items)) {
    submissions.push(
      ...investorData.items.map((item) => ({
        id: `i-${item.id}`,
        name: item.name,
        email: item.email,
        source: `investor interest${item.amount ? ` - ${item.amount}` : ''}`,
        createdAt: item.created_at,
        type: 'investor',
        note: item.note
      }))
    );
  }

  return submissions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

async function getAuthToken() {
  // Try to get token from OrbsurvAuth if available
  if (window.OrbsurvAuth && window.OrbsurvAuth.getAccessToken) {
    return await window.OrbsurvAuth.getAccessToken();
  }
  
  // Fallback: try to get from localStorage
  try {
    const tokens = localStorage.getItem('orbsurv:authTokens');
    if (tokens) {
      const parsed = JSON.parse(tokens);
      return parsed.accessToken;
    }
  } catch (error) {
    console.warn('Could not get auth token:', error);
  }
  
  return null;
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.data);
    if (!stored) {
      const empty = clone(INITIAL_STATE);
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(empty));
      return empty;
    }
    const parsed = JSON.parse(stored);
    return sanitizeData(parsed);
  } catch (error) {
    console.warn('Resetting admin data due to error', error);
    const empty = clone(INITIAL_STATE);
    try {
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(empty));
    } catch (_) {
      /* ignore storage errors */
    }
    return empty;
  }
}

function sanitizeData(raw) {
  return {
    submissions: Array.isArray(raw?.submissions) ? raw.submissions : [],
    passwordEvents: Array.isArray(raw?.passwordEvents) ? raw.passwordEvents : [],
    audit: Array.isArray(raw?.audit) ? raw.audit : [],
    summary: raw && typeof raw.summary === 'object' ? raw.summary : null,
    users: Array.isArray(raw?.users) ? raw.users : []
  };
}

function commit({ audit, render: shouldRender = true } = {}) {
  if (audit) {
    state.audit.unshift({
      id: `a-${Date.now()}`,
      text: audit,
      at: new Date().toISOString()
    });
  }

  if (state.audit.length > 500) {
    state.audit.length = 500;
  }

  saveData();

  if (shouldRender) {
    render();
  }
}

function render() {
  try {
    renderSubmissions();
    renderPasswordEvents();
    renderAudit();
    renderMetrics();
  } catch (error) {
    console.error('Error rendering admin dashboard:', error);
    showToast('Error rendering dashboard', 'error');
  }
}

function renderSubmissions() {
  const tbody = document.querySelector('[data-submissions-body]');
  if (!tbody) {
    console.warn('Submissions body element not found');
    return;
  }

  if (!state.submissions.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No submissions yet.</td></tr>`;
    return;
  }

  const rows = [...state.submissions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(
      (item) => `
        <tr>
          <td><code>${escapeHtml(item.id)}</code></td>
          <td>${escapeHtml(item.name)}</td>
          <td><a href="mailto:${encodeURIComponent(item.email)}">${escapeHtml(item.email)}</a></td>
          <td>${escapeHtml(item.source)}</td>
          <td><time datetime="${escapeHtml(item.createdAt)}">${formatDateTime(item.createdAt)}</time></td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn btn-secondary btn-compact" data-action="view" data-id="${escapeAttr(
                item.id
              )}"><i class="fa-solid fa-eye"></i> View</button>
              <button type="button" class="btn btn-secondary btn-compact" data-action="email" data-id="${escapeAttr(
                item.id
              )}"><i class="fa-solid fa-envelope"></i> Email</button>
              <button type="button" class="btn btn-outline btn-compact danger" data-action="delete" data-id="${escapeAttr(
                item.id
              )}"><i class="fa-solid fa-trash-can"></i> Delete</button>
            </div>
          </td>
        </tr>
      `
    )
    .join('');

  tbody.innerHTML = rows;
}

function renderPasswordEvents() {
  const tbody = document.querySelector('[data-password-body]');
  if (!tbody) {
    console.warn('Password events body element not found');
    return;
  }

  if (!state.passwordEvents.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No password activity collected.</td></tr>`;
    return;
  }

  const rows = [...state.passwordEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map(
      (item) => `
        <tr>
          <td><code>${escapeHtml(item.id)}</code></td>
          <td>${escapeHtml(item.userId)}</td>
          <td>${escapeHtml(item.event)}</td>
          <td>${maskLength(item.newLen)}</td>
          <td><time datetime="${escapeHtml(item.at)}">${formatDateTime(item.at)}</time></td>
        </tr>
      `
    )
    .join('');

  tbody.innerHTML = rows;
}

function renderAudit() {
  const list = document.querySelector('[data-audit-log]');
  if (!list) {
    console.warn('Audit log element not found');
    return;
  }

  if (!state.audit.length) {
    list.innerHTML = `<li class="empty-state">No audit events recorded.</li>`;
    return;
  }

  const items = state.audit
    .slice(0, 100)
    .map(
      (entry) => `
        <li>
          <span>${escapeHtml(entry.text)}</span>
          <time datetime="${escapeHtml(entry.at)}">${formatDateTime(entry.at)}</time>
        </li>
      `
    )
    .join('');

  list.innerHTML = items;
}

function renderMetrics() {
  const summary = state.summary;
  const totalSubmissions = summary
    ? summary.total_contacts + summary.total_waitlist + summary.total_pilot_requests + summary.total_investor_interest
    : state.submissions.length;

  setText('[data-count-submissions]', totalSubmissions.toString());

  const userCount = summary ? summary.total_users : state.passwordEvents.length;
  setText('[data-count-users]', userCount.toString());
  setText('[data-count-passwords]', userCount.toString());

  setText('[data-count-audit]', state.audit.length.toString());
  setText('[data-count-waitlist]', summary ? summary.total_waitlist.toString() : '0');
  setText('[data-count-contacts]', summary ? summary.total_contacts.toString() : '0');
  setText('[data-count-pilot]', summary ? summary.total_pilot_requests.toString() : '0');
  setText('[data-count-investor]', summary ? summary.total_investor_interest.toString() : '0');
}

function saveData() {
  if (isUsingBackendData) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to persist admin data', error);
  }
}

function readUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEYS.unlocked) === 'true';
  } catch (_) {
    return false;
  }
}

function writeUnlocked(value) {
  try {
    localStorage.setItem(STORAGE_KEYS.unlocked, value ? 'true' : 'false');
  } catch (_) {
    /* ignore */
  }
}

function openMailClient(to, subject, body) {
  const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(
    body || ''
  )}`;
  window.open(href, '_blank', 'noopener');
}

function setFeedback(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', !!isError);
}

let toastTimeout = null;
function showToast(message, type = 'info') {
  const toast = document.querySelector('[data-toast]');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'error') {
    toast.classList.add('error');
  } else if (type === 'success') {
    toast.classList.add('success');
  }

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show', 'error', 'success');
  }, 3200);
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) {
    el.textContent = value;
  }
}

function formatDateTime(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function maskLength(len) {
  if (typeof len !== 'number' || Number.isNaN(len)) return 'n/a';
  return `${'•'.repeat(Math.max(4, Math.min(len, 12)))} (${len} chars)`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return String(value).replace(/"/g, '&quot;');
}

function clone(source) {
  return JSON.parse(JSON.stringify(source));
}


