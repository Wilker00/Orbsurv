import { list, resource, readLocal, saveLocal } from './store.js';

const state = {
  filter: readLocal('gallery:filter', 'all'),
  view: readLocal('gallery:view', 'grid'),
  cursor: 0,
  chunk: 9,
  items: [],
  filtered: []
};

const refs = {
  chips: document.querySelectorAll('#filterChips .chip'),
  viewChips: document.querySelectorAll('[data-view]'),
  grid: document.getElementById('galleryGrid'),
  empty: document.getElementById('galleryEmpty'),
  sentinel: document.getElementById('gallerySentinel')
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
}, { rootMargin: '24px', threshold: 0.2 });

const sentinelObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadMore();
    }
  });
}, { rootMargin: '48px' });

init();

async function init() {
  refs.chips.forEach(chip => {
    const active = chip.dataset.filter === state.filter;
    setChipState(chip, active);
    chip.addEventListener('click', () => setFilter(chip.dataset.filter));
    chip.addEventListener('keydown', onEnterSpace(() => setFilter(chip.dataset.filter)));
  });

  refs.viewChips.forEach(chip => {
    const active = chip.dataset.view === state.view;
    setChipState(chip, active);
    chip.addEventListener('click', () => setView(chip.dataset.view));
    chip.addEventListener('keydown', onEnterSpace(() => setView(chip.dataset.view)));
  });

  const clips = await resource('clips');
  state.items = flattenClips(clips);
  applyFilter();
  sentinelObserver.observe(refs.sentinel);
}

function setFilter(next) {
  if (!next || state.filter === next) return;
  state.filter = next;
  saveLocal('gallery:filter', next);
  refs.chips.forEach(chip => setChipState(chip, chip.dataset.filter === next));
  applyFilter();
}

function setView(next) {
  if (!next || state.view === next) return;
  state.view = next;
  saveLocal('gallery:view', next);
  refs.viewChips.forEach(chip => setChipState(chip, chip.dataset.view === next));
  refs.grid.dataset.view = next;
}

function applyFilter() {
  state.filtered = state.items.filter(item => {
    if (state.filter === 'all') return true;
    if (state.filter === 'Custom') return item.label === 'Custom';
    return item.label === state.filter;
  });
  state.cursor = 0;
  refs.grid.innerHTML = '';
  loadMore(true);
}

function loadMore(reset) {
  if (reset) {
    state.cursor = 0;
  }
  if (state.cursor >= state.filtered.length) {
    toggleEmpty(state.filtered.length === 0);
    return;
  }
  const slice = state.filtered.slice(state.cursor, state.cursor + state.chunk);
  const fragment = document.createDocumentFragment();
  slice.forEach(item => fragment.appendChild(renderCard(item)));
  refs.grid.appendChild(fragment);
  state.cursor += slice.length;
  toggleEmpty(state.filtered.length === 0);
  requestAnimationFrame(() => {
    refs.grid.querySelectorAll('img[data-src]').forEach(img => lazyObserver.observe(img));
  });
}

function renderCard(item) {
  const card = document.createElement('article');
  card.className = 'gallery-card';
  card.tabIndex = 0;
  card.innerHTML = `
    <img data-src="${item.thumbnail}" alt="${item.label} clip thumbnail" loading="lazy" />
    <div class="card-body">
      <div class="meta">
        <span>${item.time}</span>
        <span class="mini-label">${item.duration}s • ${item.confidence}%</span>
      </div>
      <div class="meta">
        <strong>${item.label}</strong>
        <span>${item.date}</span>
      </div>
      <p>${item.summary}</p>
    </div>
    <div class="quick-actions" role="group" aria-label="Clip actions">
      <button type="button" aria-label="Play ${item.id}"><i class="fa-solid fa-circle-play"></i> Play</button>
      <button type="button" aria-label="Download ${item.id}"><i class="fa-solid fa-download"></i> Save</button>
      <button type="button" aria-label="Bookmark ${item.id}"><i class="fa-solid fa-bookmark"></i> Keep</button>
    </div>
  `;
  return card;
}

function flattenClips(raw) {
  const days = raw?.days ?? [];
  const items = [];
  days.forEach(day => {
    (day.clips ?? []).forEach(clip => {
      const confidence = Math.round((clip.confidence ?? 0) * 100);
      items.push({
        id: clip.id,
        label: clip.label ?? 'Custom',
        confidence,
        duration: clip.duration ?? 0,
        thumbnail: clip.thumbnail ?? 'img/placeholders/clip-01.svg',
        summary: buildSummary(clip, day.date),
        date: new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        time: new Date(clip.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });
  });
  return items.sort((a, b) => Date.parse(b.id.slice(-8)) - Date.parse(a.id.slice(-8)));
}

function buildSummary(clip, date) {
  const base = clip.label ?? 'Event';
  const duration = clip.duration ? `${clip.duration}s` : 'moment';
  return `${base} captured ${new Date(date).toLocaleDateString([], { month: 'long', day: 'numeric' })} • ${duration}`;
}

function toggleEmpty(show) {
  refs.empty.toggleAttribute('hidden', !show);
}

function setChipState(chip, active) {
  chip.dataset.active = String(active);
  chip.setAttribute('aria-pressed', String(active));
}

function onEnterSpace(handler) {
  return event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  };
}
