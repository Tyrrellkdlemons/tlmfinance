/* Paving the Road — service worker. Static-first cache + stale-while-revalidate. */
const CACHE = 'paving-the-road-v20';
const SHELL = [
  './', './index.html', './pages/planner.html', './pages/plan.html',
  './pages/learn.html', './pages/hub.html', './pages/watch.html',
  './pages/radio.html', './pages/feed.html', './pages/media.html',
  './pages/admin.html',
  './pages/privacy.html', './pages/terms.html', './pages/data-deletion.html',
  './pages/self-running-presentation.html', './presentations/presentation-data.json',
  './manifest.json',
  './src/styles/globals.css', './src/styles/print.css',
  './src/app.js', './src/chatbot.js', './src/auth.js',
  './src/admin-overrides.js', './src/contact-gate.js', './src/tlm-config.js',
  './src/freedom-plan-panel.js',
  './src/utils/storage.js', './src/utils/budgetCalculator.js', './src/utils/exportPlan.js',
  './src/data/resources.json', './src/data/people.json',
  './src/data/tlmStats.json', './src/data/media.json',
  './assets/icons/favicon.svg',
  './assets/icons/tlm-wordmark.svg', './assets/icons/tlm-wordmark-light.svg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => null)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
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
