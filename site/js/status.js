(function () {
  const CHECKS = [
    { key: 'api', endpoint: '/api/healthz', label: 'API health' },
    { key: 'database', endpoint: '/api/readyz', label: 'Database readiness' },
  ];
  const REFRESH_INTERVAL = 60000;
  const DEFAULT_BASE = 'https://api.orbsurv.com';
  let statusAlertShown = false;

  function resolveBase() {
    if (typeof window.resolveApiBase === 'function') {
      return window.resolveApiBase();
    }
    const meta = document.querySelector('meta[name="orbsurv-api-base"]');
    const configured =
      window.ORBSURV_API_BASE ||
      (meta && meta.getAttribute('content')) ||
      DEFAULT_BASE;
    return String(configured).replace(/\/+$/, '');
  }

  async function request(endpoint) {
    const api = window.OrbsurvApi;
    if (api && typeof api.requestJSON === 'function') {
      return api.requestJSON(endpoint, { auth: false });
    }
    const base = resolveBase();
    const url = endpoint.startsWith('/') ? `${base}${endpoint}` : `${base}/${endpoint}`;
    const response = await fetch(url, { method: 'GET', cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Status check failed (${response.status})`);
    }
    const raw = await response.text();
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw);
    } catch (_) {
      return raw;
    }
  }

  function describeHealthyNote(payload) {
    if (payload === null || typeof payload === 'undefined') {
      return 'Online';
    }
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (!trimmed.length) {
        return 'Online';
      }
      return trimmed.toLowerCase() === 'ok' ? 'OK' : trimmed;
    }
    if (typeof payload === 'object') {
      if (typeof payload.status === 'string' && payload.status.trim().length) {
        const status = payload.status.trim();
        return status.toLowerCase() === 'ok' ? 'OK' : status;
      }
      if (typeof payload.message === 'string' && payload.message.trim().length) {
        return payload.message.trim();
      }
    }
    return 'Online';
  }

  function updateComponent(key, state, note) {
    const row = document.querySelector(`tr[data-component="${key}"]`);
    if (!row) return;
    const statusCell = row.querySelector('.status-cell');
    const noteCell = row.querySelector('[data-note]');
    if (statusCell) {
      const dot = statusCell.querySelector('.status-dot');
      const label = statusCell.querySelector('span:last-child');
      if (dot) {
        dot.className = `status-dot ${state.dotClass}`;
      }
      if (label) {
        label.textContent = state.label;
      }
    }
    if (noteCell) {
      noteCell.textContent = note || '';
    }
  }

  function updateSummary(overallState) {
    const container = document.querySelector('[data-status-summary]');
    const updated = document.querySelector('[data-status-updated]');
    if (container) {
      const dot = container.querySelector('.status-dot');
      const text = container.querySelector('p');
      if (dot) {
        dot.className = `status-dot ${overallState.dotClass}`;
      }
      if (text) {
        text.textContent = overallState.label;
      }
    }
    if (updated) {
      updated.textContent = new Date().toLocaleTimeString();
    }
  }

  function notifyIssue(affected) {
    if (statusAlertShown) {
      return;
    }
    statusAlertShown = true;
    const details =
      Array.isArray(affected) && affected.length
        ? `Issue detected: ${affected.join(', ')}.`
        : 'Issue detected with Orbsurv systems.';
    if (typeof window.showSiteMessage === 'function') {
      window.showSiteMessage(details, 'error');
    } else {
      console.warn(details);
    }
  }

  async function runChecks() {
    const states = [];
    const issues = [];

    for (const check of CHECKS) {
      try {
        const data = await request(check.endpoint);
        states.push('ok');
        const note = describeHealthyNote(data);
        updateComponent(check.key, { dotClass: 'status-ok', label: 'OK' }, note);
      } catch (error) {
        console.error(`Status check failed for ${check.key}`, error);
        states.push('issue');
        const detail = error && error.message ? error.message : 'No response';
        updateComponent(
          check.key,
          { dotClass: 'status-down', label: 'Issue Detected' },
          `${check.endpoint}: ${detail}`
        );
        issues.push(check.label || check.key);
      }
    }

    const overall = determineOverall(states);
    updateSummary(overall);

    if (overall.level === 'ok') {
      statusAlertShown = false;
    } else if (issues.length) {
      notifyIssue(issues);
    } else {
      notifyIssue();
    }
  }

  function determineOverall(states) {
    if (states.some((state) => state === 'issue')) {
      return { dotClass: 'status-down', label: 'Issue Detected', level: 'issue' };
    }
    return { dotClass: 'status-ok', label: 'OK', level: 'ok' };
  }

  document.addEventListener('DOMContentLoaded', () => {
    runChecks();
    window.setInterval(runChecks, REFRESH_INTERVAL);
  });
})();
