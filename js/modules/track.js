/*
 * MEIKO — Track planner UI (waypoint routes on the map).
 *
 * Attached to the Map page's "Track" mode by map.js (MEIKO.trackUI.attach). Waypoints are added by
 * tapping the map, typing coordinates or using the GPS fix; they can be dragged on the map, renamed,
 * edited, reordered, inserted and deleted. Each leg shows true and magnetic course, distance, time and
 * ETA. Tracks are stored on the device (storage key 'tracks'), the track being edited is kept as a
 * draft ('track:draft'), and tracks can be exported/imported as GPX 1.1.
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, icon = ui.icon, esc = ui.esc, C = window.MeikoCore;
  var S = function (k) { return MEIKO.settings.get(k); };
  var TRACKS = 'tracks', DRAFT = 'track:draft', MAX_WP = 500;

  /* ---------- Storage ---------- */
  function all() { return MEIKO.storage.get(TRACKS, []) || []; }
  function byId(id) { return all().filter(function (t) { return t.id === id; })[0] || null; }
  function put(t) {
    var list = all(), i = list.map(function (x) { return x.id; }).indexOf(t.id);
    if (i === -1) list.unshift(t); else list[i] = t;
    MEIKO.storage.set(TRACKS, list);
  }
  function remove(id) { MEIKO.storage.set(TRACKS, all().filter(function (t) { return t.id !== id; })); }
  function newId() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function blank() { return { id: null, name: '', points: [], type: 'rhumb', speed: '', depart: '', varMode: 'auto', varVal: '', dirty: false }; }
  function loadDraft() { var d = MEIKO.storage.get(DRAFT, null); if (!d || !Array.isArray(d.points)) return blank(); var b = blank(); for (var k in b) if (d[k] != null) b[k] = d[k]; return b; }
  function snapshot(d) { return { id: d.id, name: d.name, points: d.points.map(function (p) { return { lat: p.lat, lon: p.lon, name: p.name || '' }; }), type: d.type, speed: d.speed, depart: d.depart, varMode: d.varMode, varVal: d.varVal }; }

  /* ---------- Formatting ---------- */
  function fx(v) { return (Math.round(v * 1e6) / 1e6).toFixed(6); }
  function distTxt(nm) { return S('distUnit') === 'km' ? ui.num(nm * 1.852, nm * 1.852 < 10 ? 2 : 1) + ' km' : ui.num(nm, nm < 10 ? 2 : 1) + ' NM'; }
  function pad3(v) { var r = (Math.round(v * 10) / 10) % 360; var s = r.toFixed(1); while (s.length < 5) s = '0' + s; return s + '°'; }
  function dur(h) { if (h == null || !isFinite(h)) return '—'; var m = Math.round(h * 60), d = Math.floor(m / 1440); m -= d * 1440; return (d ? d + 'd ' : '') + Math.floor(m / 60) + 'h ' + ('0' + (m % 60)).slice(-2) + 'm'; }
  function varTxt(v) { return v == null ? '—' : Math.abs(v).toFixed(1) + '° ' + (v >= 0 ? 'E' : 'W'); }
  function etaTxt(ms, departMs) {
    if (ms == null) return '';
    var t = ui.time(ms);
    var sameDay = departMs != null && ui.date(ms) === ui.date(departMs);
    return sameDay ? t : t + ', ' + ui.date(ms).replace(/ \d{4}$/, '');
  }

  /** Compute legs from a draft. Returns { res, error, departMs, varSource }. */
  function compute(d) {
    var departMs = d.depart ? ui.parseLocalDateTime(d.depart, S('tz')) : null;
    var spd = parseFloat(String(d.speed).replace(',', '.'));
    var variation = null, src = '';
    if (d.varMode === 'manual') {
      var mv = parseFloat(String(d.varVal).replace(',', '.'));
      if (isFinite(mv)) { variation = mv; src = 'Manual variation ' + varTxt(mv) + ' (from your chart)'; }
      else src = 'Enter a variation to show magnetic courses';
    } else if (C.wmm) {
      var when = departMs != null ? new Date(departMs) : new Date();
      variation = function (lat, lon) { return C.wmm.declination(lat, lon, when); };
      src = 'Variation from the World Magnetic Model 2025 at each leg start' + (C.wmm.inRange(when) ? '' : ' (date outside 2025–2029, less accurate)') + '. Local anomalies and deviation are not included.';
    }
    try {
      return { res: C.track.legs(d.points, { type: d.type, speedKn: isFinite(spd) && spd > 0 ? spd : null, departMs: departMs, variation: variation }), departMs: departMs, varSource: src, speed: isFinite(spd) && spd > 0 ? spd : null };
    } catch (e) { return { error: e.message, departMs: departMs, varSource: src }; }
  }

  function textSummary(d, c) {
    var lines = [(d.name || 'Track') + ' — ' + d.points.length + ' waypoints, ' + (d.type === 'gc' ? 'great circle' : 'rhumb line') + ' legs'];
    d.points.forEach(function (p, i) {
      lines.push('WP' + (i + 1) + (p.name ? ' ' + p.name : '') + '\t' + ui.coordPair(p.lat, p.lon) + '\t(' + fx(p.lat) + ', ' + fx(p.lon) + ')');
      var l = c.res && c.res.legs[i];
      if (l) lines.push('   → ' + pad3(l.courseT) + 'T' + (l.courseM != null ? ' / ' + pad3(l.courseM) + 'M' : '') + '  ' + distTxt(l.distNM) + (l.hours != null ? '  ' + dur(l.hours) : '') + (l.etaMs != null ? '  ETA ' + etaTxt(l.etaMs, c.departMs) : ''));
    });
    if (c.res) lines.push('Total ' + distTxt(c.res.totalNM) + (c.res.totalH != null ? ', ' + dur(c.res.totalH) + ' at ' + c.speed + ' kn' : '') + (c.res.arriveMs != null ? ', arrive ' + etaTxt(c.res.arriveMs, null) : ''));
    return lines.join('\n');
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function fileName(name) { return (String(name || 'meiko-track').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'meiko-track') + '.gpx'; }

  /* ---------- Waypoint edit sheet ---------- */
  function editSheet(title, p, onSave) {
    ui.sheet({
      title: title,
      html: '<form class="form-gap" novalidate><label class="field"><span>Name (optional)</span><input data-n maxlength="40" value="' + esc(p && p.name || '') + '" placeholder="e.g. Buoy 3, turn point"></label>' +
        ui.coordField('w', 'Position') + '<div class="actions"><button class="btn btn-primary" data-ok>' + icon('i-check') + 'Save waypoint</button><button type="button" class="btn btn-ghost" data-close>Cancel</button></div><div data-err></div></form>',
      onMount: function (body, close) {
        var cf = ui.bindCoord(body, 'w');
        if (p && isFinite(p.lat)) cf.set(p.lat, p.lon);
        ui.$('form', body).addEventListener('submit', function (e) {
          e.preventDefault();
          var r = cf.get();
          if (!r.ok) { ui.$('[data-err]', body).innerHTML = ui.notice('err', esc(r.error)); return; }
          close(); onSave({ lat: r.lat, lon: r.lon, name: ui.$('[data-n]', body).value.trim() });
        });
      }
    });
  }

  /* ---------- Controller ---------- */
  function attach(ctl, panel) {
    var L = ctl.L, map = ctl.map;
    var d = loadDraft(), layer = null, active = false, selIdx = null;

    function save() { MEIKO.storage.set(DRAFT, d); }
    panel.addEventListener('click', function (e) { if (active) onListClick(e); });
    function changed() { d.dirty = true; save(); draw(); render(); }

    function unwrap(pts) { // keep a continuous line across ±180°
      var out = [], prev = null;
      pts.forEach(function (p) { var lon = p[1]; if (prev != null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; } prev = lon; out.push([p[0], lon]); });
      return out;
    }
    function draw() {
      if (layer) layer.remove();
      if (!active) return;
      layer = L.layerGroup().addTo(map);
      var c = compute(d);
      var line = [];
      for (var i = 1; i < d.points.length; i++) {
        var seg = d.type === 'gc' ? MEIKO.map.gcPoints(d.points[i - 1], d.points[i]) : [[d.points[i - 1].lat, d.points[i - 1].lon], [d.points[i].lat, d.points[i].lon]];
        line = line.concat(i > 1 ? seg.slice(1) : seg);
      }
      if (line.length > 1) L.polyline(unwrap(line), { className: 'route-line', weight: 3, interactive: false }).addTo(layer);
      // Leg labels at mid-leg
      if (c.res && d.points.length <= 60) c.res.legs.forEach(function (l) {
        var a = d.points[l.from], b = d.points[l.to];
        var mlon = b.lon - a.lon; if (mlon > 180) mlon -= 360; if (mlon < -180) mlon += 360;
        L.marker([(a.lat + b.lat) / 2, a.lon + mlon / 2], { interactive: false, keyboard: false,
          icon: L.divIcon({ className: 'leg-label', html: '<span>' + pad3(l.courseT) + ' · ' + esc(distTxt(l.distNM)) + '</span>', iconSize: null }) }).addTo(layer);
      });
      d.points.forEach(function (p, i) {
        var m = L.marker([p.lat, p.lon], { draggable: true, keyboard: false, zIndexOffset: 800,
          icon: L.divIcon({ className: 'mk mk-wp' + (i === selIdx ? ' sel' : '') + (i === 0 ? ' first' : ''), html: String(i + 1), iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(layer);
        if (p.name) m.bindTooltip(esc(p.name), { direction: 'top', offset: [0, -10] });
        m.on('click', function (e) { L.DomEvent.stop(e); select(i, false); });
        m.on('dragend', function () { var ll = m.getLatLng(); p.lat = ll.lat; p.lon = ((ll.lng + 180) % 360 + 360) % 360 - 180; selIdx = i; changed(); });
      });
    }
    function select(i, pan) {
      selIdx = i; draw(); render();
      var row = panel.querySelector('[data-wp="' + i + '"]');
      if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (pan && d.points[i]) map.panTo([d.points[i].lat, d.points[i].lon]);
    }

    function add(lat, lon, name) {
      if (d.points.length >= MAX_WP) return ui.toast('A track can have up to ' + MAX_WP + ' waypoints.');
      var p = { lat: lat, lon: lon, name: name || '' };
      if (selIdx != null && selIdx < d.points.length - 1 && d.insertMode) { d.points.splice(selIdx + 1, 0, p); selIdx = selIdx + 1; }
      else { d.points.push(p); selIdx = d.points.length - 1; }
      changed();
    }

    function render() {
      if (!active) return;
      var c = compute(d), n = d.points.length, saved = d.id ? byId(d.id) : null, count = all().length;
      var h = '<div class="card-title">' + icon('i-route') + 'Track' + (d.dirty && n ? ' <span class="badge warn">not saved</span>' : saved ? ' <span class="badge ok">saved</span>' : '') +
        '</div><div class="flex track-head-btns"><button class="btn btn-ghost btn-sm" data-t-new>' + icon('i-plus') + 'New track</button>' +
        '<button class="btn btn-ghost btn-sm" data-t-open>' + icon('i-book') + 'My tracks' + (count ? ' (' + count + ')' : '') + '</button></div>' +
        '<div class="form-gap track-form">' +
        '<label class="field"><span>Track name</span><div class="flex nowrap"><input data-t-name maxlength="60" placeholder="e.g. Tanjung Priok – Merak" value="' + esc(d.name) + '">' +
        '<button class="btn btn-primary btn-sm" data-t-save' + (n ? '' : ' disabled') + '>' + icon('i-check') + 'Save</button></div></label>' +
        '<div class="row">' +
        '<div class="field"><span>Legs</span><div class="seg seg-sm" data-t-type><button type="button" data-v="rhumb"' + (d.type !== 'gc' ? ' class="on"' : '') + '>Rhumb line</button><button type="button" data-v="gc"' + (d.type === 'gc' ? ' class="on"' : '') + '>Great circle</button></div></div>' +
        '<label class="field"><span>Speed (knots)</span><input data-t-speed inputmode="decimal" placeholder="e.g. 12" value="' + esc(d.speed) + '"></label>' +
        '</div><div class="row">' +
        '<label class="field"><span>Departure (' + esc(ui.tzLabel(S('tz'))) + ')</span><input type="datetime-local" data-t-dep value="' + esc(d.depart) + '"></label>' +
        '<label class="field"><span>Magnetic variation</span><div class="flex nowrap"><select data-t-varmode><option value="auto"' + (d.varMode !== 'manual' ? ' selected' : '') + '>Auto (WMM2025)</option><option value="manual"' + (d.varMode === 'manual' ? ' selected' : '') + '>From chart</option></select>' +
        (d.varMode === 'manual' ? '<input data-t-var inputmode="decimal" placeholder="° (E +, W −)" value="' + esc(d.varVal) + '" style="max-width:110px">' : '') + '</div></label>' +
        '</div>' +
        '<form class="flex nowrap" data-t-add novalidate><input data-t-add-in placeholder="Add waypoint: lat, lon" autocomplete="off" spellcheck="false" aria-label="Add waypoint by coordinates">' +
        '<button class="btn btn-ghost btn-sm">' + icon('i-plus') + 'Add</button><button type="button" class="btn btn-ghost btn-sm" data-t-gps>' + icon('i-gps') + 'GPS</button></form>' +
        '</div>';

      if (!n) h += '<p class="small muted mt-12">Tap the map to add the first waypoint, then each turning point in order. You can also type coordinates, use your GPS position, or import a GPX file from <b>My tracks</b>.</p>';
      else {
        if (c.error) h += ui.notice('err', esc(c.error));
        if (c.res && n > 1) {
          h += '<div class="track-total mt-12">' +
            '<div><small>Total distance</small><b>' + esc(distTxt(c.res.totalNM)) + '</b></div>' +
            '<div><small>Time' + (c.speed ? ' at ' + esc(String(c.speed)) + ' kn' : '') + '</small><b>' + (c.res.totalH != null ? dur(c.res.totalH) : '<span class="muted">add speed</span>') + '</b></div>' +
            '<div><small>Arrival</small><b>' + (c.res.arriveMs != null ? esc(ui.time(c.res.arriveMs)) + '<em>' + esc(ui.date(c.res.arriveMs)) + '</em>' : '<span class="muted">add departure</span>') + '</b></div>' +
            '</div>';
        }
        h += '<ol class="wp-list mt-12">';
        d.points.forEach(function (p, i) {
          h += '<li class="wp' + (i === selIdx ? ' sel' : '') + '" data-wp="' + i + '"><span class="wp-no">' + (i + 1) + '</span>' +
            '<div class="grow"><input class="wp-name" data-wp-name="' + i + '" value="' + esc(p.name || '') + '" placeholder="WP' + (i + 1) + '" maxlength="40" aria-label="Waypoint ' + (i + 1) + ' name">' +
            '<button type="button" class="wp-pos" data-wp-edit="' + i + '">' + esc(ui.coordPair(p.lat, p.lon)) + '</button></div>' +
            '<div class="wp-btns"><button class="icon-btn" data-wp-up="' + i + '" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>' + icon('i-chev', 'rot-up') + '</button>' +
            '<button class="icon-btn" data-wp-down="' + i + '" aria-label="Move down"' + (i === n - 1 ? ' disabled' : '') + '>' + icon('i-chev', 'rot-down') + '</button>' +
            '<button class="icon-btn" data-wp-ins="' + i + '" aria-label="Insert waypoint after"' + (i === n - 1 ? ' disabled' : '') + '>' + icon('i-plus') + '</button>' +
            '<button class="icon-btn" data-wp-del="' + i + '" aria-label="Delete waypoint">' + icon('i-trash') + '</button></div></li>';
          var l = c.res && c.res.legs[i];
          if (l) h += '<li class="leg"><span class="leg-arrow">↓</span><div class="grow"><b>' + pad3(l.courseT) + ' T</b>' +
            (l.courseM != null ? ' <span class="muted">·</span> <b>' + pad3(l.courseM) + ' M</b>' : '') +
            ' <span class="muted">·</span> <b>' + esc(distTxt(l.distNM)) + '</b>' +
            '<small>' + (d.type === 'gc' ? 'Initial course, final ' + pad3(l.finalT) + ' T · ' : '') + (l.variation != null ? 'Var ' + varTxt(l.variation) : '') +
            (l.hours != null ? ' · ' + dur(l.hours) : '') + (l.etaMs != null ? ' · ETA WP' + (i + 2) + ' ' + esc(etaTxt(l.etaMs, c.departMs)) : '') + '</small></div></li>';
        });
        h += '</ol>';
        h += '<div class="flex mt-12"><button class="btn btn-ghost btn-sm" data-t-copy>' + icon('i-copy') + 'Copy</button>' +
          '<button class="btn btn-ghost btn-sm" data-t-gpx>' + icon('i-route') + 'Export GPX</button>' +
          '<button class="btn btn-ghost btn-sm" data-t-fit>' + icon('i-search') + 'Show all</button>' +
          '<button class="btn btn-ghost btn-sm" data-t-rev' + (n < 2 ? ' disabled' : '') + '>' + icon('i-swap') + 'Reverse</button>' +
          '<button class="btn btn-gold btn-sm" data-t-nav>' + icon('i-gps') + 'Navigate</button></div>';
        h += '<p class="small muted mt-12">' + esc(c.varSource) + ' ' + (d.type === 'gc' ? 'Great-circle legs: the course changes along the leg.' : 'Rhumb-line legs: constant true course along each leg.') + ' ' + esc(ui.NAV_DISCLAIMER) + '</p>';
      }
      panel.innerHTML = h;
      bind();
    }

    function bind() {
      var $ = function (s) { return ui.$(s, panel); };
      $('[data-t-name]').addEventListener('input', function (e) { d.name = e.target.value; d.dirty = true; save(); });
      $('[data-t-save]').addEventListener('click', saveTrack);
      $('[data-t-new]').addEventListener('click', function () { confirmDiscard(function () { d = blank(); selIdx = null; save(); draw(); render(); }); });
      $('[data-t-open]').addEventListener('click', openSheet);
      var seg = $('[data-t-type]');
      seg.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b || b.dataset.v === d.type) return; d.type = b.dataset.v; changed(); });
      $('[data-t-speed]').addEventListener('change', function (e) { d.speed = e.target.value.trim(); changed(); });
      $('[data-t-dep]').addEventListener('change', function (e) { d.depart = e.target.value; changed(); });
      $('[data-t-varmode]').addEventListener('change', function (e) { d.varMode = e.target.value; changed(); });
      var vi = $('[data-t-var]'); if (vi) vi.addEventListener('change', function (e) { d.varVal = e.target.value.trim(); changed(); });
      $('[data-t-add]').addEventListener('submit', function (e) {
        e.preventDefault();
        var r = MEIKO.map.parsePair($('[data-t-add-in]').value);
        if (!r) return; if (!r.ok) return ui.toast(r.error);
        add(r.lat, r.lon); ctl.goTo(r.lat, r.lon);
      });
      $('[data-t-gps]').addEventListener('click', function (e) {
        var b = e.currentTarget; b.disabled = true;
        MEIKO.gps.getPosition().then(function (f) { ctl.showFix(f, true); add(f.lat, f.lon, 'GPS'); }, function (err) { ui.toast(err.message); })
          .then(function () { b.disabled = false; });
      });
      ui.$$('[data-wp-name]', panel).forEach(function (inp) {
        inp.addEventListener('input', function () { d.points[+inp.dataset.wpName].name = inp.value; d.dirty = true; save(); });
        inp.addEventListener('change', function () { draw(); });
        inp.addEventListener('focus', function () { if (selIdx !== +inp.dataset.wpName) { selIdx = +inp.dataset.wpName; draw(); ui.$$('.wp', panel).forEach(function (r) { r.classList.toggle('sel', +r.dataset.wp === selIdx); }); } });
      });
      var cp = $('[data-t-copy]'); if (cp) cp.addEventListener('click', function () { ui.copy(textSummary(d, compute(d)), 'Track copied'); });
      var gx = $('[data-t-gpx]'); if (gx) gx.addEventListener('click', function () { download(fileName(d.name), C.track.toGPX({ name: d.name || 'MEIKO track', points: d.points, updated: new Date().toISOString() }), 'application/gpx+xml'); ui.toast('GPX file downloaded'); });
      var ft = $('[data-t-fit]'); if (ft) ft.addEventListener('click', fit);
      var nv = $('[data-t-nav]'); if (nv) nv.addEventListener('click', function () {
        var sp = parseFloat(String(d.speed).replace(',', '.'));
        MEIKO.liveNav.navigate({ name: d.name || 'Track', points: d.points, plannedKn: isFinite(sp) && sp > 0 ? sp : null });
        var lp = document.querySelector('[data-live-panel]'); if (lp && lp.scrollIntoView) lp.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      var rv = $('[data-t-rev]'); if (rv) rv.addEventListener('click', function () { d.points.reverse(); selIdx = null; changed(); });
    }
    function onListClick(e) {
      var b = e.target.closest('button'); if (!b || !panel.contains(b)) return;
      var ds = b.dataset, i;
      if (ds.wpUp != null) { i = +ds.wpUp; swap(i, i - 1); }
      else if (ds.wpDown != null) { i = +ds.wpDown; swap(i, i + 1); }
      else if (ds.wpDel != null) { i = +ds.wpDel; d.points.splice(i, 1); selIdx = null; changed(); }
      else if (ds.wpIns != null) {
        i = +ds.wpIns; var a = d.points[i], c = d.points[i + 1];
        editSheet('Insert after WP' + (i + 1), { lat: (a.lat + c.lat) / 2, lon: a.lon + ((c.lon - a.lon + 540) % 360 - 180) / 2, name: '' }, function (p) { d.points.splice(i + 1, 0, p); selIdx = i + 1; changed(); });
      }
      else if (ds.wpEdit != null) { i = +ds.wpEdit; select(i, true); editSheet('Edit WP' + (i + 1), d.points[i], function (p) { d.points[i] = p; changed(); }); }
    }
    function swap(i, j) { var t = d.points[i]; d.points[i] = d.points[j]; d.points[j] = t; selIdx = j; changed(); }
    function fit() { if (d.points.length) map.fitBounds(L.latLngBounds(d.points.map(function (p) { return [p.lat, p.lon]; })).pad(0.2), { maxZoom: 14 }); }

    function saveTrack() {
      if (!d.points.length) return;
      var name = (d.name || '').trim() || ('Track ' + ui.date(Date.now()).replace(/^\w+ /, ''));
      d.name = name;
      var c = compute(d);
      var t = snapshot(d);
      if (!t.id) t.id = d.id = newId();
      t.updated = new Date().toISOString();
      t.totalNM = c.res ? c.res.totalNM : 0;
      try { put(t); } catch (e) { return ui.toast('Could not save: storage is full.'); }
      d.dirty = false; save(); render();
      ui.toast('Track saved on this device');
    }
    function confirmDiscard(go) {
      if (!d.dirty || !d.points.length) return go();
      ui.sheet({ title: 'Discard unsaved changes?', html: '<p>The track you are editing has changes that are not saved.</p><div class="actions"><button class="btn btn-primary" data-sv>' + icon('i-check') + 'Save first</button><button class="btn btn-danger" data-go>Discard</button><button class="btn btn-ghost" data-close>Cancel</button></div>', onMount: function (body, close) {
        ui.$('[data-sv]', body).addEventListener('click', function () { close(); saveTrack(); go(); });
        ui.$('[data-go]', body).addEventListener('click', function () { close(); go(); });
      } });
    }
    function loadTrack(t) {
      d = blank(); var s = snapshot(t); for (var k in s) if (s[k] != null) d[k] = s[k];
      d.points = s.points; d.dirty = false; selIdx = null; save(); draw(); render(); fit();
    }
    function importGPX(text, fname) {
      var list;
      try { list = C.track.parseGPX(text, { maxPoints: 20000 }); } catch (e) { return ui.toast(e.message); }
      var n = 0;
      list.forEach(function (g) {
        var pts = g.points.length > MAX_WP ? C.track.thin(g.points, MAX_WP) : g.points;
        put({ id: newId(), name: g.name || fname || 'Imported', points: pts.map(function (p) { return { lat: p.lat, lon: p.lon, name: p.name || '' }; }), type: 'rhumb', speed: '', depart: '', varMode: 'auto', varVal: '', updated: new Date().toISOString(),
          totalNM: C.track.legs(pts, {}).totalNM, imported: g.kind });
        n++;
      });
      ui.toast(n === 1 ? 'Imported “' + list[0].name + '”' : 'Imported ' + n + ' tracks');
      return list;
    }

    function openSheet() {
      ui.sheet({
        title: 'My tracks',
        html: '<div class="flex"><label class="btn btn-ghost btn-sm file-btn">' + icon('i-plus') + 'Import GPX<input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" data-imp hidden></label>' +
          '<span class="small muted">Saved on this device only. Export GPX to share or back up.</span></div><div data-tlist class="mt-12"></div>',
        onMount: function (body, close) {
          var listEl = ui.$('[data-tlist]', body);
          function paint() {
            var list = all();
            listEl.innerHTML = !list.length ? '<p class="small muted">No saved tracks yet. Build one on the map and press Save.</p>' :
              '<ul class="list">' + list.map(function (t) {
                return '<li><div class="grow"><b>' + esc(t.name) + '</b><small>' + t.points.length + ' waypoints · ' + esc(distTxt(t.totalNM || 0)) + (t.updated ? ' · ' + esc(ui.date(Date.parse(t.updated))) : '') + (t.imported ? ' · imported' : '') + '</small></div>' +
                  '<button class="btn btn-primary btn-sm" data-ld="' + t.id + '">Open</button>' +
                  '<button class="icon-btn" data-gx="' + t.id + '" aria-label="Export GPX">' + icon('i-route') + '</button>' +
                  '<button class="icon-btn" data-dl="' + t.id + '" aria-label="Delete">' + icon('i-trash') + '</button></li>';
              }).join('') + '</ul>';
          }
          paint();
          listEl.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return;
            var t = byId(b.dataset.ld || b.dataset.gx || b.dataset.dl); if (!t) return;
            if (b.dataset.ld) confirmDiscard(function () { close(); loadTrack(t); });
            if (b.dataset.gx) download(fileName(t.name), C.track.toGPX(t), 'application/gpx+xml');
            if (b.dataset.dl) {
              if (b.dataset.armed) { remove(t.id); if (d.id === t.id) { d.id = null; d.dirty = true; save(); } paint(); render(); ui.toast('Track deleted'); }
              else { b.dataset.armed = '1'; b.classList.add('danger-armed'); b.setAttribute('aria-label', 'Tap again to delete'); ui.toast('Tap the bin again to delete “' + t.name + '”'); }
            }
          });
          ui.$('[data-imp]', body).addEventListener('change', function (e) {
            var f = e.target.files && e.target.files[0]; if (!f) return;
            if (f.size > 15 * 1024 * 1024) return ui.toast('File is too large (max 15 MB).');
            var rd = new FileReader();
            rd.onload = function () { var r = importGPX(String(rd.result), f.name.replace(/\.gpx$/i, '')); if (r) { paint(); render(); } };
            rd.onerror = function () { ui.toast('Could not read the file.'); };
            rd.readAsText(f);
            e.target.value = '';
          });
        }
      });
    }

    return {
      add: add,
      show: function () { active = true; draw(); render(); if (d.points.length) fit(); },
      hide: function () { active = false; if (layer) { layer.remove(); layer = null; } },
      importGPX: importGPX, load: function (id) { var t = byId(id); if (t) loadTrack(t); }
    };
  }

  MEIKO.trackUI = { attach: attach, all: all };
})();
