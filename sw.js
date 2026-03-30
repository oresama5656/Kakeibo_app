const CACHE_NAME = 'kakeibo-v4.3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/auth.js',
  './js/store.js',
  './js/data.js',
  './js/screens/input.js',
  './js/screens/history.js',
  './js/screens/dashboard.js',
  './js/screens/settings.js',
  './icon.png'
];

// Install: プリキャッシュ
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: 旧キャッシュの削除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch: キャッシュがあればそれを返しつつ、バックグラウンドで最新を取得（Stale-While-Revalidate）
self.addEventListener('fetch', (e) => {
  // スプレッドシートAPIなどの外部リクエストはキャッシュしない
  if (e.request.url.includes('googleapis.com')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
