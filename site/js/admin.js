const METRICS = [
  {
    key: 'interest',
    title: 'Early interest leads',
    icon: 'fa-envelope-open-text',
    meta: 'Captured from the home page CTA',
  },
  {
    key: 'pilot',
    title: 'Pilot waitlist',
    icon: 'fa-rocket',
    meta: 'Ready to contact for hardware rollout',
  },
  {
    key: 'waitlist',
    title: 'Product waitlist',
    icon: 'fa-list-check',
    meta: 'Commercial interest from the product page',
  },
  {
    key: 'users',
    title: 'Admin seats',
    icon: 'fa-user-shield',
    meta: 'People with dashboard access',
  },
];

// ...existing code...
const DATASET_EXPORT_HINT = (dataset) =>
  `python backend/admin.py export ${dataset} exports/${dataset}.json --format json`;
// ...existing code...
function sanitizeCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return '—';
}

document.addEventListener('DOMContentLoaded', () => {
  
  const themeToggle = document.getElementById('theme-toggle');
  const applyTheme = (dark) => document.body.classList.toggle('dark-mode', dark);
  const saved = localStorage.getItem('orbsurv-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialDark = saved ? saved === 'dark' : prefersDark;
  applyTheme(initialDark);
  if (themeToggle) {
    themeToggle.checked = initialDark;
    themeToggle.addEventListener('change', () => {
      const next = themeToggle.checked;
      applyTheme(next);
      localStorage.setItem('orbsurv-theme', next ? 'dark' : 'light');
    });
  }

  const adminUser = sessionStorage.getItem('orbsurv:adminUser');
  const metricsHost = document.getElementById('metrics-grid');
  if (metricsHost) {
    metricsHost.innerHTML = '';
    METRICS.forEach((metric) => {
      const card = document.createElement('article');
      card.className = 'metric-card';
      card.dataset.metric = metric.key;
      card.innerHTML = `
        <header>
          <div>
            <h3></h3>
            <p class="meta"></p>
          </div>
          <span class="icon-wrap"><i class="fa-solid"></i></span>
        </header>
        <div class="value" aria-live="polite"></div>
        <div class="meta">Pending data source</div>
      `;
      metricsHost.appendChild(card);
    });
  }

  if (adminUser) {
    const metricsTitle = document.querySelector('#overview h1');
    if (metricsTitle) {
      metricsTitle.innerHTML = `Welcome back, <span class="highlight"></span>`;
    }
  }

  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => {
      const dataset = button.dataset.export;
      const command = DATASET_EXPORT_HINT(dataset);
      navigator.clipboard?.writeText(command).catch(() => {});
      alert(`Use the CLI to export data:\n${command}`);
    });
  });

  const datasetCounts = JSON.parse(sessionStorage.getItem('orbsurv:lastCounts') || '{}');
  Object.entries(datasetCounts).forEach(([key, value]) => {
    const metricCard = document.querySelector(`[data-metric="${key}"] .value`);
    if (metricCard) {
      metricCard.textContent = sanitizeCount(value);
    }
    const submissionCard = document.querySelector(`[data-dataset="${key}"] .count`);
    if (submissionCard) {
      const label = key === 'users' ? 'admins' : 'records';
      submissionCard.textContent = `${sanitizeCount(value)}`;
    }
  });

  const viewSiteBtn = document.getElementById('view-site');
  if (viewSiteBtn) {
    viewSiteBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('orbsurv:adminUser');
      sessionStorage.removeItem('orbsurv:lastCounts');
      window.location.href = 'login.html';
    });
  }
});
