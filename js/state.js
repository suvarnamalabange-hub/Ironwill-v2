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

/**
 * Subscribe to state changes at a given path.
 * Returns an unsubscribe function.
 */
export function subscribe(path, callback) {
  if (!subscribers.has(path)) subscribers.set(path, new Set());
  subscribers.get(path).add(callback);
  return () => subscribers.get(path)?.delete(callback);
}

/** Notify all subscribers for a path */
function notify(path) {
  // Batch notifications within the same microtask
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
    });
  }
  batchQueue.add(path);
}

// ---- DEEP REACTIVE PROXY ----
function createReactiveProxy(obj, rootPath = '') {
  if (typeof obj !== 'object' || obj === null) return obj;

  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'object' && value !== null && typeof prop === 'string') {
        return createReactiveProxy(value, rootPath ? `${rootPath}.${prop}` : prop);
      }
      return value;
    },

    set(target, prop, value) {
      const oldValue = target[prop];
      if (oldValue === value) return true;
      target[prop] = value;
      const path = rootPath ? `${rootPath}.${prop}` : String(prop);
      // Notify the top-level key
      const topKey = path.split('.')[0];
      notify(topKey);
      // Schedule persist
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
    version: 2
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
  }
}

// ---- PERSISTENCE ----
let useIDB = false;

async function persistState() {
  const raw = JSON.parse(JSON.stringify(_rawState)); // deep clone to avoid proxy
  if (useIDB) {
    try {
      await writeToIDB(raw);
    } catch (e) {
      writeToLS(raw); // fallback
    }
  } else {
    writeToLS(raw);
  }
}

const debouncedSave = debounce(persistState, 300);

/** Force immediate save (e.g. before unload) */
export function saveNow() {
  const raw = JSON.parse(JSON.stringify(_rawState));
  // Sync localStorage write for beforeunload
  writeToLS(raw);
  if (useIDB) writeToIDB(raw).catch(() => {});
}

// ---- STATE INITIALIZATION ----
let _rawState = defaultState();
export let state = createReactiveProxy(_rawState);

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
        data = { ...defaultState(), ...lsData, version: 2 };
        await writeToIDB(data);
        // Keep LS as backup, mark as migrated
        localStorage.setItem(LS_KEY + '_migrated', 'true');
      }
    }

    if (data) {
      _rawState = { ...defaultState(), ...data };
    }
  } catch (e) {
    console.warn('IndexedDB unavailable, using localStorage');
    useIDB = false;
    const lsData = readFromLS();
    if (lsData) {
      _rawState = { ...defaultState(), ...lsData };
    }
  }

  // Rebuild the proxy
  state = createReactiveProxy(_rawState);

  // Save on page unload
  window.addEventListener('beforeunload', saveNow);

  return state;
}

/**
 * Batch multiple state mutations without triggering
 * intermediate renders. Calls fn, then notifies once.
 */
export function batch(fn) {
  fn(state);
  // notifications are already batched via microtask
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
  Object.assign(_rawState, defaultState(), newData);
  state = createReactiveProxy(_rawState);
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
