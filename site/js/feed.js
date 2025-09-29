import { list, readLocal, saveLocal, prefetch, resource } from './store.js';

const state = {
  playing: false,
  muted: readLocal('feed:muted', true),
  quality: readLocal('feed:quality', 'adaptive'),
  overlays: new Set(readLocal('feed:overlays', ['heat', 'motion'])),
  sessionLength: 900,
  elapsed: 0,
  lastTick: 0,
  rafId: null,
  marks: [],
  metrics: {
    fps: 59.9,
    bitrate: 8.2,
    latency: 68,
    connection: 'Link good'
  }
};

const refs = {
  overlayButtons: document.querySelectorAll('[data-overlay]'),
  controlButtons: document.querySelectorAll('.control-actions button'),
  qualityChips: document.querySelectorAll('[data-quality]'),
  scrubber: document.getElementById('sessionScrubber'),
  sessionClock: document.getElementById('sessionClock'),
  sessionMode: document.getElementById('sessionMode'),
  eventChip: document.getElementById('eventChip'),
  timelineMarks: document.getElementById('timelineMarks'),
  controlHint: document.getElementById('controlHint'),
  statusFps: document.getElementById('statusFps'),
  statusBitrate: document.getElementById('statusBitrate'),
  statusLatency: document.getElementById('statusLatency'),
  statusConnection: document.getElementById('statusConnection'),
  statusEvent: document.getElementById('statusEvent'),
  memoryLog: document.getElementById('memoryLog'),
  memoryFilter: document.getElementById('btnMemoryFilter'),
  feedFrame: document.getElementById('feedFrame')
};

const lazyObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const { target } = entry;
      const src = target.getAttribute('data-src');
      if (src) {
        target.src = src;
        target.removeAttribute('data-src');
      }
      lazyObserver.unobserve(target);
    }
  });
}, {
  rootMargin: '24px'
});

if (refs.feedFrame) {
  lazyObserver.observe(refs.feedFrame);
}

init();

async function init() {
  applyOverlayState();
  applyQualityState();
  updateControls();
  updateScrubber(0);

  refs.overlayButtons.forEach(button => {
    button.addEventListener('click', handleOverlayToggle);
    button.addEventListener('keydown', onEnterSpace(() => handleOverlayToggle({ currentTarget: button })));
  });

  refs.controlButtons.forEach(button => {
    button.addEventListener('click', () => handleControl(button.dataset.action));
    button.addEventListener('keydown', onEnterSpace(() => handleControl(button.dataset.action)));
  });

  refs.qualityChips.forEach(chip => {
    chip.addEventListener('click', () => setQuality(chip.dataset.quality));
    chip.addEventListener('keydown', onEnterSpace(() => setQuality(chip.dataset.quality)));
  });

  refs.scrubber.addEventListener('input', handleScrub);
  refs.scrubber.addEventListener('change', handleScrub);

  refs.memoryFilter.addEventListener('click', toggleMemoryFilter);
  refs.memoryFilter.addEventListener('keydown', onEnterSpace(toggleMemoryFilter));

  await prefetch('detections', 'rail');
  await hydrateFromDetections();
  startMetricsLoop();
  startPlayback();
}

async function hydrateFromDetections() {
  const [detections, raw, rail] = await Promise.all([
    list('detections'),
    resource('detections'),
    resource('rail')
  ]);
  if (rail?.loopDuration) {
    state.sessionLength = Math.max(state.sessionLength, rail.loopDuration);
  }
  const lastDetection = detections[0];
  if (lastDetection) {
    updateEventChip(lastDetection);
    refs.statusEvent.textContent = `${lastDetection.label} @ ${lastDetection.zone}`;
  }
  if (raw?.memory) {
    renderMemory(raw.memory);
  }
  state.marks = buildMarks(raw);
  renderMarks();
  updateScrubber(state.elapsed);
}

function buildMarks(raw) {
  if (!raw?.detections || !raw.updated) return [];
  const latest = Date.parse(raw.updated);
  const windowMs = state.sessionLength * 1000;
  return raw.detections.map(det => {
    const delta = Math.max(0, Math.min(windowMs, latest - Date.parse(det.time)));
    const percent = 100 - Math.round((delta / windowMs) * 100);
    return {
      id: det.id,
      label: det.label,
      percent: Math.max(0, Math.min(100, percent))
    };
  }).slice(0, 5);
}

function renderMarks() {
  if (!refs.timelineMarks) return;
  if (!state.marks.length) {
    refs.timelineMarks.textContent = 'No events yet';
    return;
  }
  refs.timelineMarks.innerHTML = state.marks
    .map(mark => `<span data-id="${mark.id}" style="left: ${mark.percent}%">${mark.label}</span>`)
    .join('');
}

function handleOverlayToggle(event) {
  const button = event.currentTarget;
  const key = button.dataset.overlay;
  if (!key) return;
  const next = !state.overlays.has(key);
  if (next) {
    state.overlays.add(key);
  } else {
    state.overlays.delete(key);
  }
  button.dataset.active = String(next);
  button.setAttribute('aria-pressed', String(next));
  saveLocal('feed:overlays', Array.from(state.overlays));
  refs.controlHint.textContent = `${capitalize(key)} overlay ${next ? 'enabled' : 'muted'} for this session.`;
}

function handleControl(action) {
  switch (action) {
    case 'start':
      startPlayback();
      refs.controlHint.textContent = 'Live playback resumed.';
      break;
    case 'stop':
      stopPlayback();
      refs.controlHint.textContent = 'Playback paused at current frame.';
      break;
    case 'mute':
      toggleMute();
      break;
    case 'snapshot':
      takeSnapshot();
      break;
    default:
      break;
  }
}

