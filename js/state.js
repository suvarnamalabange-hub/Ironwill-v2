// ============================================================
//  IRON WILL — REACTIVE STATE MANAGEMENT
//  Deep Proxy-based reactivity + IndexedDB persistence
// ============================================================

import { debounce, getToday } from './utils.js';

// ---- CONSTANTS ----
const DB_NAME = 'IronWillDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const LS_KEY = 'ironwill_v2';

// ---- SUBSCRIBER REGISTRY ----
const subscribers = new Map(); // path → Set<callback>
let batchQueue = null;
let batchTimer = null;
const proxyCache = new WeakMap();

/**
 * Subscribe to state changes at a given path.
 * Returns an unsubscribe function.
 */
export function subscribe(path, callback) {
  if (!subscribers.has(path)) subscribers.set(path, new Set());
  subscribers.get(path).add(callback);
  return () => subscribers.get(path)?.delete(callback);
}

/** Notify all subscribers for a path and dispatch DOM event */
function notify(path) {
  if (!batchQueue) {
    batchQueue = new Set();
    batchTimer = queueMicrotask(() => {
      const paths = batchQueue;
      batchQueue = null;
      batchTimer = null;

      // Notify global subscribers
      if (subscribers.has('*')) {
        subscribers.get('*').forEach(cb => {
          try { cb(state); } catch(e) { console.error('Subscriber error:', e); }
        });
      }

      // Notify path-specific subscribers
      paths.forEach(p => {
        if (subscribers.has(p)) {
          subscribers.get(p).forEach(cb => {
            try { cb(state); } catch(e) { console.error('Subscriber error:', e); }
          });
        }
      });

      // Dispatch global window event so UI reacts consistently
      window.dispatchEvent(new CustomEvent('state-changed', {
        detail: { paths: Array.from(paths) }
      }));
    });
  }
  batchQueue.add(path);
}

// ---- DEEP REACTIVE PROXY ----
function createReactiveProxy(obj, rootPath = '') {
  if (typeof obj !== 'object' || obj === null) return obj;
  const cached = proxyCache.get(obj);
  if (cached) return cached;

  const proxy = new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'object' && value !== null && typeof prop === 'string') {
        return createReactiveProxy(value, rootPath ? `${rootPath}.${prop}` : prop);
      }
      return value;
    },

    set(target, prop, value) {
      const oldValue = target[prop];
      if (oldValue === value && typeof value !== 'object') return true;
      target[prop] = value;
      const path = rootPath ? `${rootPath}.${prop}` : String(prop);
      const topKey = path.split('.')[0];
      notify(topKey);
      debouncedSave();
      return true;
    },

    deleteProperty(target, prop) {
      if (prop in target) {
        delete target[prop];
        const path = rootPath ? `${rootPath}.${prop}` : String(prop);
        const topKey = path.split('.')[0];
        notify(topKey);
        debouncedSave();
      }
      return true;
    }
  });

  proxyCache.set(obj, proxy);
  return proxy;
}

// ---- DEFAULT STATE ----
function defaultState() {
  return {
    days: {},
    urges: [],
    reflections: {},
    journals: {},
    moods: {},
    habits: {},
    habitLog: {},
    oath: null,
    oathDate: null,
    curStreak: 0,
    longestStreak: 0,
    totalClean: 0,
    totalRelapses: 0,
    totalXP: 0,
    achievements: [],
    newAch: [],
    // ---- V3 NEW KEYS ----
    focusSessions: [],
    customHabits: [],
    challenges: {},
    challengeStreak: 0,
    theme: 'gold',
    lastBackupReminder: null,
    settings: {
      focusDuration: 25,
      breakDuration: 5,
      autoStartBreak: false,
    },
    activeTab: 'dashboard',
    version: 3
  };
}

// ---- INDEXEDDB ----
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => {
      console.warn('IndexedDB failed, falling back to localStorage:', e);
      reject(e);
    };
  });
}

async function readFromIDB() {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('state');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function writeToIDB(data) {
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data, 'state');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---- LOCALSTORAGE FALLBACK ----
function readFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeToLS(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage write failed:', e);
    window.dispatchEvent(new CustomEvent('storage-error', { detail: e }));
  }
}

// ---- PERSISTENCE ----
let useIDB = false;

async function persistState() {
  const raw = JSON.parse(JSON.stringify(_rawState));
  if (useIDB) {
    try {
      await writeToIDB(raw);
    } catch (e) {
      writeToLS(raw);
    }
  } else {
    writeToLS(raw);
  }
}

const debouncedSave = debounce(persistState, 300);

/** Force immediate save (e.g. before unload) */
export function saveNow() {
  const raw = JSON.parse(JSON.stringify(_rawState));
  writeToLS(raw);
  if (useIDB) writeToIDB(raw).catch(() => {});
}

// ---- STATE INITIALIZATION ----
// _rawState maintains the single underlying object reference
const _rawState = defaultState();
export const state = createReactiveProxy(_rawState);

/**
 * Initialize state: try IndexedDB, fall back to localStorage,
 * migrate from localStorage if needed.
 */
