const STORAGE_KEY = 'orbsurv-account';

const SEED_DATA = {
  profile: {
    name: 'Jordan Rivers',
    email: 'jordan@example.com',
    joinedAt: '2025-07-10'
  },
  pilots: [
    { id: 'p-001', title: 'Orbsurv Early Access', status: 'Approved', date: '2025-09-28' },
    { id: 'p-002', title: 'ClassNotes Beta', status: 'Pending', date: '2025-10-02' }
  ],
  prompts: [
    {
      id: 'pm-101',
      title: 'Campus Visualizer Demo',
      snippet: '3D scene with buildings and UI overlays...',
      createdAt: '2025-10-11'
    },
    {
      id: 'pm-102',
      title: 'Security Rail Motion Plan',
      snippet: 'Linear rail sweep with zones and alerts...',
      createdAt: '2025-10-12'
    },
    {
      id: 'pm-103',
      title: 'Pitchdeck Copy Update',
      snippet: 'Problem, solution, market, roadmap...',
      createdAt: '2025-10-15'
    }
  ],
  notifications: [
    { id: 'n-1', text: 'Your Orbsurv pilot access was approved.', unread: true },
    { id: 'n-2', text: 'New comment on your Prompt Activity.', unread: true }
  ],
  dashboardSummary: null
};

let state;
let apiClient = null;
let authClient = null;

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error('Failed to initialize account view', error);
  });
});

