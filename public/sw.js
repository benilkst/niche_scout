/**
 * Service Worker: Niche Scout PWA
 * Strategi:
 * - Cache-first untuk aset statis (js, css, png, svg, fonts)
 * - Network-first untuk navigasi (HTML)
 * - STRICTLY bypass /api/* (selalu network-only, tidak pernah di-cache)
 * - STRICTLY bypass non-GET (POST /api/niche dll.)
 * - STRICTLY bypass lintas asal (cross-origin)
 */

const CACHE_NAME = 'niche-scout-v1';

const STATIC_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. STRICTLY bypass non-GET
  if (req.method !== 'GET') {
    return;
  }

  // 2. STRICTLY bypass cross-origin
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. STRICTLY bypass /api/* (network-only)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 4. Navigasi Halaman (HTML): Network-First
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;
          const fallbackIndex = await caches.match('/index.html');
          if (fallbackIndex) return fallbackIndex;
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;
          return new Response('Aplikasi offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 5. Aset Statis (JS, CSS, Gambar, Font): Cache-First
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent fallback for images/assets if not available offline
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
    })
  );
});
