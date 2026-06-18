// Service Worker — basic offline caching for static assets only
// (Live API responses are cached in localStorage by api.js)
const CACHE_NAME = 'gabbai-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/util.js',
  './js/api.js',
  './js/state.js',
  './js/ui.js',
  './js/router.js',
  './js/app.js',
  './js/pages/dashboard.js',
  './js/pages/live.js',
  './js/pages/members.js',
  './js/pages/member_card.js',
  './js/pages/events.js',
  './js/pages/reports.js',
  './js/pages/settings.js',
  './manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c) {
      return c.addAll(STATIC_ASSETS).catch(function() {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; })
        .map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  const url = new URL(e.request.url);
  // Skip API requests — those go through normal fetch + localStorage cache
  if (url.hostname.indexOf('script.google.com') >= 0) return;
  if (url.hostname.indexOf('script.googleusercontent.com') >= 0) return;
  // Skip non-GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() { return cached; });
    })
  );
});