async function init() {
  apiClient = window.OrbsurvApi || null;
  authClient = window.OrbsurvAuth || null;

  if (!ensureAuth()) {
    return;
  }

  state = loadData();
  renderAll();
  bindEvents();
  await hydrateRemoteData();
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = mergeWithSeed(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (error) {
    console.warn('Unable to load stored account data, resetting to seed.', error);
  }

  const seeded = cloneData(SEED_DATA);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function mergeWithSeed(raw) {
  const data = {
    profile: { ...SEED_DATA.profile, ...(raw.profile || {}) },
    pilots: Array.isArray(raw.pilots) ? raw.pilots : cloneData(SEED_DATA.pilots),
    prompts: Array.isArray(raw.prompts) ? raw.prompts : cloneData(SEED_DATA.prompts),
    notifications: Array.isArray(raw.notifications) ? raw.notifications : cloneData(SEED_DATA.notifications),
    dashboardSummary: raw.dashboardSummary || null
  };

  return data;
}

function saveData(next) {
  state = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureAuth() {
  if (!authClient || typeof authClient.getTokens !== 'function') {
    return true;
  }
  try {
    const tokens = authClient.getTokens();
    if (!tokens || !tokens.accessToken) {
      redirectToLogin();
      return false;
    }
  } catch (error) {
    console.warn('Unable to access auth tokens', error);
    redirectToLogin();
    return false;
  }
  return true;
}

function redirectToLogin() {
  const url = new URL('login.html', window.location.href);
  url.searchParams.set('redirect', 'account.html');
  window.location.href = url.toString();
}

async function hydrateRemoteData() {
  if (!apiClient || typeof apiClient.requestJSON !== 'function') {
    return;
  }

  try {
    const user = await apiRequest('/api/v1/auth/me');
    if (user) {
      applyUser(user);
    }
  } catch (error) {
    console.error('Unable to load profile data', error);
  }

  try {
    const summary = await apiRequest('/api/v1/app/dashboard/summary');
    if (summary) {
      applySummary(summary);
    }
  } catch (error) {
    console.warn('Dashboard summary unavailable', error);
  }
}

async function apiRequest(endpoint, options = {}) {
  if (!apiClient || typeof apiClient.requestJSON !== 'function') {
    throw new Error('API client is not available');
  }
  try {
    return await apiClient.requestJSON(endpoint, { auth: true, ...options });
  } catch (error) {
    if (error && error.status === 401) {
      redirectToLogin();
    }
    throw error;
  }
}

function applyUser(user) {
  if (!user) {
    return;
  }
  const nextProfile = {
    ...state.profile,
    name: user.name || state.profile.name || user.email,
    email: user.email || state.profile.email,
    joinedAt: user.created_at || state.profile.joinedAt,
  };
  const nextState = {
    ...state,
    profile: nextProfile,
  };
  saveData(nextState);
  renderProfile();
  renderSettings();
  if (authClient && typeof authClient.updateUser === 'function') {
    authClient.updateUser(user);
  }
}

function applySummary(summary) {
  const notifications = Array.isArray(summary.recent_logs)
    ? summary.recent_logs.map((log) => ({
        id: `log-${log.id}`,
        text: log.description ? `${log.action}: ${log.description}` : log.action,
        createdAt: log.created_at,
        unread: false,
      }))
    : state.notifications;

  const nextState = {
    ...state,
    notifications,
    dashboardSummary: summary,
  };
  saveData(nextState);
  renderPilots();
  renderNotifications();
}

function renderAll() {
  renderProfile();
  renderPilots();
  renderPrompts();
  renderNotifications();
  renderSettings();
}

function renderProfile() {
  const nameEl = document.querySelector('[data-profile-name]');
  const emailEl = document.querySelector('[data-profile-email]');
  const joinedEl = document.querySelector('[data-profile-joined]');
  const avatarEl = document.querySelector('[data-profile-avatar]');

  if (!nameEl || !emailEl || !joinedEl || !avatarEl) {
    return;
  }

  nameEl.textContent = state.profile.name;
  emailEl.textContent = state.profile.email;
  joinedEl.textContent = formatDate(state.profile.joinedAt);
  avatarEl.textContent = getInitials(state.profile.name);
}

function renderPilots() {
  const list = document.querySelector('[data-pilot-list]');
  if (!list) return;

  list.innerHTML = '';

  const summary = state.dashboardSummary;
  if (summary && summary.metrics) {
    const metrics = [
      { id: 'active-alerts', label: 'Active alerts (24h)', value: summary.metrics.active_alerts },
      { id: 'rails-online', label: 'Rails online', value: summary.metrics.rails_online },
      { id: 'downtime-minutes', label: 'Downtime minutes (24h)', value: summary.metrics.downtime_minutes },
    ];

    metrics.forEach((metric) => {
      const item = document.createElement('li');
      item.className = 'data-item';

      const top = document.createElement('div');
      top.className = 'item-top';

      const info = document.createElement('div');
      const titleEl = document.createElement('h3');
      titleEl.className = 'item-title';
      titleEl.textContent = metric.label;

      const metaEl = document.createElement('p');
      metaEl.className = 'item-meta';
      metaEl.textContent = `${metric.value}`;

      info.append(titleEl, metaEl);
      top.append(info);
      item.append(top);
      list.appendChild(item);
    });

    if (summary.command_center_url) {
      const item = document.createElement('li');
      item.className = 'data-item';
      const link = document.createElement('a');
      link.href = summary.command_center_url;
      link.className = 'btn btn-secondary';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open Command Center';
      item.append(link);
      list.appendChild(item);
    }
    return;
  }

  if (!state.pilots.length) {
    list.append(createEmptyState('No pilot signups yet. Join a pilot to see it here.'));
    return;
  }

  state.pilots.forEach((pilot) => {
    const item = document.createElement('li');
    item.className = 'data-item';

    const top = document.createElement('div');
    top.className = 'item-top';

    const info = document.createElement('div');

    const titleEl = document.createElement('h3');
    titleEl.className = 'item-title';
    titleEl.textContent = pilot.title;

    const metaEl = document.createElement('p');
    metaEl.className = 'item-meta';
    metaEl.textContent = `Submitted ${formatDate(pilot.date)}`;

    info.append(titleEl, metaEl);

    const statusEl = document.createElement('span');
    statusEl.className = 'status-pill';
    statusEl.textContent = pilot.status;
    if (pilot.status) {
      statusEl.classList.add(`status-${slugify(pilot.status)}`);
    }

    top.append(info, statusEl);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.dataset.action = 'view-pilot';
    button.dataset.pilotId = pilot.id;
    button.textContent = 'View';

    actions.append(button);
    item.append(top, actions);

    list.appendChild(item);
  });
}

function renderPrompts() {
  const list = document.querySelector('[data-prompt-list]');
  if (!list) return;

  list.innerHTML = '';

  if (!state.prompts.length) {
    list.append(createEmptyState('No prompt activity yet. Create a prompt to see it here.'));
    return;
  }

  state.prompts.forEach((prompt) => {
    const item = document.createElement('li');
    item.className = 'data-item';

    const top = document.createElement('div');
    top.className = 'item-top';

    const info = document.createElement('div');

    const titleEl = document.createElement('h3');
    titleEl.className = 'item-title';
    titleEl.textContent = prompt.title;

    const metaEl = document.createElement('p');
    metaEl.className = 'item-meta';
    metaEl.textContent = formatDate(prompt.createdAt);

    info.append(titleEl, metaEl);
    top.append(info);

    const snippetEl = document.createElement('p');
    snippetEl.className = 'item-meta';
    snippetEl.textContent = prompt.snippet;

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.dataset.action = 'open-prompt';
    button.dataset.promptId = prompt.id;
    button.textContent = 'Open';

    actions.append(button);
    item.append(top, snippetEl, actions);

    list.appendChild(item);
  });
}

function renderNotifications() {
  const list = document.querySelector('[data-notification-list]');
  const feedbackEl = document.querySelector('[data-notification-feedback]');
  const markReadBtn = document.querySelector('[data-mark-read]');

  if (!list) return;

  list.innerHTML = '';

  if (!state.notifications.length) {
    list.append(createEmptyState('You are all caught up. No unread notifications.'));
    if (markReadBtn) {
      markReadBtn.disabled = true;
    }
  } else {
    if (markReadBtn) {
      markReadBtn.disabled = false;
    }

    state.notifications.forEach((notif) => {
      const item = document.createElement('li');
      item.className = 'data-item';

      const top = document.createElement('div');
      top.className = 'item-top';

      const titleEl = document.createElement('h3');
      titleEl.className = 'item-title';
      titleEl.textContent = notif.text;

      top.append(titleEl);

       if (notif.createdAt) {
        const metaEl = document.createElement('p');
        metaEl.className = 'item-meta';
        metaEl.textContent = `Logged ${formatDate(notif.createdAt)}`;
        top.append(metaEl);
      }

      if (notif.unread) {
        const badge = document.createElement('span');
        badge.className = 'status-pill';
        badge.textContent = 'New';
        top.append(badge);
      }

      item.append(top);
      list.appendChild(item);
    });
  }

  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('error');
  }
}

function renderSettings() {
  const form = document.querySelector('[data-settings-form]');
  if (!form) return;

  const nameInput = form.querySelector('#settings-name');
  const emailInput = form.querySelector('#settings-email');

  if (nameInput) nameInput.value = state.profile.name;
  if (emailInput) emailInput.value = state.profile.email;
}

function bindEvents() {
  const form = document.querySelector('[data-settings-form]');
  const feedbackEl = document.querySelector('[data-settings-feedback]');
  const markReadBtn = document.querySelector('[data-mark-read]');
  const focusSettingsBtn = document.querySelector('[data-focus-settings]');

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = (formData.get('name') || '').toString().trim();
      const email = (formData.get('email') || '').toString().trim();

      if (!name || !email) {
        if (feedbackEl) {
          feedbackEl.textContent = 'Please provide both name and email.';
          feedbackEl.classList.add('error');
        }
        return;
      }

      if (feedbackEl) {
        feedbackEl.textContent = 'Saving...';
        feedbackEl.classList.remove('error');
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.dataset.originalText || submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving';
      }

      try {
        const updatedUser = await apiRequest('/api/v1/app/account/profile', {
          method: 'PATCH',
          body: { name, email },
        });
        applyUser(updatedUser);
        if (feedbackEl) {
          feedbackEl.textContent = 'Profile saved.';
          feedbackEl.classList.remove('error');
        }
      } catch (error) {
        console.error('Unable to update profile', error);
        if (feedbackEl) {
          feedbackEl.textContent = (error && error.message) || 'Unable to save profile.';
          feedbackEl.classList.add('error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitBtn.dataset.originalText) {
            submitBtn.innerHTML = submitBtn.dataset.originalText;
          }
        }
      }
    });
  }

  if (markReadBtn) {
    markReadBtn.addEventListener('click', () => {
      if (!state.notifications.length) {
        return;
      }

      const next = {
        ...state,
        notifications: []
      };

      saveData(next);
      renderNotifications();

      const feedbackEl = document.querySelector('[data-notification-feedback]');
      if (feedbackEl) {
        feedbackEl.textContent = 'Notifications cleared.';
        feedbackEl.classList.remove('error');
      }
    });
  }

  if (focusSettingsBtn) {
    focusSettingsBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('settings-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}

function createEmptyState(message) {
  const li = document.createElement('li');
  li.className = 'empty-state';
  li.textContent = message;
  return li;
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getInitials(name) {
  if (!name) return '?';
  const matches = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase());

  if (!matches.length) {
    return name.slice(0, 2).toUpperCase();
  }

  return matches.slice(0, 2).join('');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