function setQuality(value) {
  if (!value) return;
  state.quality = value;
  refs.qualityChips.forEach(chip => {
    const isActive = chip.dataset.quality === value;
    chip.dataset.active = String(isActive);
    chip.setAttribute('aria-pressed', String(isActive));
  });
  saveLocal('feed:quality', value);
  refs.controlHint.textContent = `Quality locked to ${value.toUpperCase()} for the next segment.`;
}

function updateControls() {
  refs.controlButtons.forEach(button => {
    const { action } = button.dataset;
    if (action === 'start') {
      button.setAttribute('aria-pressed', String(state.playing));
    }
    if (action === 'stop') {
      button.setAttribute('aria-pressed', String(!state.playing));
    }
    if (action === 'mute') {
      button.setAttribute('aria-pressed', String(state.muted));
    }
  });
}

function startPlayback() {
  if (state.playing) return;
  state.playing = true;
  state.lastTick = 0;
  updateControls();
  refs.sessionMode.textContent = 'Live';
  loop();
}

function stopPlayback() {
  state.playing = false;
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  updateControls();
  refs.sessionMode.textContent = 'Paused';
}

function loop(timestamp = 0) {
  if (!state.playing) return;
  if (!state.lastTick) {
    state.lastTick = timestamp;
  }
  const delta = (timestamp - state.lastTick) / 1000;
  state.lastTick = timestamp;
  state.elapsed = Math.min(state.sessionLength, state.elapsed + delta);
  updateScrubber(state.elapsed);
  if (state.elapsed >= state.sessionLength) {
    stopPlayback();
    return;
  }
  state.rafId = requestAnimationFrame(loop);
}

function updateScrubber(elapsedSeconds) {
  const percent = Math.round((elapsedSeconds / state.sessionLength) * 100);
  refs.scrubber.value = String(percent);
  refs.scrubber.setAttribute('aria-valuenow', String(percent));
  refs.scrubber.setAttribute('aria-valuetext', formatClock(elapsedSeconds));
  refs.sessionClock.textContent = formatClock(elapsedSeconds);
}

function handleScrub(event) {
  const value = Number(event.currentTarget.value);
  const elapsed = (value / 100) * state.sessionLength;
  state.elapsed = elapsed;
  updateScrubber(elapsed);
  if (event.type === 'change') {
    refs.controlHint.textContent = `Jumped to ${formatClock(elapsed)} in session.`;
  }
}

function toggleMute() {
  state.muted = !state.muted;
  saveLocal('feed:muted', state.muted);
  updateControls();
  refs.controlHint.textContent = state.muted ? 'Audio muted for operator channel.' : 'Audio restored to operator monitors.';
}

function takeSnapshot() {
  const stamp = formatClock(state.elapsed);
  refs.controlHint.textContent = `Snapshot queued at ${stamp}. Evidence bundle updated.`;
}

function applyOverlayState() {
  refs.overlayButtons.forEach(button => {
    const key = button.dataset.overlay;
    const active = state.overlays.has(key);
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function applyQualityState() {
  setQuality(state.quality);
}

function startMetricsLoop() {
  updateMetrics();
  setInterval(updateMetrics, 6000);
}

function updateMetrics() {
  state.metrics.fps = clamp(57 + Math.random() * 4, 57, 60).toFixed(1);
  state.metrics.bitrate = clamp(7.2 + Math.random() * 2, 7.2, 9.6).toFixed(1);
  state.metrics.latency = Math.round(clamp(60 + Math.random() * 20, 60, 88));
  refs.statusFps.textContent = state.metrics.fps;
  refs.statusBitrate.textContent = state.metrics.bitrate;
  refs.statusLatency.textContent = String(state.metrics.latency);
  const health = state.metrics.latency < 80;
  refs.statusConnection.textContent = health ? 'Link good' : 'Link unstable';
  toggleStatState(document.getElementById('tileLatency'), health ? 'good' : 'warn');
}

function toggleStatState(tile, tone) {
  if (!tile) return;
  tile.classList.remove('good', 'warn');
  if (tone === 'good') tile.classList.add('good');
  if (tone === 'warn') tile.classList.add('warn');
}

function renderMemory(entries) {
  if (!refs.memoryLog) return;
  const filtered = refs.memoryFilter.getAttribute('aria-pressed') === 'true'
    ? entries.filter(item => item.summary.toLowerCase().includes('ai'))
    : entries;
  if (!filtered.length) {
    refs.memoryLog.innerHTML = '<p class="mini-label">Memory log is quiet.</p>';
    return;
  }
  refs.memoryLog.innerHTML = filtered
    .map(item => `
      <div class="memory-row">
        <strong>${item.summary}</strong>
        <span>${toLocalTime(item.time)}</span>
        <span>${item.detail}</span>
      </div>
    `)
    .join('');
}
function toggleMemoryFilter(event) {
  const pressed = event?.currentTarget?.getAttribute('aria-pressed') === 'true';
  const next = !pressed;
  refs.memoryFilter.setAttribute('aria-pressed', String(next));
  refs.memoryFilter.dataset.active = String(next);
  resource('detections').then(raw => {
    renderMemory(raw?.memory ?? []);
    refs.controlHint.textContent = next ? 'Filtering log to AI-written entries.' : 'Showing full memory log.';
  });
}

function updateEventChip(det) {
  const label = det?.label ?? '—';
  const zone = det?.zone ? `@ ${det.zone}` : '';
  refs.eventChip.innerHTML = `<i class="fa-solid fa-bolt"></i><span>${label} ${zone}</span>`;
}



function onEnterSpace(handler) {
  return event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  };
}

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = String(Math.floor(total / 60)).padStart(2, '0');
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function toLocalTime(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
