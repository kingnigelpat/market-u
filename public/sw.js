// sw.js — v2
// Bump version string to force all devices (especially phones) to detect
// a SW change and immediately install + activate the new version.
const CACHE_NAME = 'market-u-v2';
const ASSETS_TO_CACHE = ['/', '/index.html', '/icon.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('[SW] Cache addAll failed:', err))
    )
  );
  // Take over immediately — don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete old caches so phones don't serve stale assets
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Control all open tabs/windows immediately
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first: always try to fetch fresh content, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
