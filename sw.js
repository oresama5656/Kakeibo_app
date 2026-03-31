const CACHE_NAME = 'kakeibo-cache-v4.7';
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
  './js/screens/analysis.js',
  './js/screens/settings.js',
  './icon.png'
];

// Install: キャッシュへの登録
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: 旧キャッシュの破棄
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(), // 制御を即時に開始
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// Fetch: ネットワーク優先 (Network First)
// 開発中や更新頻度が高い場合は、最新をまず見に行くこの方法が「スマート」です。
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('googleapis.com')) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // ネットワークが成功したらキャッシュを更新
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, respClone);
        });
        return response;
      })
      .catch(() => {
        // ネットワークがダメな時だけキャッシュを返す
        return caches.match(e.request);
      })
  );
});
