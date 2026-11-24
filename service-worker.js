/*
 * MEIKO service worker — offline support.
 * Strategy: precache the whole app shell on install (it is small and fully static), then serve
 * cache-first with a background refresh ("stale-while-revalidate") for same-origin GET requests.
 * Bump CACHE_VERSION whenever any file changes so clients pick up the new version.
 */
var CACHE_VERSION = 'meiko-v1.2.0';
var ASSETS = [
  './', 'index.html', 'manifest.json', 'css/style.css',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png',
  'js/core/geo.js', 'js/core/coords.js', 'js/core/units.js', 'js/core/navcalc.js', 'js/core/solar.js', 'js/core/prayer.js', 'js/core/qibla.js', 'js/core/calc.js', 'js/core/nmea.js',
  'js/data/ports-data.js',
  'js/i18n.js', 'js/storage.js', 'js/settings.js', 'js/features.js', 'js/ui.js', 'js/gps.js',
  'js/modules/navigation.js', 'js/modules/calculator.js', 'js/modules/converter.js', 'js/modules/astronomy.js',
  'js/modules/prayer.js', 'js/modules/qibla.js', 'js/modules/position.js', 'js/modules/settings.js',
  'js/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_VERSION).then(function (cache) { return cache.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('meiko-') === 0 && k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never cache third-party requests

  if (req.mode === 'navigate') {
    // App shell: network first (fresh when online), fall back to cached index.html offline.
    event.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE_VERSION).then(function (c) { c.put('index.html', copy); });
      return res;
    }).catch(function () { return caches.match('index.html'); }));
    return;
  }

  event.respondWith(caches.match(req, { ignoreSearch: true }).then(function (cached) {
    var network = fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return cached; });
    return cached || network;
  }));
});
