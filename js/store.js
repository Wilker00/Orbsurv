const RESOURCES = {
  detections: {
    path: 'data/detections.json',
    unwrap: data => data.detections ?? [],
    idKey: 'id'
  },
  clips: {
    path: 'data/clips.json',
    unwrap: data => data.days ?? [],
  resource,
    idKey: 'id'
  },
  rail: {
    path: 'data/rail.json',
    unwrap: data => data,
    idKey: 'id'
  }
};

const cache = new Map();
const subscribers = new Map();

const clone = value => {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

async function fetchResource(name) {
  const descriptor = RESOURCES[name];
  if (!descriptor) {
    throw new Error(`store: unknown resource "${name}"`);
  }

  const cached = cache.get(name);
  if (cached) {
    return cached.raw;
  }

  try {
    const response = await fetch(descriptor.path, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`store: failed to load ${name}`);
    }
    const data = await response.json();
    cache.set(name, { raw: data, hydrated: descriptor.unwrap(data), loadedAt: Date.now() });
    notify(name);
    return data;
  } catch (error) {
    console.warn(error.message);
    const fallback = descriptor.unwrap({});
    cache.set(name, { raw: {}, hydrated: fallback, loadedAt: Date.now(), error });
    notify(name);
    return {};
  }
}

function notify(name) {
  const listeners = subscribers.get(name);
  if (!listeners) return;
  const snapshot = cache.get(name)?.hydrated;
  listeners.forEach(cb => {
    try {
      cb(clone(snapshot));
    } catch (error) {
      console.warn('store: subscriber callback failed', error);
    }
  });
}

async function ensureHydrated(name) {
  await fetchResource(name);
  return cache.get(name)?.hydrated;
}

export async function list(name, selector) {
  const hydrated = await ensureHydrated(name);
  if (!selector) return clone(hydrated);
  return clone(selectFrom(hydrated, selector));
}

export async function get(name, id, selector) {
  const hydrated = await ensureHydrated(name);
  const descriptor = RESOURCES[name];
  const source = Array.isArray(hydrated) ? hydrated : selectFrom(hydrated, selector ?? null) ?? [];
  const match = Array.isArray(source) ? source.find(item => (item?.[descriptor.idKey] ?? item?.id) === id) : null;
  return match ? clone(match) : null;
}

export async function filter(name, predicate, selector) {
  const hydrated = await ensureHydrated(name);
  const source = Array.isArray(hydrated) ? hydrated : selectFrom(hydrated, selector ?? null) ?? [];
  if (!Array.isArray(source)) return [];

  if (typeof predicate === 'function') {
    return clone(source.filter(predicate));
  }

  if (predicate && typeof predicate === 'object') {
    return clone(source.filter(item => Object.entries(predicate).every(([key, value]) => item?.[key] === value)));
  }

  return clone(source);
}

export function subscribe(name, callback) {
  const listeners = subscribers.get(name) ?? new Set();
  listeners.add(callback);
  subscribers.set(name, listeners);
  const snapshot = cache.get(name)?.hydrated;
  if (snapshot) {
    queueMicrotask(() => callback(clone(snapshot)));
  }
  return () => {
    const group = subscribers.get(name);
    if (!group) return;
    group.delete(callback);
    if (group.size === 0) {
      subscribers.delete(name);
    }
  };
}

export function invalidate(name) {
  if (name) {
    cache.delete(name);
    return;
  }
  cache.clear();
}

export async function prefetch(...names) {
  return Promise.all(names.map(fetchResource));
}

export function saveLocal(key, value) {
  try {
    localStorage.setItem(`orbsurv:${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn('store: unable to persist to localStorage', error);
  }
}

export function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(`orbsurv:${key}`);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('store: unable to read from localStorage', error);
    return fallback;
  }
}

function selectFrom(data, selector) {
  if (!selector) return data;
  if (Array.isArray(selector)) {
    return selector.reduce((cursor, key) => (cursor ? cursor[key] : undefined), data);
  }
  if (typeof selector === 'string') {
    return selector.split('.').reduce((cursor, key) => (cursor ? cursor[key] : undefined), data);
  }
  if (typeof selector === 'function') {
    return selector(data);
  }
  return data;
}

export async function resource(name) {
  await fetchResource(name);
  return clone(cache.get(name)?.raw);
}

const storeApi = {
  list,
  get,
  filter,
  subscribe,
  invalidate,
  prefetch,
  saveLocal,
  readLocal,
  resource
};

if (typeof window !== 'undefined') {
  window.store = storeApi;
}

export default storeApi;





