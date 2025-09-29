import { resource, saveLocal, readLocal, prefetch } from './store.js';

const state = {
  view: readLocal('calendar:view', 'month'),
  selection: readLocal('calendar:selected', null),
  drawerCollapsed: readLocal('calendar:drawerCollapsed', false),
  data: null,
  dayMap: new Map(),
  months: [],
  monthIndex: 0,
  weeks: [],
  weekIndex: 0
};

const refs = {
  viewToggle: document.querySelectorAll('#viewToggle .pill'),
  calendarGrid: document.getElementById('calendarGrid'),
  calendarTitle: document.getElementById('calendarTitle'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  clipList: document.getElementById('clipList'),
  clipEmpty: document.getElementById('clipEmpty'),
  drawerTitle: document.getElementById('drawerTitle'),
  drawerMeta: document.getElementById('drawerMeta'),
  drawerClose: document.getElementById('drawerClose')
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
  refs.viewToggle.forEach(button => {
    const active = button.dataset.view === state.view;
    setToggle(button, active);
    button.addEventListener('click', () => setView(button.dataset.view));
    button.addEventListener('keydown', onEnterSpace(() => setView(button.dataset.view)));
  });

  refs.prevBtn.addEventListener('click', () => shiftInterval(-1));
  refs.nextBtn.addEventListener('click', () => shiftInterval(1));
  refs.drawerClose.addEventListener('click', toggleDrawerCollapse);
  refs.drawerClose.addEventListener('keydown', onEnterSpace(toggleDrawerCollapse));
  applyDrawerState();

  await prefetch('clips');
  await loadData();
  renderCalendar();
  renderDrawer();
}

async function loadData() {
  const raw = await resource('clips');
  state.data = raw;
  state.dayMap = new Map();
  (raw?.days ?? []).forEach(day => {
    state.dayMap.set(day.date, day);
  });
  state.months = Array.from(new Set((raw?.days ?? []).map(day => day.date.slice(0, 7)))).sort();
  state.weeks = raw?.weeks ?? [];

  const latestDay = (raw?.days ?? []).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  if (!state.selection || !state.dayMap.has(state.selection)) {
    state.selection = latestDay?.date ?? null;
  }

  const selectedMonth = state.selection ? state.selection.slice(0, 7) : state.months.at(-1);
  state.monthIndex = Math.max(state.months.indexOf(selectedMonth), 0);

  const weekContainingSelection = state.weeks.findIndex(week => week.days?.some(day => day.date === state.selection));
  state.weekIndex = weekContainingSelection >= 0 ? weekContainingSelection : 0;
}

function renderCalendar() {
  if (state.view === 'week') {
    renderWeek();
  } else {
    renderMonth();
  }
}

function renderMonth() {
  const monthKey = state.months[state.monthIndex] ?? state.months[0];
  if (!monthKey) {
    refs.calendarTitle.textContent = 'No calendar data';
    refs.calendarGrid.innerHTML = '';
    return;
  }
  const [year, month] = monthKey.split('-').map(Number);
  const baseDate = new Date(year, month - 1, 1);
  refs.calendarTitle.textContent = baseDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = new Date(year, month - 1, 1).getDay();
  const cells = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    cells.push(dateStr);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  refs.calendarGrid.innerHTML = `${weekdays.map(day => `<div class="weekday" role="columnheader">${day}</div>`).join('')}${cells.map(date => monthCellTemplate(date)).join('')}`;
}

function monthCellTemplate(date) {
  if (!date) {
    return '<div class="day-cell" aria-hidden="true"></div>';
  }
  const dayData = state.dayMap.get(date);
  const clipCount = dayData?.clipCount ?? 0;
  const selected = date === state.selection;
  const label = clipCount ? `${clipCount} clips` : 'No clips';
  const dots = buildDots(clipCount);
  return `
    <div class="day-cell" role="gridcell" data-selected="${selected}" data-has="${clipCount > 0}">
      <button type="button" data-date="${date}" aria-label="${date} ${label}">
        <span class="day-number">${Number(date.split('-')[2])}</span>
        <div class="dot-list">${dots}</div>
      </button>
    </div>
  `;
}

function renderWeek() {
  const week = state.weeks[state.weekIndex] ?? state.weeks[0];
  if (!week) {
    refs.calendarTitle.textContent = 'No weeks available';
    refs.calendarGrid.innerHTML = '';
    return;
  }
  const baseDate = new Date(week.weekOf);
  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + 6);
  refs.calendarTitle.textContent = `${baseDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekCells = weekdays.map(() => null);
  (week.days ?? []).forEach(day => {
    const date = new Date(day.date);
    weekCells[date.getDay()] = day.date;
  });
  refs.calendarGrid.innerHTML = `${weekdays.map(day => `<div class="weekday" role="columnheader">${day}</div>`).join('')}${weekCells.map(date => monthCellTemplate(date)).join('')}`;
}

function renderDrawer() {
  if (!state.selection) {
    refs.drawerTitle.textContent = 'Select a day';
    refs.drawerMeta.textContent = 'Clips appear here instantly.';
    refs.clipList.innerHTML = '';
    refs.clipEmpty.hidden = false;
    return;
  }
  const dayData = state.dayMap.get(state.selection);
  refs.drawerTitle.textContent = new Date(state.selection).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  refs.drawerMeta.textContent = dayData ? `${dayData.clipCount} clip(s) • ${Object.keys(dayData.detectedLabels ?? {}).join(', ') || 'No labels'}` : 'No recorded clips';
  const clips = dayData?.clips ?? [];
  refs.clipEmpty.hidden = clips.length > 0;
  refs.clipList.innerHTML = clips.map(clip => clipTemplate(clip)).join('');
  refs.clipList.querySelectorAll('img[data-src]').forEach(img => lazyObserver.observe(img));

  document.querySelectorAll('.day-cell button').forEach(button => {
    button.addEventListener('click', () => selectDay(button.dataset.date));
    button.addEventListener('keydown', onEnterSpace(() => selectDay(button.dataset.date)));
  });
}

function clipTemplate(clip) {
  const time = new Date(clip.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const confidence = Math.round((clip.confidence ?? 0) * 100);
  return `
    <div class="clip-card">
      <img data-src="${clip.thumbnail}" alt="Clip preview ${clip.id}" loading="lazy" />
      <div class="clip-meta">
        <span>${clip.label ?? 'Event'}</span>
        <span class="mini-label">${time}</span>
      </div>
      <div class="clip-meta">
        <span class="mini-label">${confidence}% confidence</span>
        <span class="mini-label">${clip.duration}s</span>
      </div>
      <div class="clip-actions">
        <button type="button" aria-label="Play clip ${clip.id}"><i class="fa-solid fa-circle-play"></i> Play</button>
        <button type="button" aria-label="Download clip ${clip.id}"><i class="fa-solid fa-download"></i> Save</button>
      </div>
    </div>
  `;
}

function selectDay(date) {
  if (!date) return;
  state.selection = date;
  saveLocal('calendar:selected', date);
  renderCalendar();
  renderDrawer();
}

function setView(view) {
  if (!view || state.view === view) return;
  state.view = view;
  saveLocal('calendar:view', view);
  refs.viewToggle.forEach(button => setToggle(button, button.dataset.view === view));
  renderCalendar();
}

function shiftInterval(direction) {
  if (state.view === 'week') {
    state.weekIndex = clampIndex(state.weekIndex + direction, state.weeks.length);
    const week = state.weeks[state.weekIndex];
    const fallbackDay = week?.days?.[0]?.date;
    if (fallbackDay) selectDay(fallbackDay);
    else renderCalendar();
  } else {
    state.monthIndex = clampIndex(state.monthIndex + direction, state.months.length);
    const monthKey = state.months[state.monthIndex];
    if (monthKey) {
      const fallback = findFirstDayInMonth(monthKey);
      if (fallback) selectDay(fallback);
      else renderCalendar();
    }
  }
}

function findFirstDayInMonth(monthKey) {
  const match = Array.from(state.dayMap.keys()).find(date => date.startsWith(monthKey));
  return match ?? null;
}

function clampIndex(value, length) {
  if (!length) return 0;
  return Math.max(0, Math.min(length - 1, value));
}

function setToggle(button, active) {
  button.dataset.active = String(active);
  button.setAttribute('aria-pressed', String(active));
}

function toggleDrawerCollapse() {
  state.drawerCollapsed = !state.drawerCollapsed;
  saveLocal('calendar:drawerCollapsed', state.drawerCollapsed);
  applyDrawerState();
}

function applyDrawerState() {
  refs.drawerClose.setAttribute('aria-pressed', String(state.drawerCollapsed));
  refs.drawerClose.dataset.active = String(state.drawerCollapsed);
  refs.clipList?.toggleAttribute('hidden', state.drawerCollapsed);
  refs.clipEmpty?.toggleAttribute('hidden', state.drawerCollapsed);
}

function buildDots(count) {
  const capped = Math.min(count, 6);
  const dots = Array.from({ length: capped }, () => '<span class="dot"></span>').join('');
  return count > 6 ? `${dots}<span class="mini-label">+${count - 6}</span>` : dots;
}

function formatDate(year, month, day) {
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}

function onEnterSpace(handler) {
  return event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  };
}
