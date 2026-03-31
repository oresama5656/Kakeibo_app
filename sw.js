/**
 * Service Worker (v5.0 - 強制リフレッシュ対応・ネットワーク優先)
 */

const CACHE_NAME = 'kakeibo-cache-v5.0';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/auth.js',
  './js/store.js',
  './js/data.js',
  './js/screens/input.js',
  './js/screens/dashboard.js',
  './js/screens/history.js',
  './js/screens/analysis.js',
  './js/screens/settings.js',
  './manifest.json',
  './icon.png'
];

// --- Install Event ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching all files for v5.0...');
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => self.skipWaiting()) // インストール直後に有効化
  );
});

// --- Activate Event (Delete old caches) ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// --- Fetch Event (Network First Strategy) ---
self.addEventListener('fetch', (event) => {
  // skip if non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // ネットワークが正常ならキャッシュを更新して返す
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});
