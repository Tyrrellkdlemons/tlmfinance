/* Paving the Road — service worker
   Static-first cache with stale-while-revalidate for HTML/JSON. */

const CACHE = 'paving-the-road-v1';
const SHELL = [
  './',
  './index.html',
  './media.html',
  './learn.html',
  './radio.html',
  './feed.html',
  './manifest.json',
  './src/styles/globals.css',
  './src/styles/print.css',
  './src/app.js',
  './src/utils/storage.js',
  './src/utils/budgetCalculator.js',
  './src/utils/exportPlan.js',
  './src/data/resources.json',
  './src/data/people.json',
  './src/data/tlmStats.json',
  './src/data/media.json',
  './assets/icons/favicon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Avoid trying to cache cross-origin / chrome-extension etc.
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetcher = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fetcher;
  })());
});
