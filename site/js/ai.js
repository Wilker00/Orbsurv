import { list, resource, saveLocal, readLocal, prefetch } from './store.js';

const state = {
  filters: readLocal('ai:filters', { label: 'all', confidence: 0.6, range: 24 }),
  updatedAt: Date.now()
};

const refs = {
  labelChips: document.querySelectorAll('#labelChips .chip'),
  timeChips: document.querySelectorAll('#timeChips .chip'),
  detectionGrid: document.getElementById('detectionGrid'),
  detectionEmpty: document.getElementById('detectionEmpty'),
  detectionCount: document.getElementById('detectionCount'),
  confidenceRange: document.getElementById('confidenceRange'),
  confidenceLabel: document.getElementById('confidenceLabel'),
  activeFilters: document.getElementById('activeFilters'),
  sparkline: document.getElementById('sparkline'),
  sparkSummary: document.getElementById('sparkSummary'),
  statDetections: document.getElementById('statDetections'),
  statRules: document.getElementById('statRules'),
  statConfidence: document.getElementById('statConfidence'),
  zoneList: document.getElementById('zoneList'),
  alertList: document.getElementById('alertList'),
  memoryList: document.getElementById('memoryList'),
  memoryCollapse: document.getElementById('memoryCollapse')
};

const lazyObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    const src = img.getAttribute('data-src');
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
    lazyObserver.unobserve(img);
  });
}, { rootMargin: '24px' });

init();

async function init() {
  refs.confidenceRange.value = String(state.filters.confidence);
  refs.confidenceRange.setAttribute('aria-valuenow', String(state.filters.confidence));
  refs.confidenceLabel.textContent = `${Math.round(state.filters.confidence * 100)}%`;

  refs.labelChips.forEach(chip => {
    const isActive = chip.dataset.label === state.filters.label || (state.filters.label === 'all' && chip.dataset.label === 'all');
    setChipState(chip, isActive);
    chip.addEventListener('click', () => setLabelFilter(chip.dataset.label));
    chip.addEventListener('keydown', onEnterSpace(() => setLabelFilter(chip.dataset.label)));
  });

  refs.timeChips.forEach(chip => {
    const isActive = Number(chip.dataset.range) === Number(state.filters.range);
    setChipState(chip, isActive);
    chip.addEventListener('click', () => setRangeFilter(Number(chip.dataset.range)));
    chip.addEventListener('keydown', onEnterSpace(() => setRangeFilter(Number(chip.dataset.range))));
  });

  refs.confidenceRange.addEventListener('input', handleConfidenceInput);
  refs.confidenceRange.addEventListener('change', handleConfidenceCommit);

  refs.memoryCollapse.addEventListener('click', toggleMemoryCollapse);
  refs.memoryCollapse.addEventListener('keydown', onEnterSpace(toggleMemoryCollapse));
  const collapsed = readLocal('ai:memoryCollapsed', false);
  setMemoryCollapse(collapsed);

  await prefetch('detections');
  await hydrate();
}

async function hydrate() {
  const raw = await resource('detections');
  state.updatedAt = raw?.updated ? Date.parse(raw.updated) : Date.now();
  const detections = raw?.detections ?? [];
  renderDetections(detections);
  renderStats(raw);
  renderSparkline(raw?.eventsPerHour ?? []);
  renderZones(raw?.zones ?? []);
  renderAlerts(raw?.alerts ?? []);
  renderMemory(raw?.memory ?? []);
  updateActiveFiltersText();
}

function renderDetections(detections) {
  if (!refs.detectionGrid) return;
  const filtered = detections.filter(applyFilters).sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  refs.detectionCount.textContent = `${filtered.length} shown`;
  refs.detectionEmpty.toggleAttribute('hidden', filtered.length !== 0);
  refs.detectionGrid.innerHTML = filtered
    .map(det => detectionTemplate(det))
    .join('');
  refs.detectionGrid.querySelectorAll('img[data-src]').forEach(img => lazyObserver.observe(img));
}

function detectionTemplate(det) {
  const confidence = Math.round((det.confidence ?? 0) * 100);
  const time = toLocalTime(det.time);
  const label = det.label ?? '—';
  const zone = det.zone ?? 'Unmapped zone';
  return `
    <article class="detection-card" tabindex="0">
      <img data-src="${det.thumbnail}" alt="${label} detection thumbnail" loading="lazy" />
      <div class="detection-meta">
        <span class="badge-soft">${confidence}%</span>
        <span>${time}</span>
      </div>
      <div class="mini-label">${label} in ${zone}</div>
      <p>${det.summary ?? 'No summary provided.'}</p>
    </article>
  `;
}

function renderStats(raw) {
  const detections = raw?.detections ?? [];
  refs.statDetections.textContent = String(detections.length);
  refs.statRules.textContent = String((raw?.alerts ?? []).length);
  const median = detections.length ? Math.round(detections.map(d => d.confidence ?? 0).sort()[Math.floor(detections.length / 2)] * 100) : 0;
  refs.statConfidence.textContent = `${median}%`;
}

