// ============================================================
//  IRON WILL — SERVICE WORKER
//  Production-grade caching, dynamic limit & offline fallback
// ============================================================

const CACHE_NAME = 'ironwill-v3.1';
const OFFLINE_URL = './offline.html';
const MAX_CACHED_DYNAMIC_ENTRIES = 50;

const ASSETS = [
  './',
  './index.html',
  OFFLINE_URL,
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/animations.css',
  './css/utilities.css',
  './js/utils.js',
  './js/state.js',
  './js/app.js',
  './js/calendar.js',
  './js/charts.js',
  './js/habits.js',
  './js/journal.js',
  './js/achievements.js',
  './js/emergency.js',
  './js/particles.js',
  './js/audio.js',
  './js/navigation.js',
  './js/analytics.js',
  './js/focus.js',
  './js/toast.js'
];

async function cacheResponse(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
  const keys = await cache.keys();
  const dynamic = keys.filter(key => !ASSETS.some(asset => new URL(asset, self.location).href === key.url));
  while (dynamic.length > MAX_CACHED_DYNAMIC_ENTRIES) {
    await cache.delete(dynamic.shift());
  }
}

// Install — cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first with network fallback and offline page
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Skip external cross-origin requests
  if (!e.request.url.startsWith(self.location.origin)) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Revalidate in background
        fetch(e.request).then(response => {
          if (response && response.ok) {
            cacheResponse(e.request, response.clone());
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(e.request).then(response => {
        if (response && response.ok) {
          cacheResponse(e.request, response.clone());
        }
        return response;
      }).catch(async () => {
        if (e.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});
