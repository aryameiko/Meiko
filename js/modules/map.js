/*
 * MEIKO — Interactive map (Leaflet, no API key).
 *
 *  - Base layers: OpenStreetMap (street map) and Esri World Imagery (satellite) with an optional
 *    place-name overlay. Nautical overlay: OpenSeaMap seamarks.
 *  - Tap the map to pick a point → coordinates in DD / DDM / DMS, copy, save, open in Google Maps /
 *    Google Earth, or send it to a tool (Distance, Course, Qibla, Sunrise…).
 *  - Track mode (also registered as the 'track' tool): waypoint routes, see js/modules/track.js.
 *  - GPS: shows the current fix (phone or external receiver) with its accuracy circle.
 *  - MEIKO.map.pick(opts, cb) opens a map in a sheet; used by the "Map" chip on every coordinate field.
 *
 * Provider hook: MEIKO.map.addBaseLayer({ id, label, create: function (L) { return layer; } })
 * registers another base layer (e.g. Google Map Tiles API once a key is available). No Google API
 * is used now: Google Maps / Google Earth are only opened as links.
 *
 * Offline:
 *  - Leaflet and a Natural Earth 1:50m world outline (land + borders, public domain) ship with the app,
 *    so the map always opens and point-picking works with no signal (outline only, no streets).
 *  - Tiles you view are kept by the service worker (cache 'tiles-seen-v1', capped).
 *  - "Save area for offline" downloads the tiles of the visible area for a few zoom levels into
 *    'tiles-saved-v1' (kept until deleted). Limited to zoom ≤ 16 and a tile cap, to stay within the
 *    OpenStreetMap tile usage policy (no large bulk downloads).
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, icon = ui.icon, esc = ui.esc, C = window.MeikoCore;
  var S = function (k) { return MEIKO.settings.get(k); };
  var VIEW_KEY = 'map:view';
  var DEFAULT_VIEW = { lat: -2.5, lon: 118, z: 5, base: 'osm', sea: true, places: true };

  /* ---------- Layer providers ---------- */
  var URLS = {
    osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    places: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    sea: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
  };
  /* Average tile sizes (KB) used only for the download size estimate. */
  var TILE_KB = { osm: 20, sat: 30, places: 8, sea: 3 };
  var BASES = [
    { id: 'osm', label: 'Map', url: URLS.osm, create: function (L) {
      return L.tileLayer(URLS.osm, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' });
    } },
    { id: 'sat', label: 'Satellite', url: URLS.sat, create: function (L) {
      return L.tileLayer(URLS.sat, { maxZoom: 19, maxNativeZoom: 18, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community' });
    } },
    { id: 'outline', label: 'Offline', create: function (L) { return L.layerGroup(); } }
  ];
  function placesLayer(L) {
    return L.tileLayer(URLS.places, { maxZoom: 19, maxNativeZoom: 18, pane: 'overlayPane' });
  }
  function seaLayer(L) {
    return L.tileLayer(URLS.sea, { maxZoom: 18, minZoom: 3, attribution: 'Seamarks &copy; <a href="https://www.openseamap.org" target="_blank" rel="noopener">OpenSeaMap</a>', pane: 'overlayPane', zIndex: 5 });
  }

  /* ---------- Built-in offline outline (Natural Earth 1:50m, bundled) ---------- */
  var outlineData = null, outlinePromise = null;
  function loadOutline() {
    if (outlineData) return Promise.resolve(outlineData);
    if (!outlinePromise) outlinePromise = fetch('assets/data/countries-50m.json').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    }).then(function (topo) {
      outlineData = window.topojson ? topojson.feature(topo, topo.objects.countries) : null;
      return outlineData;
    }).catch(function (e) { outlinePromise = null; throw e; });
    return outlinePromise;
  }
  function addBaseLayer(def) {
    if (!def || !def.id || typeof def.create !== 'function') throw new Error('addBaseLayer needs { id, label, create }');
    BASES = BASES.filter(function (b) { return b.id !== def.id; }).concat([def]);
  }

  /* ---------- Links & formatting ---------- */
  function fx(v) { return (Math.round(v * 1e6) / 1e6).toFixed(6); }
  function googleMapsUrl(lat, lon) { return 'https://www.google.com/maps/search/?api=1&query=' + fx(lat) + '%2C' + fx(lon); }
  function googleEarthUrl(lat, lon) { return 'https://earth.google.com/web/@' + fx(lat) + ',' + fx(lon) + ',0a,3000d,35y,0h,0t,0r'; }
  function dist(m) {
    return S('distUnit') === 'km' ? ui.num(m / 1000, m < 10000 ? 2 : 1) + ' km' : ui.num(m / 1852, m < 18520 ? 2 : 1) + ' NM';
  }
  function getView() { var v = MEIKO.storage.get(VIEW_KEY, null) || {}; var o = {}; for (var k in DEFAULT_VIEW) o[k] = v[k] != null ? v[k] : DEFAULT_VIEW[k]; return o; }
  function saveView(patch) { var v = getView(); for (var k in patch) v[k] = patch[k]; MEIKO.storage.set(VIEW_KEY, v); }
  function wrapLon(lon) { return ((lon + 180) % 360 + 360) % 360 - 180; }

  /* Tools a picked point can be sent to: storage key 'form:<tool>' + field prefix. */
  var TARGETS = [
    ['distance', 'a', 'Distance & bearing — start'], ['distance', 'b', 'Distance & bearing — destination'],
    ['rhumb', 'a', 'Rhumb line — start'], ['rhumb', 'b', 'Rhumb line — destination'],
    ['course', 'a', 'Course — from'], ['course', 'b', 'Course — to'],
    ['coords', 'p', 'Coordinate converter'], ['qibla', 'p', 'Qibla direction'],
    ['sun', 'p', 'Sunrise & sunset'], ['merpass', 'p', 'Meridian passage'], ['maghrib', 'p', 'Maghrib time']
  ].filter(function (t) { return MEIKO.features.get(t[0]); });

  function sendToTool(tool, prefix, lat, lon) {
    var data = MEIKO.storage.get('form:' + tool, {}) || {};
    data[prefix + '-lat'] = fx(lat); data[prefix + '-lon'] = fx(lon);
    MEIKO.storage.set('form:' + tool, data);
    location.hash = '#/t/' + tool;
  }

  /* ---------- Markers (CSS only, no image files) ---------- */
  function dot(L, cls, html, size) {
    size = size || 18;
    return L.divIcon({ className: 'mk ' + cls, html: html || '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }
  function pinIcon(L) { return L.divIcon({ className: 'mk mk-pin', html: '<svg><use href="#i-pin"/></svg>', iconSize: [34, 34], iconAnchor: [17, 32] }); }

  /**
   * Create a MEIKO map inside `el`. Returns a controller, or null if Leaflet is unavailable.
   * opts: { center:[lat,lon], zoom, markers:bool, onPick(lat,lon) }
   */
  function create(el, opts) {
    opts = opts || {};
    var L = window.L;
    if (!L) { el.innerHTML = ui.notice('err', 'The map library did not load. Reload the page while online.'); return null; }
    var v = getView();
    var center = opts.center || [v.lat, v.lon], zoom = opts.zoom != null ? opts.zoom : v.z;
    var map = L.map(el, { zoomControl: true, worldCopyJump: true, attributionControl: true, tap: true }).setView(center, zoom);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');

    map.createPane('outline'); map.getPane('outline').style.zIndex = 150;
    el.classList.add('map-sea-bg');
    loadOutline().then(function (gj) {
      if (!alive || !gj) return;
      L.geoJSON(gj, { pane: 'outline', interactive: false, style: function () { return { className: 'land', weight: 0.8 }; } }).addTo(map);
    }, function () {});

    var baseLayer = null, baseId = null, sea = null, places = null;
    function setBase(id, dontSave) {
      var def = BASES.filter(function (b) { return b.id === id; })[0] || BASES[0];
      if (baseLayer) map.removeLayer(baseLayer);
      baseLayer = def.create(L).addTo(map); if (baseLayer.bringToBack) baseLayer.bringToBack(); baseId = def.id;
      setPlaces(getView().places);
      if (!dontSave) saveView({ base: def.id });
      el.classList.toggle('is-outline', def.id === 'outline');
    }
    function setPlaces(on) {
      var want = on && baseId === 'sat';
      if (want && !places) places = placesLayer(L).addTo(map);
      if (!want && places) { map.removeLayer(places); places = null; }
    }
    function setSea(on) {
      if (on && !sea) sea = seaLayer(L).addTo(map);
      if (!on && sea) { map.removeLayer(sea); sea = null; }
      saveView({ sea: !!on });
    }
    var startBase = opts.base || (navigator.onLine === false ? 'outline' : v.base);
    setBase(startBase, navigator.onLine === false); setSea(v.sea);

    // Remember the view (only for the main map, not for pickers that were centred on a value).
    if (!opts.noRemember) map.on('moveend', function () { var c = map.getCenter(); saveView({ lat: +c.lat.toFixed(5), lon: +wrapLon(c.lng).toFixed(5), z: map.getZoom() }); });

    // Offline / tile error hint
    var tileErrors = 0;
    map.on('tileerror', function () { tileErrors++; if (tileErrors === 4 && opts.onTileError) opts.onTileError(); });

    // Saved places & sample ports
    var refLayer = L.layerGroup();
    function drawRefs() {
      refLayer.clearLayers();
      MEIKO.storage.locations.all().forEach(function (l) {
        L.marker([l.lat, l.lon], { icon: dot(L, 'mk-saved', '', 14), title: l.name, keyboard: false })
          .bindTooltip(esc(l.name), { direction: 'top', offset: [0, -6] })
          .on('click', function (e) { L.DomEvent.stop(e); if (opts.onPick) opts.onPick(l.lat, l.lon, l.name); }).addTo(refLayer);
      });
      if (window.MeikoData && MeikoData.ports) MeikoData.ports.all().forEach(function (p) {
        L.marker([p.lat, p.lon], { icon: dot(L, 'mk-port', '<svg><use href="#i-anchor"/></svg>', 20), title: p.name, keyboard: false })
          .bindTooltip(esc(p.name) + ' <span class="mk-unv">sample · unverified</span>', { direction: 'top', offset: [0, -8] })
          .on('click', function (e) { L.DomEvent.stop(e); if (opts.onPick) opts.onPick(p.lat, p.lon, p.name + ' (sample port, unverified)'); }).addTo(refLayer);
      });
    }
    if (opts.markers !== false) { drawRefs(); refLayer.addTo(map); }

    // GPS fix
    var gpsMarker = null, gpsCircle = null;
    /* Own-ship marker: the user's vessel avatar (rotated to course over ground when moving) or a blue dot. */
    function gpsIcon(f) {
      var v = MEIKO.vessel && MEIKO.vessel.get();
      if (!v || !v.showOnMap) return dot(L, 'mk-gps', '', 18);
      var moving = f.speed == null || f.speed > 0.5; // m/s; heading is meaningless when stopped
      var hdg = f.heading != null && isFinite(f.heading) && moving ? f.heading : null;
      return L.divIcon({ className: 'mk vsl-mk', html: MEIKO.vessel.markerHTML(v, hdg), iconSize: hdg != null ? [34, 68] : [76, 46], iconAnchor: hdg != null ? [17, 34] : [38, 39] });
    }
    function showFix(f, fly) {
      var ll = [f.lat, f.lon];
      if (!gpsMarker) {
        gpsCircle = L.circle(ll, { radius: f.accuracy || 0, className: 'gps-acc', interactive: false }).addTo(map);
        gpsMarker = L.marker(ll, { icon: gpsIcon(f), zIndexOffset: 1000, keyboard: false }).addTo(map)
          .on('click', function (e) { L.DomEvent.stop(e); if (opts.onPick) opts.onPick(gpsMarker.getLatLng().lat, gpsMarker.getLatLng().lng, 'GPS position'); });
      } else { gpsMarker.setLatLng(ll); gpsCircle.setLatLng(ll); gpsMarker.setIcon(gpsIcon(f)); }
      gpsCircle.setRadius(f.accuracy || 0);
      var vs = MEIKO.vessel && MEIKO.vessel.get();
      gpsMarker.bindTooltip((vs && vs.showOnMap && vs.name ? '<b>' + esc(vs.name) + '</b> · ' : '') + 'GPS' + (f.sourceLabel ? ' · ' + esc(f.sourceLabel) : '') + (f.accuracy != null ? ' · ±' + Math.round(f.accuracy) + ' m' : ''), { direction: 'top', offset: [0, -8] });
      if (fly) map.setView(ll, Math.max(map.getZoom(), f.accuracy && f.accuracy > 2000 ? 11 : 15));
    }
    var onFix = function (f) { if (alive) showFix(f, false); };
    MEIKO.gps.onFix(onFix);
    var lastFix = MEIKO.gps.last && MEIKO.gps.last();
    if (lastFix && isFinite(lastFix.lat)) showFix(lastFix, false);

    // Picking
    var pickMarker = null;
    function setPick(lat, lon, pan) {
      if (!pickMarker) pickMarker = L.marker([lat, lon], { icon: pinIcon(L), draggable: true, zIndexOffset: 900, keyboard: false }).addTo(map)
        .on('dragend', function () { var ll = pickMarker.getLatLng(); if (opts.onPick) opts.onPick(ll.lat, wrapLon(ll.lng)); });
      else pickMarker.setLatLng([lat, lon]);
      if (pan) map.panTo([lat, lon]);
    }
    map.on('click', function (e) {
      if (opts.onMapClick && opts.onMapClick(e.latlng.lat, wrapLon(e.latlng.lng)) === false) return;
      if (opts.onPick) opts.onPick(e.latlng.lat, wrapLon(e.latlng.lng));
    });

    var alive = true;
    var ctl = {
      map: map, L: L,
      setBase: setBase, base: function () { return baseId; }, setSea: setSea, sea: function () { return !!sea; },
      setPlaces: function (on) { saveView({ places: !!on }); setPlaces(on); },
      setPick: setPick, clearPick: function () { if (pickMarker) { map.removeLayer(pickMarker); pickMarker = null; } },
      showFix: showFix, refreshRefs: drawRefs,
      locate: function () {
        return MEIKO.gps.getPosition().then(function (f) { if (alive) showFix(f, true); return f; });
      },
      goTo: function (lat, lon, z) { map.setView([lat, lon], z || Math.max(map.getZoom(), 12)); },
      resize: function () { map.invalidateSize(); },
      destroy: function () { alive = false; try { map.remove(); } catch (e) {} }
    };
    // Size can be wrong when the container was just inserted (sheets, route changes).
    setTimeout(function () { if (alive) map.invalidateSize(); }, 60);
    setTimeout(function () { if (alive) map.invalidateSize(); }, 400);
    return ctl;
  }

  /* ---------- Shared bits of UI ---------- */
  function layerBar(v) {
    if (navigator.onLine === false) v.base = 'outline';
    return '<div class="map-bar">' +
      '<div class="seg seg-sm" data-base>' + BASES.map(function (b) { return '<button type="button" data-v="' + esc(b.id) + '"' + (b.id === v.base ? ' class="on"' : '') + '>' + esc(b.label) + '</button>'; }).join('') + '</div>' +
      '<label class="chk"><input type="checkbox" data-sea' + (v.sea ? ' checked' : '') + '> Sea marks</label>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="chip" data-locate>' + icon('i-gps') + 'My location</button>' +
      '</div>';
  }
  function bindLayerBar(root, ctl, onErr) {
    var seg = ui.$('[data-base]', root);
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      ui.$$('button', seg).forEach(function (x) { x.classList.toggle('on', x === b); });
      ctl.setBase(b.dataset.v);
    });
    ui.$('[data-sea]', root).addEventListener('change', function (e) { ctl.setSea(e.target.checked); });
    var lb = ui.$('[data-locate]', root);
    lb.addEventListener('click', function () {
      lb.disabled = true; var old = lb.innerHTML; lb.innerHTML = icon('i-gps') + 'Locating…';
      ctl.locate().then(function (f) {
        ui.toast('GPS' + (f.source === 'external' ? ' (external)' : '') + (f.accuracy != null ? ' · ±' + Math.round(f.accuracy) + ' m' : ''));
      }, function (err) { if (onErr) onErr(err); else ui.toast(err.message); })
        .then(function () { lb.disabled = false; lb.innerHTML = old; });
    });
  }
  function locErr(err) {
    ui.sheet({ title: 'Location unavailable', html: ui.notice('err', esc(err.message)) + '<p class="small muted mt-12">You can still tap the map to pick a point.</p><div class="actions"><button class="btn btn-ghost" data-close data-lh>' + icon('i-info') + 'How to allow location</button></div>', onMount: function (body) { ui.$('[data-lh]', body).addEventListener('click', function () { setTimeout(MEIKO.app.showLocationHelp, 0); }); } });
  }
  function offlineNote() {
    return navigator.onLine === false ? ui.notice('warn', '<b>Offline.</b> Showing the built-in world outline. Street or satellite tiles work only for areas you saved or viewed before.') : '';
  }
  /** Parse "lat, lon" typed into one box. */
  function parsePair(text) {
    var s = String(text || '').trim(); if (!s) return null;
    var parts = s.indexOf(';') !== -1 ? s.split(';') : s.split(/,(?=\s*[-+]?\d|\s*\d)|\s{2,}/);
    if (parts.length !== 2) {
      var m = s.match(/^(.*?[NS])\s*(.+?[EW])$/i) || s.match(/^([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)$/);
      if (!m) return { ok: false, error: 'Type latitude and longitude separated by a comma, e.g. -6.104, 106.88' };
      parts = [m[1], m[2]];
    }
    var lat = C.coords.parse(parts[0], 'lat'), lon = C.coords.parse(parts[1], 'lon');
    if (!lat.ok) return { ok: false, error: 'Latitude: ' + lat.error };
    if (!lon.ok) return { ok: false, error: 'Longitude: ' + lon.error };
    return { ok: true, lat: lat.value, lon: lon.value };
  }

  function pointHTML(lat, lon, name) {
    var f = C.coords.formatPair;
    return '<div class="card-title">' + icon('i-pin') + (name ? esc(name) : 'Selected point') + '</div>' +
      '<div class="mono-vals">' + ui.kv([['DD', esc(f(lat, lon, 'DD'))], ['DDM', esc(f(lat, lon, 'DDM'))], ['DMS', esc(f(lat, lon, 'DMS'))]]) + '</div>';
  }

  /* ---------- Picker sheet (used by coordinate fields) ---------- */
  function pick(opts, cb) {
    opts = opts || {};
    var ctl = null, cur = null;
    var hasInit = opts.lat != null && opts.lon != null && isFinite(opts.lat) && isFinite(opts.lon);
    ui.sheet({
      title: opts.title || 'Pick on map',
      html: offlineNote() + layerBar(getView()) +
        '<div class="map-box map-pick" data-mapel></div>' +
        '<p class="small muted mt-8" data-pick-info>Tap the map to choose a point. Drag the pin to fine-tune.</p>' +
        '<div class="actions"><button class="btn btn-primary" data-use disabled>' + icon('i-check') + 'Use this point</button>' +
        '<a class="btn btn-ghost" data-gmaps target="_blank" rel="noopener" hidden>' + icon('i-pin') + 'Google Maps</a></div>',
      onClose: function () { if (ctl) ctl.destroy(); },
      onMount: function (body, close) {
        var info = ui.$('[data-pick-info]', body), use = ui.$('[data-use]', body), gm = ui.$('[data-gmaps]', body);
        function choose(lat, lon, name) {
          cur = { lat: lat, lon: lon };
          ctl.setPick(lat, lon);
          info.innerHTML = '<b>' + esc(name ? name + ': ' : '') + esc(ui.coordPair(lat, lon)) + '</b>';
          use.disabled = false; gm.hidden = false; gm.href = googleMapsUrl(lat, lon);
        }
        ctl = create(ui.$('[data-mapel]', body), {
          center: hasInit ? [opts.lat, opts.lon] : null, zoom: hasInit ? 12 : null, noRemember: hasInit,
          onPick: function (lat, lon, name) { choose(lat, lon, name); }
        });
        if (!ctl) return;
        bindLayerBar(body, ctl, locErr);
        if (hasInit) choose(opts.lat, opts.lon);
        use.addEventListener('click', function () { if (cur) { close(); cb(cur); } });
      }
    });
  }

  /* ---------- Offline areas ---------- */
  var SAVED_CACHE = 'tiles-saved-v1', AREAS_KEY = 'map:areas', MAX_TILES = 4000, MAX_Z = 16;
  function lon2x(lon, z) { return Math.floor((lon + 180) / 360 * Math.pow(2, z)); }
  function lat2y(lat, z) {
    lat = Math.max(-85.0511, Math.min(85.0511, lat));
    var r = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z));
  }
  /** Tile URLs for the bounds {s,w,n,e} at zooms z0..z1 for the given layer ids. */
  function areaTiles(b, z0, z1, layers) {
    var out = [];
    for (var z = z0; z <= z1; z++) {
      var n = Math.pow(2, z), x0 = lon2x(Math.max(-180, b.w), z), x1 = lon2x(Math.min(179.9999, b.e), z);
      var y0 = lat2y(b.n, z), y1 = lat2y(b.s, z);
      for (var x = x0; x <= Math.min(x1, n - 1); x++) for (var y = Math.max(0, y0); y <= Math.min(y1, n - 1); y++)
        layers.forEach(function (id) { if (id === 'sea' && z < 3) return; out.push({ id: id, url: URLS[id].replace('{z}', z).replace('{x}', x).replace('{y}', y) }); });
    }
    return out;
  }
  function estimateKB(tiles) { return tiles.reduce(function (a, t) { return a + (TILE_KB[t.id] || 20); }, 0); }
  function sizeLabel(kb) { return kb >= 1024 ? ui.num(kb / 1024, 1) + ' MB' : Math.round(kb) + ' KB'; }

  function fetchTile(url) {
    // CORS first (small, real size in storage); fall back to an opaque response if the host has no CORS.
    return fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; })
      .catch(function (e) { if (/HTTP/.test(e.message)) throw e; return fetch(url, { mode: 'no-cors', credentials: 'omit' }); });
  }
  /** Download tiles into the saved cache. 2 requests at a time, skipping tiles already stored. */
  function downloadTiles(tiles, onProgress, isCancelled) {
    if (!('caches' in window)) return Promise.reject(new Error('This browser cannot store map tiles offline.'));
    return caches.open(SAVED_CACHE).then(function (cache) {
      var i = 0, done = 0, failed = 0;
      function next() {
        if (isCancelled() || i >= tiles.length) return Promise.resolve();
        var t = tiles[i++];
        return cache.match(t.url).then(function (hit) {
          if (hit) return;
          return fetchTile(t.url).then(function (r) { return cache.put(t.url, r); });
        }).catch(function () { failed++; }).then(function () { done++; onProgress(done, failed); return next(); });
      }
      return Promise.all([next(), next()]).then(function () { return { done: done, failed: failed }; });
    });
  }
  function areas() { return MEIKO.storage.get(AREAS_KEY, []) || []; }
  function deleteArea(id) {
    var list = areas(), a = list.filter(function (x) { return x.id === id; })[0];
    MEIKO.storage.set(AREAS_KEY, list.filter(function (x) { return x.id !== id; }));
    if (!a || !('caches' in window)) return Promise.resolve();
    // Keep tiles that another saved area still uses.
    var keep = {};
    areas().forEach(function (o) { areaTiles(o.b, o.z0, o.z1, o.layers).forEach(function (t) { keep[t.url] = 1; }); });
    return caches.open(SAVED_CACHE).then(function (c) {
      return Promise.all(areaTiles(a.b, a.z0, a.z1, a.layers).filter(function (t) { return !keep[t.url]; }).map(function (t) { return c.delete(t.url); }));
    });
  }

  function offlineCard(view, ctl) {
    var box = ui.$('[data-offline-card]', view), rects = null, job = null;
    function drawRects() {
      if (rects) rects.remove();
      rects = ctl.L.layerGroup().addTo(ctl.map);
      areas().forEach(function (a) { ctl.L.rectangle([[a.b.s, a.b.w], [a.b.n, a.b.e]], { className: 'area-rect', interactive: false, weight: 1 }).addTo(rects); });
    }
    function plan() {
      var bb = ctl.map.getBounds(), z = ctl.map.getZoom();
      var b = { s: bb.getSouth(), w: bb.getWest(), n: bb.getNorth(), e: bb.getEast() };
      var base = ctl.base() === 'outline' ? 'osm' : ctl.base();
      var layers = [base]; if (base === 'sat' && getView().places) layers.push('places'); if (ctl.sea()) layers.push('sea');
      var z0 = Math.max(1, Math.min(z, MAX_Z)), z1 = Math.min(MAX_Z, z0 + (+(ui.$('[data-depth]', box) || { value: 3 }).value));
      // Also keep a few lower zoom levels (very few tiles) so the area still shows when zoomed out.
      z0 = Math.max(2, z0 - 3);
      var tiles = areaTiles(b, z0, z1, layers);
      // Trim deepest zooms until under the cap.
      while (tiles.length > MAX_TILES && z1 > z0) { z1--; tiles = areaTiles(b, z0, z1, layers); }
      return { b: b, z0: z0, z1: z1, layers: layers, tiles: tiles, tooBig: tiles.length > MAX_TILES };
    }
    function render() {
      var list = areas(), p = plan();
      var names = { osm: 'street map', sat: 'satellite', places: 'place names', sea: 'sea marks' };
      box.innerHTML = '<div class="card-title">' + icon('i-wifi-off') + 'Offline maps</div>' +
        '<p class="small muted">Without signal the map still opens with a built-in world outline (coastlines and borders), and you can pick points on it. For streets or satellite offline, save an area first while online.</p>' +
        '<label class="field mt-12"><span>Detail to save</span><select data-depth>' +
        [[1, 'Light (+1 zoom level)'], [2, 'Medium (+2 levels)'], [3, 'Detailed (+3 levels)'], [4, 'Very detailed (+4 levels)']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (box._depth || 3) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
        '</select><small class="hint" data-est></small></label>' +
        '<div class="flex mt-8"><button class="btn btn-primary btn-sm" data-dl>' + icon('i-plus') + 'Save visible area</button><span class="small muted" data-dl-status></span></div>' +
        (list.length ? '<div class="section-title">Saved areas</div><ul class="list small">' + list.map(function (a) {
          return '<li><div class="grow"><b>' + esc(a.name) + '</b><small>' + a.count + ' tiles · zoom ' + a.z0 + '–' + a.z1 + ' · ' + esc(a.layers.map(function (l) { return names[l]; }).join(', ')) + '</small></div>' +
            '<button class="icon-btn" data-show="' + a.id + '" aria-label="Show">' + icon('i-search') + '</button><button class="icon-btn" data-delarea="' + a.id + '" aria-label="Delete">' + icon('i-trash') + '</button></li>';
        }).join('') + '</ul>' : '') +
        '<p class="small muted mt-8" data-usage></p>';
      var est = ui.$('[data-est]', box);
      est.textContent = p.tiles.length + ' tiles, about ' + sizeLabel(estimateKB(p.tiles)) + ' · zoom ' + p.z0 + '–' + p.z1 + ' · ' + p.layers.map(function (l) { return names[l]; }).join(' + ') +
        (p.z0 >= MAX_Z ? ' · zoom out to save more area' : '');
      ui.$('[data-depth]', box).addEventListener('change', function (e) { box._depth = +e.target.value; render(); });
      ui.$('[data-dl]', box).addEventListener('click', start);
      ui.$$('[data-delarea]', box).forEach(function (b) { b.addEventListener('click', function () { deleteArea(b.dataset.delarea).then(function () { render(); drawRects(); ui.toast('Offline area deleted'); }); }); });
      ui.$$('[data-show]', box).forEach(function (b) { b.addEventListener('click', function () {
        var a = areas().filter(function (x) { return x.id === b.dataset.show; })[0]; if (a) ctl.map.fitBounds([[a.b.s, a.b.w], [a.b.n, a.b.e]]);
      }); });
      if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) {
        var u = ui.$('[data-usage]', box); if (u && e.usage != null) u.textContent = 'Storage used by MEIKO on this device: ' + sizeLabel(e.usage / 1024) + (e.quota ? ' of ' + sizeLabel(e.quota / 1024) + ' available' : '') + '.';
      });
      if (job) setBusy(true);
    }
    function setBusy(on) {
      var b = ui.$('[data-dl]', box); if (!b) return;
      b.innerHTML = on ? icon('i-x') + 'Cancel' : icon('i-plus') + 'Save visible area';
      b.classList.toggle('btn-danger', on); b.classList.toggle('btn-primary', !on);
    }
    function start() {
      if (job) { job.cancel = true; return; }
      if (navigator.onLine === false) return ui.toast('You are offline. Connect to the internet to save an area.');
      var p = plan();
      if (!p.tiles.length) return;
      if (p.tooBig) return ui.toast('Area too large. Zoom in a little and try again.');
      var c = ctl.map.getCenter();
      var name = 'Area near ' + ui.coordPair(c.lat, wrapLon(c.lng));
      job = { cancel: false };
      setBusy(true);
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
      var st = ui.$('[data-dl-status]', box);
      downloadTiles(p.tiles, function (d, f) {
        st = ui.$('[data-dl-status]', box);
        if (st) st.textContent = d + ' / ' + p.tiles.length + (f ? ' · ' + f + ' failed' : '');
      }, function () { return job.cancel; }).then(function (r) {
        var cancelled = job.cancel; job = null;
        if (!cancelled && r.done - r.failed > 0) {
          var list = areas(); list.push({ id: 'a' + Date.now().toString(36), name: name, b: p.b, z0: p.z0, z1: p.z1, layers: p.layers, count: p.tiles.length, at: new Date().toISOString() });
          MEIKO.storage.set(AREAS_KEY, list);
        }
        ui.toast(cancelled ? 'Download cancelled' : r.failed ? 'Saved with ' + r.failed + ' missing tiles' : 'Area saved for offline use');
        render(); drawRects();
      }, function (e) { job = null; ui.toast(e.message); render(); });
    }
    ctl.map.on('moveend zoomend', function () { if (!job && box.isConnected) { var est = ui.$('[data-est]', box); if (est) render(); } });
    drawRects(); render();
  }

  /* ---------- Map page (also the Track planner) ---------- */
  function renderMap(view, feature, startMode) {
      var v = getView();
      view.innerHTML = ui.pageHead({ cat: feature.cat, title: feature.title, lead: feature.lead }) +
        '<div data-offline>' + offlineNote() + '</div>' +
        '<div class="card map-card">' + layerBar(v) +
        '<div class="map-bar map-bar-2">' +
          '<div class="seg seg-sm" data-mode><button type="button" data-v="pick">' + icon('i-pin') + 'Pick point</button><button type="button" data-v="route">' + icon('i-route') + 'Track</button></div>' +
          '<form class="map-go" data-go novalidate><input data-go-in placeholder="Go to: -6.104, 106.88" aria-label="Go to coordinates" autocomplete="off" spellcheck="false"><button class="icon-btn" aria-label="Go">' + icon('i-search') + '</button></form>' +
        '</div>' +
        '<div class="map-box map-main" data-mapel></div><div class="live-panel" data-live-panel></div></div>' +
        '<div class="tool-grid mt-12"><div class="stack"><div class="card card-pad" data-panel></div></div>' +
        '<div class="results-col stack"><div class="card card-pad" data-offline-card></div><div class="card card-pad small" data-about></div></div></div>';

      var panel = ui.$('[data-panel]', view), mode = null, sel = null, trk = null;

      function renderIdle() {
        panel.innerHTML = '<div class="card-title">' + icon('i-pin') + 'Selected point</div><p class="small muted">Tap the map, a saved place, a port or your GPS dot to select it.</p>';
      }
      function shortName(name) { return name && name.length <= 40 ? name : ''; }
      function renderPoint(lat, lon, name) {
        sel = { lat: lat, lon: lon, name: name };
        panel.innerHTML = pointHTML(lat, lon, name) +
          '<div class="flex mt-12">' +
          '<button class="btn btn-ghost btn-sm" data-cp>' + icon('i-copy') + 'Copy</button>' +
          '<button class="btn btn-ghost btn-sm" data-save>' + icon('i-star') + 'Save</button>' +
          '<button class="btn btn-ghost btn-sm" data-to-track>' + icon('i-route') + 'Add to track</button>' +
          '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + googleMapsUrl(lat, lon) + '">' + icon('i-pin') + 'Google Maps</a>' +
          '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + googleEarthUrl(lat, lon) + '">' + icon('i-nav') + 'Google Earth</a>' +
          '</div>' +
          '<label class="field mt-12"><span>Use this point in</span><div class="flex nowrap"><select data-target>' +
          TARGETS.map(function (t, i) { return '<option value="' + i + '">' + esc(t[2]) + '</option>'; }).join('') +
          '</select><button class="btn btn-primary btn-sm" data-send>' + icon('i-chev') + 'Open</button></div></label>';
        ui.$('[data-cp]', panel).addEventListener('click', function () { ui.copy(fx(lat) + ', ' + fx(lon), 'Coordinates copied'); });
        ui.$('[data-save]', panel).addEventListener('click', function () { MEIKO.app.promptSave(lat, lon, function () { ctl.refreshRefs(); }); });
        ui.$('[data-to-track]', panel).addEventListener('click', function () { setMode('route'); trk.add(lat, lon, shortName(name)); });
        ui.$('[data-send]', panel).addEventListener('click', function () {
          var t = TARGETS[+ui.$('[data-target]', panel).value]; if (t) sendToTool(t[0], t[1], lat, lon);
        });
      }

      var ctl = create(ui.$('[data-mapel]', view), {
        onPick: function (lat, lon, name) {
          if (mode === 'route') { trk.add(lat, lon, shortName(name)); return; }
          ctl.setPick(lat, lon); renderPoint(lat, lon, name);
        },
        onTileError: function () {
          var o = ui.$('[data-offline]', view);
          if (o && !o.innerHTML) o.innerHTML = ui.notice('warn', 'Some map tiles could not be loaded. Check the internet connection; areas you viewed before stay available offline.');
        }
      });
      if (!ctl) return;
      bindLayerBar(view, ctl, locErr);
      trk = MEIKO.trackUI.attach(ctl, panel);
      var lv = MEIKO.liveNav.attach(ctl, ui.$('[data-live-panel]', view));
      offlineCard(view, ctl);

      var modeSeg = ui.$('[data-mode]', view);
      function setMode(m) {
        if (m === mode) return;
        mode = m;
        ui.$$('button', modeSeg).forEach(function (x) { x.classList.toggle('on', x.dataset.v === m); });
        if (m === 'route') { ctl.clearPick(); trk.show(); }
        else { trk.hide(); if (sel) { ctl.setPick(sel.lat, sel.lon); renderPoint(sel.lat, sel.lon, sel.name); } else renderIdle(); }
      }
      modeSeg.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) setMode(b.dataset.v); });
      setMode(startMode);

      ui.$('[data-go]', view).addEventListener('submit', function (e) {
        e.preventDefault();
        var r = parsePair(ui.$('[data-go-in]', view).value);
        if (!r) return;
        if (!r.ok) return ui.toast(r.error);
        ctl.goTo(r.lat, r.lon, 13);
        if (mode === 'route') trk.add(r.lat, r.lon);
        else { ctl.setPick(r.lat, r.lon); renderPoint(r.lat, r.lon); }
      });

      ui.$('[data-about]', view).innerHTML =
        '<div class="card-title">' + icon('i-info') + 'About the map</div>' +
        '<ul class="list small">' +
        '<li><div class="grow"><b>Street map</b><small>OpenStreetMap contributors (ODbL).</small></div></li>' +
        '<li><div class="grow"><b>Satellite</b><small>Esri World Imagery. Imagery dates vary by area.</small></div></li>' +
        '<li><div class="grow"><b>Sea marks</b><small>OpenSeaMap, community data. Coverage is incomplete.</small></div><span class="badge warn">not official</span></li>' +
        '<li><div class="grow"><b>Ports on the map</b><small>Sample positions, not yet verified.</small></div><span class="badge warn">unverified</span></li>' +
        '<li><div class="grow"><b>Offline outline</b><small>Natural Earth 1:50 m coastlines and borders, built in. Small islands and harbours are simplified or missing.</small></div><span class="badge info">approx.</span></li>' +
        '<li><div class="grow"><b>Viewed areas</b><small>Map tiles you have looked at are also kept on this device (about the last 2 000).</small></div></li>' +
        '</ul><p class="small muted mt-12">Google Maps and Google Earth open as separate links. ' + esc(ui.NAV_DISCLAIMER) + '</p>';

      var onNet = function () { var o = ui.$('[data-offline]', view); if (o) o.innerHTML = offlineNote(); };
      window.addEventListener('online', onNet); window.addEventListener('offline', onNet);
      return function () { window.removeEventListener('online', onNet); window.removeEventListener('offline', onNet); lv.destroy(); ctl.destroy(); };
  }

  MEIKO.features.register({
    id: 'map', cat: 'position', icon: 'i-map', title: 'Map',
    desc: 'Pick a point on the map, satellite view, sea marks, tracks',
    keywords: 'peta map satellite satelit google maps earth openstreetmap openseamap pick point titik chart',
    lead: 'Tap anywhere to read its coordinates and use them in any tool. Street map, satellite imagery and OpenSeaMap sea marks; no account needed.',
    render: function (view) { return renderMap(view, this, 'pick'); }
  });
  MEIKO.features.register({
    id: 'track', cat: 'navigation', order: 1, icon: 'i-route', title: 'Track Planner',
    desc: 'Waypoints on the map: course (T/M), distance, ETA per leg; save, GPX',
    keywords: 'track trek rute route waypoint way point titik belok turning point baringan bearing haluan course jarak distance gpx plan passage pelayaran',
    lead: 'Tap the map to add turning points in order. Each leg shows true and magnetic course, distance and ETA. Tracks are saved on this device and work offline.',
    render: function (view) { return renderMap(view, this, 'route'); }
  });

  /** Points along the great circle a→b (for drawing), split at the antimeridian by Leaflet's worldCopyJump. */
  function gcPoints(a, b) {
    var d = C.geo.haversine(a.lat, a.lon, b.lat, b.lon);
    var n = Math.max(1, Math.min(64, Math.ceil(d / 200000)));
    var r = Math.PI / 180, out = [];
    var p1 = a.lat * r, l1 = a.lon * r, p2 = b.lat * r, l2 = b.lon * r, dd = d / 6371008.8;
    if (dd < 1e-9) return [[a.lat, a.lon], [b.lat, b.lon]];
    var prevLon = null;
    for (var i = 0; i <= n; i++) {
      var f = i / n, A = Math.sin((1 - f) * dd) / Math.sin(dd), B = Math.sin(f * dd) / Math.sin(dd);
      var x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
      var y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
      var z = A * Math.sin(p1) + B * Math.sin(p2);
      var lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / r, lon = Math.atan2(y, x) / r;
      // keep the line continuous across ±180°
      if (prevLon != null) { while (lon - prevLon > 180) lon -= 360; while (lon - prevLon < -180) lon += 360; }
      prevLon = lon; out.push([lat, lon]);
    }
    return out;
  }

  MEIKO.map = {
    create: create, pick: pick, addBaseLayer: addBaseLayer, parsePair: parsePair, gcPoints: gcPoints,
    googleMapsUrl: googleMapsUrl, googleEarthUrl: googleEarthUrl
  };
})();
