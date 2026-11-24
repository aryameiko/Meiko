/*
 * MEIKO service worker — offline support.
 * Strategy: precache the whole app shell on install (it is small and fully static), then serve
 * cache-first with a background refresh ("stale-while-revalidate") for same-origin GET requests.
 * Bump CACHE_VERSION whenever any file changes so clients pick up the new version.
 */
var CACHE_VERSION = 'meiko-v1.9.0';
var ASSETS = [
  './', 'index.html', 'manifest.json', 'css/style.css',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png',
  'js/core/geo.js', 'js/core/coords.js', 'js/core/units.js', 'js/core/navcalc.js', 'js/core/solar.js', 'js/core/prayer.js', 'js/core/qibla.js', 'js/core/calc.js', 'js/core/nmea.js', 'js/core/track.js', 'js/core/wmm.js', 'js/core/livenav.js', 'js/core/celestial.js', 'js/core/platesolve.js', 'js/core/seadist.js', 'js/core/fleet.js', 'js/vendor/nostr-crypto.js',
  'js/data/ports-data.js', 'js/data/stars-data.js', 'js/data/distance-tables.js',
  'js/i18n.js', 'js/storage.js', 'js/settings.js', 'js/features.js', 'js/ui.js', 'js/gps.js',
  'js/modules/navigation.js', 'js/modules/calculator.js', 'js/modules/converter.js', 'js/modules/astronomy.js',
  'js/modules/prayer.js', 'js/modules/qibla.js', 'js/modules/position.js', 'js/modules/settings.js', 'js/modules/vessel.js', 'js/modules/track.js', 'js/modules/livenav.js', 'js/modules/stars.js', 'js/modules/map.js', 'js/modules/fleet.js',
  'js/app.js',
  'assets/vendor/leaflet/leaflet.js', 'assets/vendor/leaflet/leaflet.css', 'assets/vendor/topojson/topojson-client.min.js',
  'assets/data/countries-50m.json'
];

/* Map tiles (third-party hosts). Cache-first so viewed and saved areas work offline.
 * 'tiles-saved-v1' is filled by "Save area for offline" in the app and kept until the user deletes it.
 * 'tiles-seen-v1' keeps tiles as they are viewed, trimmed to the newest SEEN_MAX entries. */
var TILE_HOSTS = ['tile.openstreetmap.org', 'server.arcgisonline.com', 'tiles.openseamap.org'];
var SEEN_CACHE = 'tiles-seen-v1', SAVED_CACHE = 'tiles-saved-v1', SEEN_MAX = 2000;
var trimPending = false;
function trimSeen() {
  if (trimPending) return; trimPending = true;
  setTimeout(function () {
    caches.open(SEEN_CACHE).then(function (c) {
      return c.keys().then(function (keys) {
        var extra = keys.length - SEEN_MAX;
        return extra > 0 ? Promise.all(keys.slice(0, extra).map(function (k) { return c.delete(k); })) : null;
      });
    }).then(function () { trimPending = false; }, function () { trimPending = false; });
  }, 5000);
}
function tileResponse(req) {
  return caches.match(req.url).then(function (hit) {
    if (hit) return hit;
    // Try CORS so the stored copy has its real size; fall back to the browser's own (opaque) request.
    return fetch(req.url, { mode: 'cors', credentials: 'omit' }).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(SEEN_CACHE).then(function (c) { return c.put(req.url, copy); }).then(trimSeen, function () {}); }
      return res;
    }, function () { return fetch(req); });
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_VERSION).then(function (cache) { return cache.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
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
  if (TILE_HOSTS.indexOf(url.hostname) !== -1) { event.respondWith(tileResponse(req)); return; }
  if (url.origin !== self.location.origin) return; // never cache other third-party requests

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
