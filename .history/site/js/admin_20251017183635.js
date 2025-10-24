const ADMIN_PASS = 'ORBSURV-DEV-2025';
const STORAGE_KEYS = {
  unlocked: 'orbsurv_admin_unlocked',
  data: 'orbsurv_admin_data'
};
const THEME_KEY = 'orbsurv-theme';

const SEED_DATA = {
  submissions: [
    {
      id: 'u-1001',
      name: 'Jordan Rivers',
      email: 'jordan@example.com',
      source: 'index.html form',
      createdAt: '2025-10-10T18:10:00Z'
    },
    {
      id: 'u-1002',
      name: 'Lena Brooks',
      email: 'lena@example.com',
      source: 'demo.html waitlist',
      createdAt: '2025-10-12T14:55:00Z'
    }
  ],
  passwordEvents: [
    {
      id: 'p-2001',
      userId: 'u-1001',
      event: 'set',
      newLen: 10,
      at: '2025-10-10T18:12:00Z'
    },
    {
      id: 'p-2002',
      userId: 'u-1002',
      event: 'reset',
      newLen: 15,
      at: '2025-10-12T14:57:00Z'
    }
  ],
  audit: [
    {
      id: 'a-1',
      text: 'Seeded admin data',
      at: '2025-10-10T18:00:00Z'
    }
  ]
};

let state = clone(SEED_DATA);

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => console.error('Admin init failed', error));
});

async function init() {
  await loadLayoutPartials();
  document.body.classList.add('is-admin-page');
  initThemeSwitch();
  revealDevBadge();

  state = loadData();

  const unlocked = readUnlocked();
  bindUI();

  if (unlocked) {
    unlockDashboard({ skipAudit: true });
  } else {
    showPasscodeModal();
  }
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

function handlePasscodeSubmit(event) {
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
    writeUnlocked(true);
    unlockDashboard();
    input.value = '';
    setFeedback(feedback, '');
    showToast('Dev Mode unlocked.', 'success');
  } else {
    setFeedback(feedback, 'Incorrect passcode. Try again.', true);
    input.focus();
  }
}

function unlockDashboard({ skipAudit = false } = {}) {
  const modal = document.querySelector('[data-passcode-modal]');
  const content = document.querySelector('[data-admin-content]');
  if (modal) {
    modal.setAttribute('hidden', 'hidden');
  }
  if (content) {
    content.removeAttribute('hidden');
  }
  if (skipAudit) {
    render();
  } else {
    commit({ audit: 'Unlocked Dev Mode' });
  }
}

function showPasscodeModal() {
  const modal = document.querySelector('[data-passcode-modal]');
  const input = document.querySelector('#admin-passcode');
  if (modal) {
    modal.removeAttribute('hidden');
  }
  if (input) {
    setTimeout(() => input.focus(), 100);
  }
}

function handleSubmissionAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;
  if (!id) return;

  const submission = state.submissions.find((item) => item.id === id);
  if (!submission) return;

  switch (button.dataset.action) {
    case 'view': {
      console.info('Viewing submission', submission);
      showToast(
        `${submission.name} &lt;${submission.email}&gt; · ${submission.source}`,
        'info'
      );
      commit({ audit: `Viewed submission ${id}`, render: false });
      renderAudit();
      break;
    }
    case 'email': {
      console.info('Emailing submission', submission);
      openMailClient(submission.email, `Follow-up from Orbsurv`, '');
      commit({ audit: `Opened mail client for ${submission.email}` });
      break;
    }
    case 'delete': {
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

function handleEmailSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = form.querySelector('[data-email-feedback]');
  const formData = new FormData(form);
  const to = (formData.get('to') || '').toString().trim();
  const subject = (formData.get('subject') || '').toString().trim();
  const body = (formData.get('body') || '').toString().trim();

  if (!to || !subject || !body) {
    setFeedback(feedback, 'All fields are required to send email.', true);
    return;
  }

  console.info('Simulated email send', { to, subject, body });
  setFeedback(feedback, 'Email sent and logged.');
  commit({ audit: `Sent simulated email to ${to}` });
  showToast(`Simulated email sent to ${to}`, 'success');
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

  state = {
    submissions: [],
    passwordEvents: [],
    audit: []
  };
  commit({ audit: 'Cleared all admin data' });
  showToast('All admin data cleared.', 'info');
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.data);
    if (!stored) {
      const seeded = clone(SEED_DATA);
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(stored);
    return sanitizeData(parsed);
  } catch (error) {
    console.warn('Resetting admin data due to error', error);
    const seeded = clone(SEED_DATA);
    localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(seeded));
    return seeded;
  }
}

function sanitizeData(raw) {
  return {
    submissions: Array.isArray(raw?.submissions) ? raw.submissions : [],
    passwordEvents: Array.isArray(raw?.passwordEvents) ? raw.passwordEvents : [],
    audit: Array.isArray(raw?.audit) ? raw.audit : []
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
    console.log('Rendering admin dashboard...');
    renderSubmissions();
    renderPasswordEvents();
    renderAudit();
    renderMetrics();
    console.log('Admin dashboard rendered successfully');
  } catch (error) {
    console.error('Error rendering admin dashboard:', error);
  }
}

function renderSubmissions() {
  const tbody = document.querySelector('[data-submissions-body]');
  if (!tbody) return;

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
  if (!tbody) return;

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
  if (!list) return;

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
  setText('[data-count-submissions]', state.submissions.length.toString());
  setText('[data-count-passwords]', state.passwordEvents.length.toString());
  setText('[data-count-audit]', state.audit.length.toString());
}

function saveData() {
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
