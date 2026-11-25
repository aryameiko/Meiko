/*
 * MEIKO — Interactive map (Leaflet, no API key).
 *
 *  - Base layers: OpenStreetMap (street map, ODbL) and EOxCloudless 2016 (Sentinel-2 satellite mosaic,
 *    CC BY 4.0). Nautical overlay: OpenSeaMap seamarks (CC BY-SA). Only openly licensed sources (v1.16).
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
 *  - No bulk "save area" download: neither the OpenStreetMap tile policy nor the free EOX service allows
 *    pre-fetching tiles for offline use. Areas saved by older versions (Esri imagery) are removed once.
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
    // EOxCloudless 2016 (layer s2cloudless_3857): the only year released under CC BY 4.0; later years are non-commercial.
    sat: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    sea: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
  };
  var BASES = [
    { id: 'osm', label: 'Map', url: URLS.osm, create: function (L) {
      return L.tileLayer(URLS.osm, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' });
    } },
    { id: 'sat', label: 'Satellite', url: URLS.sat, create: function (L) {
      return L.tileLayer(URLS.sat, { maxZoom: 19, maxNativeZoom: 15, attribution: '<a href="https://cloudless.eox.at" target="_blank" rel="noopener">EOxCloudless 2016</a> by <a href="https://eox.at" target="_blank" rel="noopener">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016 &amp; 2017), CC BY 4.0' });
    } },
    { id: 'outline', label: 'Offline', create: function (L) { return L.layerGroup(); } }
  ];
  function placesLayer(L) {
    return null; // the Esri place-name overlay was removed in v1.16 (not openly licensed)
  }
  function seaLayer(L) {
    return L.tileLayer(URLS.sea, { maxZoom: 18, minZoom: 3, attribution: 'Seamarks &copy; <a href="https://www.openseamap.org" target="_blank" rel="noopener">OpenSeaMap</a> (CC BY-SA 2.0)', pane: 'overlayPane', zIndex: 5 });
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
      var want = false; // no openly licensed place-name overlay
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
      destroy: function () { alive = false; if (MEIKO.gps.offFix) MEIKO.gps.offFix(onFix); try { map.remove(); } catch (e) {} }
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
    return navigator.onLine === false ? ui.notice('warn', '<b>Offline.</b> Showing the built-in world outline. Street or satellite tiles work only for areas you viewed before.') : '';
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

  /* ---------- Offline maps ----------
   * No bulk download: the OpenStreetMap tile policy forbids it and the free EOX service does not offer it
   * (offline copies are a paid EOX product). Tiles you view are still kept by the service worker.
   * Areas saved by older versions (Esri imagery, place names, sea marks) are removed once. */
  var SAVED_CACHE = 'tiles-saved-v1', AREAS_KEY = 'map:areas';
  function purgeSaved() {
    if (MEIKO.storage.get('map:savedPurged', false)) return;
    MEIKO.storage.remove(AREAS_KEY); MEIKO.storage.set('map:savedPurged', true);
    if ('caches' in window) caches.delete(SAVED_CACHE).catch(function () {});
  }
  function offlineCard(view) {
    var box = ui.$('[data-offline-card]', view);
    purgeSaved();
    box.innerHTML = '<div class="card-title">' + icon('i-wifi-off') + 'Offline maps</div>' +
      '<p class="small muted">Without signal the map still opens with a built-in world outline (coastlines and borders), and you can pick points on it. Map and satellite areas you viewed recently stay available on this device.</p>' +
      '<p class="small muted">Downloading whole areas in advance is not offered: the open map services MEIKO uses do not allow it.</p>';
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
      var fleetLayer = MEIKO.fleet && MEIKO.fleet.attachMap ? MEIKO.fleet.attachMap(ctl) : null; // other MEIKO vessels online
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
        '<li><div class="grow"><b>Satellite</b><small>EOxCloudless 2016: Copernicus Sentinel-2 cloud-free mosaic (2016–2017, 10 m), CC BY 4.0. Harbours and new buildings may be missing.</small></div></li>' +
        '<li><div class="grow"><b>Sea marks</b><small>OpenSeaMap, community data. Coverage is incomplete.</small></div><span class="badge warn">not official</span></li>' +
        '<li><div class="grow"><b>Ports on the map</b><small>Sample positions, not yet verified.</small></div><span class="badge warn">unverified</span></li>' +
        '<li><div class="grow"><b>Offline outline</b><small>Natural Earth 1:50 m coastlines and borders, built in. Small islands and harbours are simplified or missing.</small></div><span class="badge info">approx.</span></li>' +
        '<li><div class="grow"><b>Viewed areas</b><small>Map tiles you have looked at are also kept on this device (about the last 2 000).</small></div></li>' +
        '</ul><p class="small muted mt-12">Google Maps and Google Earth open as separate links. ' + esc(ui.NAV_DISCLAIMER) + '</p>';

      var onNet = function () { var o = ui.$('[data-offline]', view); if (o) o.innerHTML = offlineNote(); };
      window.addEventListener('online', onNet); window.addEventListener('offline', onNet);
      return function () { window.removeEventListener('online', onNet); window.removeEventListener('offline', onNet); lv.destroy(); if (fleetLayer) fleetLayer.destroy(); ctl.destroy(); };
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