export async function initState() {
  try {
    await openDB();
    useIDB = true;

    // Try reading from IndexedDB first
    let data = await readFromIDB();

    if (!data) {
      // Check localStorage for migration
      const lsData = readFromLS();
      if (lsData) {
        console.log('Migrating data from localStorage to IndexedDB...');
        data = { ...defaultState(), ...lsData, version: 3 };
        await writeToIDB(data);
        localStorage.setItem(LS_KEY + '_migrated', 'true');
      }
    }

    if (data) {
      Object.assign(_rawState, defaultState(), data);
    }
  } catch (e) {
    console.warn('IndexedDB unavailable, using localStorage');
    useIDB = false;
    const lsData = readFromLS();
    if (lsData) {
      Object.assign(_rawState, defaultState(), lsData);
    }
  }

  notify('*');
  return state;
}

export function validateImportData(incoming) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return false;
  const objectKeys = ['days', 'journals', 'reflections', 'moods', 'habitLog'];
  const arrayKeys = ['urges', 'achievements', 'newAch', 'focusSessions', 'customHabits'];
  return objectKeys.every(k => incoming[k] === undefined || (incoming[k] && typeof incoming[k] === 'object' && !Array.isArray(incoming[k])))
    && arrayKeys.every(k => incoming[k] === undefined || Array.isArray(incoming[k]))
    && (incoming.totalXP === undefined || (Number.isFinite(incoming.totalXP) && incoming.totalXP >= 0));
}

/**
 * Batch multiple state mutations without triggering
 * intermediate renders. Calls fn, then notifies once.
 */
export function batch(fn) {
  fn(state);
}

/**
 * Get a plain object snapshot of the state (no proxy).
 */
export function getSnapshot() {
  return JSON.parse(JSON.stringify(_rawState));
}

/**
 * Replace entire state (e.g. for import).
 */
export function replaceState(newData) {
  // Clear old keys and assign new
  for (const k of Object.keys(_rawState)) {
    delete _rawState[k];
  }
  Object.assign(_rawState, defaultState(), newData);
  notify('*');
  persistState();
  return state;
}

/**
 * Export state as JSON blob.
 */
export function exportState() {
  const data = getSnapshot();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ironwill-backup-${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import state from JSON, merging with existing data.
 * Returns { success, stats } describing what was imported.
 */
export function importState(jsonStr) {
  try {
    const incoming = JSON.parse(jsonStr);
    if (!validateImportData(incoming)) throw new Error('Invalid backup schema');

    const current = getSnapshot();
    const merged = { ...defaultState(), ...current };

    // Merge days (prefer existing)
    if (incoming.days) {
      for (const [k, v] of Object.entries(incoming.days)) {
        if (!merged.days[k]) merged.days[k] = v;
      }
    }

    // Merge journals (additive, skip duplicates by key)
    if (incoming.journals) {
      for (const [k, v] of Object.entries(incoming.journals)) {
        if (!merged.journals[k]) merged.journals[k] = v;
      }
    }

    // Merge reflections (additive)
    if (incoming.reflections) {
      for (const [k, v] of Object.entries(incoming.reflections)) {
        if (!merged.reflections[k]) merged.reflections[k] = v;
      }
    }

    // Merge moods (prefer existing)
    if (incoming.moods) {
      for (const [k, v] of Object.entries(incoming.moods)) {
        if (!merged.moods[k]) merged.moods[k] = v;
      }
    }

    // Merge habitLog (additive)
    if (incoming.habitLog) {
      for (const [k, v] of Object.entries(incoming.habitLog)) {
        if (!merged.habitLog[k]) merged.habitLog[k] = v;
      }
    }

    // Merge urges (additive, skip duplicates by ts)
    if (incoming.urges && Array.isArray(incoming.urges)) {
      const existingTs = new Set(merged.urges.map(u => u.ts));
      for (const u of incoming.urges) {
        if (!existingTs.has(u.ts)) merged.urges.push(u);
      }
    }

    // Import oath if not set
    if (!merged.oath && incoming.oath) {
      merged.oath = incoming.oath;
      merged.oathDate = incoming.oathDate;
    }

    // Merge achievements (additive)
    if (incoming.achievements && Array.isArray(incoming.achievements)) {
      const achSet = new Set(merged.achievements);
      incoming.achievements.forEach(a => achSet.add(a));
      merged.achievements = [...achSet];
    }

    // Merge custom habits (additive)
    if (incoming.customHabits && Array.isArray(incoming.customHabits)) {
      const existingIds = new Set(merged.customHabits.map(h => h.id));
      for (const h of incoming.customHabits) {
        if (!existingIds.has(h.id)) merged.customHabits.push(h);
      }
    }

    // Merge focus sessions
    if (incoming.focusSessions && Array.isArray(incoming.focusSessions)) {
      const existingTs = new Set(merged.focusSessions.map(s => s.ts));
      for (const s of incoming.focusSessions) {
        if (!existingTs.has(s.ts)) merged.focusSessions.push(s);
      }
    }

    replaceState(merged);
    return { success: true };
  } catch (e) {
    console.error('Import failed:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get statistics about the stored data.
 */
export function getDataStats() {
  const s = getSnapshot();
  return {
    totalDays: Object.keys(s.days || {}).length,
    totalJournals: Object.keys(s.journals || {}).length,
    totalUrges: (s.urges || []).length,
    totalReflections: Object.keys(s.reflections || {}).length,
    totalMoods: Object.keys(s.moods || {}).length,
    totalHabitDays: Object.keys(s.habitLog || {}).length,
    totalAchievements: (s.achievements || []).length,
    totalFocusSessions: (s.focusSessions || []).length,
    totalCustomHabits: (s.customHabits || []).length,
    dataSize: new Blob([JSON.stringify(s)]).size,
  };
}
