const CACHE_NAME = 'market-u-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Just cache basic assets to make it an installable PWA
      return cache.addAll([
        '/',
        '/index.html',
        '/icon.png',
        '/manifest.json'
      ]).catch(err => console.log('Cache addAll failed', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch to satisfy PWA requirements
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