function renderSparkline(events) {
  if (!refs.sparkline) return;
  if (!events.length) {
    refs.sparkline.innerHTML = '<p class="empty-state">No events recorded.</p>';
    refs.sparkSummary.textContent = 'No activity';
    return;
  }
  const max = Math.max(...events, 1);
  const steps = Math.max(events.length - 1, 1);
  const points = events.map((value, index) => {
    const x = (index / steps) * 100;
    const y = 100 - (value / max) * 100;
    return `${x},${y}`;
  }).join(' ');
  const avg = Math.round(events.reduce((sum, value) => sum + value, 0) / events.length);
  refs.sparkSummary.textContent = `Peak ${Math.max(...events)} • Avg ${avg}`;
  refs.sparkline.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="100%" stop-color="#0ea5e9" />
        </linearGradient>
      </defs>
      <polyline points="${points}" fill="none" stroke="url(#grad)" stroke-width="2" />
    </svg>
  `;
}
function renderZones(zones) {
  if (!refs.zoneList) return;
  refs.zoneList.innerHTML = zones
    .map(zone => `
      <div class="zone-row">
        <strong>${zone.name}</strong>
        <span>${zone.schedule}</span>
        <span class="mini-label">State: ${zone.state}</span>
      </div>
    `)
    .join('');
}

function renderAlerts(alerts) {
  if (!refs.alertList) return;
  if (!alerts.length) {
    refs.alertList.innerHTML = '<p class="empty-state">No alerts triggered.</p>';
    return;
  }
  refs.alertList.innerHTML = alerts
    .map(alert => `
      <div class="alert-row" data-severity="${alert.severity}">
        <strong>${alert.rule}</strong>
        <span>${alert.message}</span>
        <span class="mini-label">${toLocalTime(alert.triggeredAt)} • ${alert.state}</span>
      </div>
    `)
    .join('');
}

function renderMemory(memory) {
  if (!refs.memoryList) return;
  if (!memory.length) {
    refs.memoryList.innerHTML = '<p class="empty-state">Memory log is quiet.</p>';
    return;
  }
  const collapsed = refs.memoryCollapse.getAttribute('aria-pressed') === 'true';
  refs.memoryList.toggleAttribute('hidden', collapsed);
  refs.memoryList.innerHTML = memory
    .map(entry => `
      <div class="memory-row">
        <strong>${entry.summary}</strong>
        <span>${toLocalTime(entry.time)}</span>
        <span>${entry.detail}</span>
      </div>
    `)
    .join('');
}

function applyFilters(det) {
  if (!det) return false;
  if (state.filters.label !== 'all' && det.label !== state.filters.label) return false;
  if ((det.confidence ?? 0) < state.filters.confidence) return false;
  if (!withinRange(det.time, state.filters.range)) return false;
  return true;
}

function withinRange(time, hours) {
  if (!time) return true;
  const eventTime = Date.parse(time);
  const deltaHours = (state.updatedAt - eventTime) / 3_600_000;
  return deltaHours <= hours;
}

function setLabelFilter(label) {
  if (!label || label === state.filters.label) return;
  state.filters.label = label;
  saveFilters();
  refs.labelChips.forEach(chip => setChipState(chip, chip.dataset.label === label));
  hydrate();
}

function setRangeFilter(range) {
  if (!range || range === state.filters.range) return;
  state.filters.range = range;
  saveFilters();
  refs.timeChips.forEach(chip => setChipState(chip, Number(chip.dataset.range) === range));
  hydrate();
}

function handleConfidenceInput(event) {
  const value = Number(event.currentTarget.value);
  refs.confidenceLabel.textContent = `${Math.round(value * 100)}%`;
}

function handleConfidenceCommit(event) {
  const value = Number(event.currentTarget.value);
  state.filters.confidence = value;
  event.currentTarget.setAttribute('aria-valuenow', String(value));
  saveFilters();
  hydrate();
}

function updateActiveFiltersText() {
  const parts = [];
  parts.push(state.filters.label === 'all' ? 'All labels' : state.filters.label);
  parts.push(`≥ ${Math.round(state.filters.confidence * 100)}%`);
  parts.push(`${state.filters.range}h window`);
  refs.activeFilters.textContent = parts.join(' • ');
}

function setChipState(chip, active) {
  chip.dataset.active = String(active);
  chip.setAttribute('aria-pressed', String(active));
}

function toggleMemoryCollapse(event) {
  const pressed = event?.currentTarget?.getAttribute('aria-pressed') === 'true';
  setMemoryCollapse(!pressed);
  saveLocal('ai:memoryCollapsed', !pressed);
}

function setMemoryCollapse(collapsed) {
  refs.memoryCollapse.setAttribute('aria-pressed', String(collapsed));
  refs.memoryCollapse.dataset.active = String(collapsed);
  refs.memoryList?.toggleAttribute('hidden', collapsed);
}

function saveFilters() {
  saveLocal('ai:filters', state.filters);
}

function onEnterSpace(handler) {
  return event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  };
}

function toLocalTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
}
