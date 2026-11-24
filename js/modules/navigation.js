/*
 * MEIKO — Navigation tools UI
 *  distance · ports · rhumb · course · eta · dst · coords
 * All maths lives in js/core (tested). This file only reads inputs, validates and renders.
 */
(function () {
  'use strict';
  var C = window.MeikoCore, ui = MEIKO.ui, reg = MEIKO.features.register;
  var S = function (k) { return MEIKO.settings.get(k); };
  var esc = ui.esc, icon = ui.icon;

  var GC_NOTE = 'Straight-line geographic distance over the Earth\'s surface. It is <b>not</b> a safe navigable sea route — it ignores land, shoals, traffic separation schemes and other restrictions.';

  function actions(primaryLabel, extra) {
    return '<div class="actions"><button class="btn btn-primary" type="submit">' + icon('i-check') + primaryLabel + '</button>' +
      (extra || '') + '<button class="btn btn-ghost" type="button" data-reset>' + icon('i-reset') + 'Reset</button></div>';
  }
  function layout(tool, formHtml, emptyHtml, after) {
    return ui.pageHead(tool) +
      '<div class="tool-grid"><form class="card card-pad form-gap" novalidate>' + formHtml + '</form>' +
      '<div class="results-col" data-out>' + emptyHtml + '</div></div>' + (after || '');
  }
  function distRows(m) {
    var pref = S('distUnit');
    var rows = [
      ['Nautical miles', ui.num(m / 1852, 2) + ' <small>NM</small>'],
      ['Kilometres', ui.num(m / 1000, 2) + ' <small>km</small>'],
      ['Metres', ui.num(m, 0) + ' <small>m</small>']
    ];
    if (pref === 'km') rows = [rows[1], rows[0], rows[2]];
    return rows;
  }
  function primaryDist(m) {
    return S('distUnit') === 'km' ? { v: ui.num(m / 1000, 2), u: 'km', alt: ui.num(m / 1852, 2) + ' NM' }
      : { v: ui.num(m / 1852, 2), u: 'NM', alt: ui.num(m / 1000, 2) + ' km' };
  }

  /** Small SVG compass dial with a course line. */
  function dial(bearing, label) {
    var ticks = '';
    for (var a = 0; a < 360; a += 10) {
      var long = a % 30 === 0, r1 = long ? 40 : 43, rad = (a - 90) * Math.PI / 180;
      ticks += '<line x1="' + (50 + r1 * Math.cos(rad)).toFixed(2) + '" y1="' + (50 + r1 * Math.sin(rad)).toFixed(2) + '" x2="' + (50 + 46 * Math.cos(rad)).toFixed(2) + '" y2="' + (50 + 46 * Math.sin(rad)).toFixed(2) + '" stroke="currentColor" stroke-opacity="' + (long ? .55 : .25) + '" stroke-width="' + (long ? .9 : .6) + '"/>';
    }
    var lbl = [['N', 50, 13.5], ['E', 87, 51.8], ['S', 50, 90], ['W', 13, 51.8]].map(function (l) {
      return '<text x="' + l[1] + '" y="' + l[2] + '" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" fill-opacity="' + (l[0] === 'N' ? 1 : .6) + '">' + l[0] + '</text>';
    }).join('');
    return '<div class="compass-wrap"><div class="compass" style="width:min(64vw,240px)"><svg viewBox="0 0 100 100" role="img" aria-label="' + esc(label || 'Course') + ' ' + ui.bearing(bearing) + '">' +
      '<circle cx="50" cy="50" r="47" fill="var(--surface-2)" stroke="var(--border-strong)"/>' + ticks + lbl +
      '<g transform="rotate(' + bearing.toFixed(2) + ' 50 50)"><line x1="50" y1="50" x2="50" y2="17" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/><path d="M50 11 54.5 20h-9z" fill="var(--accent)"/></g>' +
      '<circle cx="50" cy="50" r="3" fill="var(--primary)"/></svg></div></div>';
  }

  /* ======================= A. Distance ======================= */
  reg({
    id: 'distance', cat: 'calculator', order: 2, icon: 'i-ruler', title: 'Distance Calculator',
    desc: 'Great circle distance and bearings between two positions', keywords: 'great circle haversine bearing nm km',
    lead: 'Great circle distance with initial and final true bearings between two coordinates.',
    render: function (view) {
      view.innerHTML = layout(this,
        ui.coordField('a', 'Start position') + ui.coordField('b', 'Destination') +
        actions('Calculate', '<button class="btn btn-ghost" type="button" data-swap>' + icon('i-swap') + 'Swap</button>'),
        ui.empty('i-ruler', 'No result yet', 'Enter two positions (any format: DD, DDM or DMS) and tap Calculate.'),
        ui.help('Method & limitations',
          '<p>Distance uses the <b>haversine</b> formula on a sphere with the IUGG mean Earth radius (6 371.0088 km). 1 NM = 1 852 m exactly.</p>' +
          '<span class="formula">a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)\nd = 2R · atan2(√a, √(1−a))\nθ = atan2(sin Δλ · cos φ2, cos φ1 · sin φ2 − sin φ1 · cos φ2 · cos Δλ)</span>' +
          '<p>For reference, the ellipsoidal (WGS-84, Vincenty) distance is also shown — it is typically within 0.5 % of the spherical figure.</p>' +
          '<p>Bearings are <b>true</b> (0°–360° clockwise from true north). The initial bearing changes along a great circle; the final bearing is the course on arrival.</p>') +
        ui.disclaimer());
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var a = ui.bindCoord(form, 'a', { onChange: auto }), b = ui.bindCoord(form, 'b', { onChange: auto });
      var store = ui.persist(form, 'distance');
      function calc(silent) {
        var p = a.get(), q = b.get();
        if (!p.ok || !q.ok) { if (!silent) ui.showError(out, (p.ok ? '' : 'Start — ' + p.error + ' ') + (q.ok ? '' : 'Destination — ' + q.error)); return; }
        var r = C.geo.greatCircle(p.lat, p.lon, q.lat, q.lon);
        var pd = primaryDist(r.distanceM);
        var html = ui.resultCard('Great circle', ui.big('Distance', pd.v, pd.u, pd.alt) +
          ui.kv(distRows(r.distanceM).concat([
            ['Initial bearing', r.coincident ? '—' : ui.bearing(r.initialBearing) + ' <small>T · ' + C.geo.compassPoint(r.initialBearing) + '</small>'],
            ['Final bearing', r.coincident ? '—' : ui.bearing(r.finalBearing) + ' <small>T</small>'],
            r.ellipsoidal ? ['Ellipsoidal (WGS-84)', ui.num(r.ellipsoidal.distanceNM, 2) + ' <small>NM</small>'] : null
          ])), { copy: true, icon: 'i-ruler', foot: GC_NOTE });
        var txt = 'MEIKO · Great circle\nFrom ' + ui.coordPair(p.lat, p.lon) + '\nTo ' + ui.coordPair(q.lat, q.lon) +
          '\nDistance: ' + ui.num(r.distanceNM, 2) + ' NM / ' + ui.num(r.distanceKm, 2) + ' km / ' + ui.num(r.distanceM, 0) + ' m' +
          '\nInitial bearing: ' + ui.bearing(r.initialBearing) + ' T\nFinal bearing: ' + ui.bearing(r.finalBearing) + ' T\n(Straight-line distance, not a navigable route)';
        ui.showResult(out, html, txt);
      }
      function auto() { if (!a.isEmpty() && !b.isEmpty()) calc(true); }
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-swap]', form).addEventListener('click', function () {
        var p = a.get(), q = b.get(); if (p.ok && q.ok) { a.set(q.lat, q.lon); b.set(p.lat, p.lon); calc(true); }
      });
      ui.$('[data-reset]', form).addEventListener('click', function () { a.clear(); b.clear(); store.clear(); out.innerHTML = ui.empty('i-ruler', 'No result yet', 'Enter two positions and tap Calculate.'); });
      auto();
    }
  });

  /* ======================= B. Port to port ======================= */
  var SEA = null;
  function placeList() {
    var D = MeikoData.distances, byPort = {}, list = [];
    Object.keys(D.PLACES).forEach(function (k) { var pl = D.PLACES[k]; if (pl.port) byPort[pl.port] = k; });
    MeikoData.ports.all().forEach(function (p) {
      var k = byPort[p.id] || null, pl = k ? D.PLACES[k] : null;
      list.push({ value: p.id, name: p.name, city: p.city, port: p, key: k, note: pl && pl.note,
        hay: [p.name, p.city, p.country].concat(p.aliases || [], pl ? pl.aliases : []).join(' ').toLowerCase() });
    });
    Object.keys(D.PLACES).forEach(function (k) {
      var pl = D.PLACES[k]; if (pl.port && MeikoData.ports.byId(pl.port)) return;
      list.push({ value: 't:' + k, name: pl.name, city: pl.area, port: null, key: k, note: pl.note, hay: [pl.name, pl.area].concat(pl.aliases).join(' ').toLowerCase() });
    });
    return list.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function sea(list) {
    if (SEA) return SEA;
    var byKey = {}; list.forEach(function (p) { if (p.key) byKey[p.key] = p; });
    SEA = C.seadist.create(MeikoData.distances, function (a, b) {
      var A = byKey[a] && byKey[a].port, B = byKey[b] && byKey[b].port;
      return A && B ? C.geo.haversine(A.lat, A.lon, B.lat, B.lon) / 1852 : null;
    });
    SEA.byKey = byKey;
    return SEA;
  }
  reg({
    id: 'ports', cat: 'navigation', order: 3, icon: 'i-anchor', title: 'Port-to-Port',
    desc: 'Estimated sea distance and straight-line distance between ports', keywords: 'harbour harbor pelabuhan jarak distance priok perak belawan makassar ambon sorong',
    lead: 'Choose a departure and destination port to see the estimated sea distance and the straight-line distance with bearings.',
    render: function (view) {
      var all = placeList(), S2 = sea(all);
      function find(v) { for (var i = 0; i < all.length; i++) if (all[i].value === v) return all[i]; return null; }
      function portSelect(name, label) {
        return '<label class="field"><span>' + label + '</span><select name="' + name + '"><option value="">Select a port…</option>' +
          all.map(function (p) { return '<option value="' + esc(p.value) + '">' + esc(p.name) + (p.city && p.city !== '—' ? ' — ' + esc(p.city) : '') + '</option>'; }).join('') + '</select></label>';
      }
      view.innerHTML = layout(this,
        ui.notice('warn', '<b>Estimates only.</b> Sea distances are approximate planning figures and port positions are approximate. Plan passages with official charts.') +
        '<div class="search" style="margin:0">' + icon('i-search') + '<input type="search" placeholder="Search port (name or city)…" data-filter data-no-persist></div>' +
        portSelect('from', 'Departure port') + portSelect('to', 'Destination port') +
        '<div class="port-map-wrap"><div class="map-box port-map" data-pmap></div><small class="hint" data-pmap-hint>Tap a port on the map: first the departure, then the destination.</small></div>' +
        actions('Calculate', '<button class="btn btn-ghost" type="button" data-swap>' + icon('i-swap') + 'Swap</button>'),
        ui.empty('i-anchor', 'Choose two ports', 'Results show the estimated sea distance, straight-line distance and bearings.'),
        ui.help('About these distances',
          '<p><b>Estimated sea distance</b> is a typical sailing distance between the two ports. Where no figure exists for the pair directly, it is built from legs through other ports, so it may be longer than a direct passage.</p>' +
          '<p><b>Straight-line distance</b> is the great circle between approximate harbour positions. Actual voyages follow routes that avoid land, shallows, restricted areas and traffic separation schemes. Plan passages with official charts and sailing directions.</p>') +
        ui.disclaimer());
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var from = ui.$('[name=from]', form), to = ui.$('[name=to]', form), filter = ui.$('[data-filter]', form);
      var store = ui.persist(form, 'ports');
      filter.addEventListener('input', function () {
        var q = filter.value.trim().toLowerCase();
        [from, to].forEach(function (sel) {
          ui.$$('option', sel).forEach(function (o) { if (!o.value) return; var p = find(o.value); o.hidden = !!q && p.hay.indexOf(q) === -1; });
        });
        if (q) [from, to].forEach(function (sel) { var vis = ui.$$('option', sel).filter(function (o) { return o.value && !o.hidden; }); if (vis.length === 1 && !sel.value) { sel.value = vis[0].value; form.dispatchEvent(new Event('change')); } });
      });
      function badge(p) { return p.verified ? '<span class="badge ok">verified</span>' : '<span class="badge warn">unverified</span>'; }
      function nm(v) { return ui.num(v, 0) + ' <small>NM</small>'; }
      function calc(silent) {
        var A = find(from.value), B = find(to.value);
        if (!A || !B) { if (!silent) ui.showError(out, 'Select both a departure and a destination port.'); return; }
        if (A.value === B.value) { if (!silent) ui.showError(out, 'Departure and destination are the same port.'); return; }
        var gc = A.port && B.port ? C.geo.greatCircle(A.port.lat, A.port.lon, B.port.lat, B.port.lon) : null;
        var body = '', copy = 'MEIKO · Port to port\n' + A.name + ' → ' + B.name, warn = [], est = null;
        if (A.key && B.key) {
          est = S2.best(A.key, B.key);
          if (est == null) { var rr = S2.route(A.key, B.key); if (rr) { est = rr.nm; warn.push('Estimated through ' + rr.path.slice(1, -1).map(function (k) { return S2.byKey[k].name; }).join(', ') + '.'); } }
        }
        if (est != null) {
          body += ui.big('Estimated sea distance', ui.num(est, 0), 'NM', ui.num(est * 1.852, 0) + ' km');
          copy += '\nEstimated sea distance: ' + Math.round(est) + ' NM';
        } else if (!A.port || !B.port) {
          body += '<div class="card-pad">' + ui.notice('', 'No distance is available for this pair.', 'i-info') + '</div>';
        }
        if (gc) {
          var pd = primaryDist(gc.distanceM);
          if (est == null) body += ui.big('Straight-line distance', pd.v, pd.u, pd.alt);
          body += ui.kv([
            ['Straight-line distance', ui.num(gc.distanceNM, 1) + ' <small>NM</small> · ' + ui.num(gc.distanceKm, 0) + ' <small>km</small>'],
            ['Initial bearing', ui.bearing(gc.initialBearing) + ' <small>T · ' + C.geo.compassPoint(gc.initialBearing) + '</small>'],
            ['Final bearing', ui.bearing(gc.finalBearing) + ' <small>T</small>'],
            ['From ' + esc(A.name) + ' ' + badge(A.port), '<small>' + esc(ui.coordPair(A.port.lat, A.port.lon)) + '</small>'],
            ['To ' + esc(B.name) + ' ' + badge(B.port), '<small>' + esc(ui.coordPair(B.port.lat, B.port.lon)) + '</small>']
          ]);
          copy += '\nStraight line: ' + ui.num(gc.distanceNM, 1) + ' NM, initial bearing ' + ui.bearing(gc.initialBearing) + ' T (not a navigable route)';
        } else body += '<div class="card-pad">' + ui.notice('', 'No position is stored for ' + esc(!A.port ? A.name : B.name) + ', so the straight-line distance and bearings are not shown.', 'i-info') + '</div>';
        if (warn.length) body += '<div class="card-pad">' + ui.notice('warn', warn.join('<br>'), 'i-alert') + '</div>';
        if (A.key) {
          var nb = S2.neighbours(A.key).map(function (n) { var v = S2.best(A.key, n.key); if (v == null) { var r2 = S2.route(A.key, n.key); v = r2 ? r2.nm : null; } return { key: n.key, nm: v }; }).filter(function (n) { return n.nm != null; }).sort(function (x, y) { return x.nm - y.nm; });
          body += '<details class="help nb-list" style="margin:0 14px 14px"><summary>' + icon('i-anchor') + 'Estimated sea distances from ' + esc(A.name) + ' (' + nb.length + ')</summary><div class="card-pad">' +
            ui.kv(nb.map(function (n) { return [esc(S2.byKey[n.key].name), nm(n.nm)]; })) + '</div></details>';
        }
        ui.showResult(out, ui.resultCard(A.name + ' → ' + B.name, body, { copy: true, icon: 'i-anchor', badge: '<span class="badge info">estimate</span>', foot: 'Estimated sea distance for planning only. ' + GC_NOTE }), copy);
      }
      /* ---- map: every port with a position; tap to choose; departure/destination highlighted ---- */
      var pm = null, pmMarkers = {}, pmLine = null, pmEnds = [];
      function initMap() {
        if (pm || !MEIKO.map || !window.L) return;
        pm = MEIKO.map.create(ui.$('[data-pmap]', form), { markers: false, noRemember: true, center: [-2.5, 118], zoom: 4 });
        if (!pm) return;
        var L = pm.L;
        all.forEach(function (p) {
          if (!p.port) return;
          pmMarkers[p.value] = L.marker([p.port.lat, p.port.lon], { icon: L.divIcon({ className: 'mk pm-dot', iconSize: [14, 14], iconAnchor: [7, 7] }), title: p.name, keyboard: false })
            .bindTooltip(esc(p.name), { direction: 'top', offset: [0, -6] })
            .on('click', function (e) {
              L.DomEvent.stop(e);
              if (!from.value || to.value) { from.value = p.value; to.value = ''; }
              else if (p.value !== from.value) to.value = p.value;
              form.dispatchEvent(new Event('change'));
            }).addTo(pm.map);
        });
        updateMap(true);
      }
      function updateMap(fit) {
        if (!pm) return;
        var L = pm.L, A = find(from.value), B = find(to.value);
        if (pmLine) { pm.map.removeLayer(pmLine); pmLine = null; }
        pmEnds.forEach(function (m) { pm.map.removeLayer(m); }); pmEnds = [];
        var pts = [];
        [[A, 'A', 'pm-a'], [B, 'B', 'pm-b']].forEach(function (x) {
          if (!x[0] || !x[0].port) return;
          var ll = [x[0].port.lat, x[0].port.lon]; pts.push(ll);
          pmEnds.push(L.marker(ll, { icon: L.divIcon({ className: 'mk pm-end ' + x[2], html: x[1], iconSize: [28, 28], iconAnchor: [14, 14] }), zIndexOffset: 1000, keyboard: false, interactive: false })
            .bindTooltip(esc(x[0].name), { permanent: true, direction: 'right', offset: [12, 0], className: 'pm-label' }).addTo(pm.map));
        });
        if (A && B && A.port && B.port) pmLine = L.polyline(MEIKO.map.gcPoints({ lat: A.port.lat, lon: A.port.lon }, { lat: B.port.lat, lon: B.port.lon }), { className: 'pm-line', interactive: false }).addTo(pm.map);
        var hint = ui.$('[data-pmap-hint]', form);
        if (hint) hint.textContent = !from.value ? 'Tap a port on the map: first the departure, then the destination.' : !to.value ? 'Now tap the destination port.' : 'Dashed line: straight line between the ports (not the sea route). Tap a port to start again.';
        if (fit && pts.length === 2) pm.map.fitBounds(pts, { padding: [40, 40], maxZoom: 9 });
        else if (fit && pts.length === 1 && !pm.map.getBounds().contains(pts[0])) pm.map.panTo(pts[0]);
      }
      setTimeout(initMap, 0);
      form.addEventListener('change', function () { calc(true); updateMap(true); });
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-swap]', form).addEventListener('click', function () { var t = from.value; from.value = to.value; to.value = t; form.dispatchEvent(new Event('change')); });
      ui.$('[data-reset]', form).addEventListener('click', function () { from.value = ''; to.value = ''; filter.value = ''; filter.dispatchEvent(new Event('input')); store.clear(); updateMap(false); out.innerHTML = ui.empty('i-anchor', 'Choose two ports', 'Results show the estimated sea distance, straight-line distance and bearings.'); });
      calc(true);
    }
  });

  /* ======================= C. Rhumb line ======================= */
  reg({
    id: 'rhumb', cat: 'calculator', order: 3, icon: 'i-route', title: 'Rhumb Line',
    desc: 'Constant-course distance compared with great circle', keywords: 'loxodrome mercator constant course',
    lead: 'Rhumb line (constant true course) distance and bearing, with the great circle distance for comparison.',
    render: function (view) {
      view.innerHTML = layout(this, ui.coordField('a', 'Start position') + ui.coordField('b', 'Destination') + actions('Calculate'),
        ui.empty('i-route', 'No result yet', 'Enter two positions to compare rhumb line and great circle.'),
        ui.help('Great circle vs rhumb line', '<p><b>Great circle</b>: the shortest path between two points on the globe. The course changes continuously along the way (except along a meridian or the equator).</p>' +
          '<p><b>Rhumb line</b> (loxodrome): a path that crosses every meridian at the same angle, so you can steer one constant course. It appears as a straight line on a Mercator chart but is longer than the great circle — the difference grows with distance and latitude, and is small for short coastal passages.</p>' +
          '<span class="formula">Δψ = ln( tan(π/4 + φ2/2) / tan(π/4 + φ1/2) )\nq = Δφ / Δψ   (or cos φ on an E–W course)\nd = √(Δφ² + q²·Δλ²) · R      θ = atan2(Δλ, Δψ)</span>', true) + ui.disclaimer());
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var a = ui.bindCoord(form, 'a', { onChange: auto }), b = ui.bindCoord(form, 'b', { onChange: auto });
      var store = ui.persist(form, 'rhumb');
      function calc(silent) {
        var p = a.get(), q = b.get();
        if (!p.ok || !q.ok) { if (!silent) ui.showError(out, (p.ok ? '' : 'Start ' + p.error + ' ') + (q.ok ? '' : 'Destination ' + q.error)); return; }
        var rl = C.geo.rhumb(p.lat, p.lon, q.lat, q.lon), gc = C.geo.greatCircle(p.lat, p.lon, q.lat, q.lon);
        var diff = rl.distanceM - gc.distanceM, pct = gc.distanceM > 0 ? diff / gc.distanceM * 100 : 0;
        var pd = primaryDist(rl.distanceM);
        var html = ui.resultCard('Rhumb line', ui.big('Rhumb line course', gc.coincident ? '—' : ui.bearing(rl.bearing), gc.coincident ? '' : 'T', gc.coincident ? '' : C.geo.compassPoint(rl.bearing) + ' · constant course') +
          ui.kv([
            ['Rhumb line distance', ui.num(rl.distanceM / 1852, 2) + ' <small>NM</small>'],
            ['Rhumb line distance', ui.num(rl.distanceM / 1000, 2) + ' <small>km</small>'],
            ['Great circle distance', ui.num(gc.distanceNM, 2) + ' <small>NM</small>'],
            ['Great circle initial bearing', gc.coincident ? '—' : ui.bearing(gc.initialBearing) + ' <small>T</small>'],
            ['Extra distance on rhumb line', ui.num(diff / 1852, 2) + ' <small>NM (' + ui.num(pct, 2) + ' %)</small>']
          ]), { copy: true, icon: 'i-route', foot: 'Spherical Earth model. ' + GC_NOTE });
        ui.showResult(out, html, 'MEIKO · Rhumb line\nCourse: ' + ui.bearing(rl.bearing) + ' T\nRhumb distance: ' + ui.num(rl.distanceM / 1852, 2) + ' NM\nGreat circle: ' + ui.num(gc.distanceNM, 2) + ' NM\nDifference: ' + ui.num(diff / 1852, 2) + ' NM');
        void pd;
      }
      function auto() { if (!a.isEmpty() && !b.isEmpty()) calc(true); }
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-reset]', form).addEventListener('click', function () { a.clear(); b.clear(); store.clear(); out.innerHTML = ui.empty('i-route', 'No result yet', 'Enter two positions.'); });
      auto();
    }
  });

  /* ======================= D. Course & bearing ======================= */
  reg({
    id: 'course', cat: 'navigation', order: 2, icon: 'i-course', title: 'Course & Bearing',
    desc: 'True course, final bearing and reciprocal', keywords: 'heading direction azimuth reciprocal',
    lead: 'Course to steer (true, 000°–360°) from one position to another.',
    render: function (view) {
      view.innerHTML = layout(this, ui.coordField('a', 'From') + ui.coordField('b', 'To') +
        '<div class="port-map-wrap"><div class="map-box port-map" data-cmap></div><small class="hint" data-cmap-hint>Tap the map to set the departure (A), then the destination (B).</small></div>' + actions('Calculate'),
        ui.empty('i-course', 'No course yet', 'Enter both positions to see the course.'),
        ui.help('Conventions', '<p>All directions are <b>true</b> bearings measured clockwise from true north, 000° to 360°. To steer by a magnetic compass apply variation and deviation from your chart and deviation card.</p>' +
          '<p><b>Great circle course</b> is the initial course; it changes along the track. <b>Rhumb line course</b> stays constant. <b>Reciprocal</b> = course ± 180°.</p>') + ui.disclaimer());
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var a = ui.bindCoord(form, 'a', { onChange: auto }), b = ui.bindCoord(form, 'b', { onChange: auto });
      var store = ui.persist(form, 'course');
      function calc(silent) {
        var p = a.get(), q = b.get();
        if (!p.ok || !q.ok) { if (!silent) ui.showError(out, (p.ok ? '' : 'From ' + p.error + ' ') + (q.ok ? '' : 'To ' + q.error)); return; }
        var gc = C.geo.greatCircle(p.lat, p.lon, q.lat, q.lon);
        if (gc.coincident) { ui.showError(out, 'Both positions are the same — there is no course.'); return; }
        var rl = C.geo.rhumb(p.lat, p.lon, q.lat, q.lon);
        var html = ui.resultCard('Course', dial(gc.initialBearing, 'Initial course') +
          ui.big('Course (great circle, initial)', ui.bearing(gc.initialBearing), 'T', C.geo.compassPoint(gc.initialBearing)) +
          ui.kv([
            ['Final bearing', ui.bearing(gc.finalBearing) + ' <small>T</small>'],
            ['Rhumb line course', ui.bearing(rl.bearing) + ' <small>T</small>'],
            ['Reciprocal of initial course', ui.bearing(gc.initialBearing + 180) + ' <small>T</small>'],
            ['Distance (great circle)', ui.num(gc.distanceNM, 2) + ' <small>NM · ' + ui.num(gc.distanceKm, 2) + ' km</small>']
          ]), { copy: true, icon: 'i-course' });
        ui.showResult(out, html, 'MEIKO · Course\nInitial course: ' + ui.bearing(gc.initialBearing) + ' T\nFinal bearing: ' + ui.bearing(gc.finalBearing) + ' T\nRhumb line course: ' + ui.bearing(rl.bearing) + ' T\nDistance: ' + ui.num(gc.distanceNM, 2) + ' NM');
      }
      /* ---- map: A/B, great circle (solid), rhumb line (dashed), direction arrows; tap to set A then B ---- */
      var cm = null, cmLayers = [];
      function pos(f) { if (f.isEmpty()) return null; var v = f.get(); return v.ok ? v : null; }
      function initMap() {
        if (cm || !MEIKO.map || !window.L) return;
        cm = MEIKO.map.create(ui.$('[data-cmap]', form), { markers: false, noRemember: true, center: [-2.5, 118], zoom: 4,
          onMapClick: function (lat, lon) {
            var P = pos(a), Q = pos(b);
            if (!P || Q) { a.set(+lat.toFixed(5), +lon.toFixed(5)); b.clear(); }
            else b.set(+lat.toFixed(5), +lon.toFixed(5));
            auto(); updateMap(true); return false;
          } });
        if (!cm) return;
        updateMap(true);
      }
      function arrow(L, ll, deg) {
        return L.marker(ll, { icon: L.divIcon({ className: 'cm-arrow', html: '<svg viewBox="0 0 20 20" style="transform:rotate(' + deg.toFixed(1) + 'deg)"><path d="M10 2 L17 17 L10 13 L3 17 Z"/></svg>', iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false, keyboard: false, zIndexOffset: 500 });
      }
      function screenDeg(p1, p2) { var m = cm.map, x = m.latLngToLayerPoint(p1), y = m.latLngToLayerPoint(p2); return Math.atan2(y.x - x.x, -(y.y - x.y)) * 180 / Math.PI; }
      function updateMap(fit) {
        if (!cm) return;
        var L = cm.L, P = pos(a), Q = pos(b), pts = [];
        cmLayers.forEach(function (l) { cm.map.removeLayer(l); }); cmLayers = [];
        var gc = P && Q ? C.geo.greatCircle(P.lat, P.lon, Q.lat, Q.lon) : null;
        if (gc && !gc.coincident) {
          var line = MEIKO.map.gcPoints({ lat: P.lat, lon: P.lon }, { lat: Q.lat, lon: Q.lon });
          cmLayers.push(L.polyline([[P.lat, P.lon], [Q.lat, Q.lon]], { className: 'cm-rhumb', interactive: false }).addTo(cm.map));
          cmLayers.push(L.polyline(line, { className: 'cm-gc', interactive: false }).addTo(cm.map));
          var n = line.length, i1 = Math.max(1, Math.round(n * 0.3)), i2 = Math.min(n - 2, Math.round(n * 0.7));
          if (n > 3) [i1, i2].forEach(function (i) { cmLayers.push(arrow(L, line[i], screenDeg(line[i - 1], line[i + 1])).addTo(cm.map)); });
        }
        function dir(k) { if (!P || !Q) return 'right'; var north = Q.lat >= P.lat; return (k === 'B') === north ? 'top' : 'bottom'; }
        [[P, 'A', 'pm-a', gc && !gc.coincident ? ' · ' + ui.bearing(gc.initialBearing) + ' T' : ''], [Q, 'B', 'pm-b', gc && !gc.coincident ? ' · final ' + ui.bearing(gc.finalBearing) + ' T' : '']].forEach(function (x) {
          if (!x[0]) return;
          var ll = [x[0].lat, x[0].lon]; pts.push(ll);
          cmLayers.push(L.marker(ll, { icon: L.divIcon({ className: 'mk pm-end ' + x[2], html: x[1], iconSize: [28, 28], iconAnchor: [14, 14] }), zIndexOffset: 1000, keyboard: false, interactive: false })
            .bindTooltip(x[1] + x[3], { permanent: true, direction: dir(x[1]), offset: { top: [0, -14], bottom: [0, 14], right: [12, 0] }[dir(x[1])], className: 'pm-label' }).addTo(cm.map));
        });
        var hint = ui.$('[data-cmap-hint]', form);
        if (hint) hint.textContent = !P ? 'Tap the map to set the departure (A), then the destination (B).' : !Q ? 'Now tap the destination (B).' : 'Solid line: great circle (shortest). Dashed: rhumb line (constant course). Arrows show the direction. Tap again to start over.';
        if (fit) cm.map.invalidateSize();
        if (fit && pts.length === 2 && !(gc && gc.coincident)) cm.map.fitBounds(L.latLngBounds(pts).extend(L.latLngBounds(gc ? MEIKO.map.gcPoints({ lat: P.lat, lon: P.lon }, { lat: Q.lat, lon: Q.lon }) : pts)), { padding: [40, 40], maxZoom: 10 });
        else if (fit && pts.length === 1 && !cm.map.getBounds().contains(pts[0])) cm.map.panTo(pts[0]);
      }
      var mapT = null;
      function auto() { if (!a.isEmpty() && !b.isEmpty()) calc(true); clearTimeout(mapT); mapT = setTimeout(function () { updateMap(true); }, 400); }
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); updateMap(true); });
      ui.$('[data-reset]', form).addEventListener('click', function () { a.clear(); b.clear(); store.clear(); updateMap(false); out.innerHTML = ui.empty('i-course', 'No course yet', 'Enter both positions.'); });
      setTimeout(initMap, 0);
      auto();
    }
  });

  /* ======================= E. ETA ======================= */
  reg({
    id: 'eta', cat: 'calculator', order: 4, icon: 'i-clock', title: 'ETA Calculator',
    desc: 'Estimated time of arrival from distance and speed', keywords: 'arrival time passage voyage',
    lead: 'Time = Distance ÷ Speed. Enter departure, distance and speed to get the estimated arrival.',
    render: function (view) {
      var tz = S('tz');
      view.innerHTML = layout(this,
        '<div class="row"><label class="field"><span>Departure date & time</span><input type="datetime-local" name="dep"></label>' +
        '<label class="field"><span>Departure time zone</span><select name="tz">' + ui.tzOptions(tz) + '</select></label></div>' +
        '<div><button type="button" class="chip" data-now>' + icon('i-clock') + 'Now</button></div>' +
        '<div class="row unit"><label class="field"><span>Distance</span><input name="dist" inputmode="decimal" placeholder="e.g. 525"><small class="hint"></small></label>' +
        '<label class="field"><span>Unit</span><select name="du">' + ui.options({ nm: 'NM', km: 'km' }, S('distUnit')) + '</select></label></div>' +
        '<div class="row unit"><label class="field"><span>Speed</span><input name="spd" inputmode="decimal" placeholder="e.g. 14"><small class="hint"></small></label>' +
        '<label class="field"><span>Unit</span><select name="su">' + ui.options(ui.SPEED_UNITS, S('speedUnit')) + '</select></label></div>' +
        '<label class="field"><span>Show arrival in time zone</span><select name="atz">' + ui.tzOptions(tz) + '</select></label>' +
        actions('Calculate ETA'),
        ui.empty('i-clock', 'No ETA yet', 'Enter distance and speed. Departure defaults to now.'),
        ui.help('Method', '<span class="formula">Time (h) = Distance (NM) ÷ Speed (kn)\nETA = Departure + Time</span><p>Assumes a constant speed over ground. Currents, weather, speed changes and stops are not included — add a margin for planning.</p>') + ui.disclaimer());
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var dep = ui.$('[name=dep]', form);
      var store = ui.persist(form, 'eta');
      if (!dep.value) dep.value = ui.nowLocalISO(+ui.$('[name=tz]', form).value);
      ui.$('[data-now]', form).addEventListener('click', function () { dep.value = ui.nowLocalISO(+ui.$('[name=tz]', form).value); form.dispatchEvent(new Event('change')); });
      function field(name) { return ui.$('[name=' + name + ']', form); }
      function calc(silent) {
        var dTz = +field('tz').value, aTz = +field('atz').value;
        var depMs = ui.parseLocalDateTime(dep.value, dTz);
        var d = ui.readNum(field('dist')), s = ui.readNum(field('spd'));
        try {
          if (depMs == null) throw new Error('Enter a valid departure date and time.');
          if (!d.ok) throw new Error('Enter the distance.');
          if (!s.ok) throw new Error('Enter the speed.');
          if (d.value < 0) throw new Error('Distance cannot be negative.');
          if (s.value <= 0) throw new Error('Speed must be greater than zero — a vessel that is not moving has no ETA.');
          var nm = C.units.distance.toNM(d.value, field('du').value), kn = C.units.speed.toKn(s.value, field('su').value);
          var r = C.navcalc.eta(depMs, nm, kn);
        } catch (e) { if (!silent) ui.showError(out, e.message); return; }
        var html = ui.resultCard('Estimated time of arrival',
          ui.big('ETA', ui.time(r.arrivalUtcMs, aTz), ui.tzLabel(aTz), ui.date(r.arrivalUtcMs, aTz, true)) +
          ui.kv([
            ['Travel time', C.navcalc.formatDuration(r.hours)],
            ['Travel time (decimal)', ui.num(r.hours, 2) + ' <small>h</small>'],
            ['Departure', ui.date(depMs, dTz) + ' ' + ui.time(depMs, dTz) + ' <small>' + ui.tzLabel(dTz) + '</small>'],
            ['Arrival (UTC)', ui.date(r.arrivalUtcMs, 0) + ' ' + ui.time(r.arrivalUtcMs, 0, { format: '24' }) + ' <small>UTC</small>'],
            ['Distance · speed', ui.num(nm, 2) + ' NM · ' + ui.num(kn, 2) + ' kn']
          ]), { copy: true, icon: 'i-clock', foot: 'Assumes constant speed. Not adjusted for current, weather or stops.' });
        ui.showResult(out, html, 'MEIKO · ETA\nDeparture: ' + ui.date(depMs, dTz) + ' ' + ui.time(depMs, dTz) + ' ' + ui.tzLabel(dTz) +
          '\nDistance: ' + ui.num(nm, 2) + ' NM at ' + ui.num(kn, 2) + ' kn\nTravel time: ' + C.navcalc.formatDuration(r.hours) +
          '\nETA: ' + ui.date(r.arrivalUtcMs, aTz) + ' ' + ui.time(r.arrivalUtcMs, aTz) + ' ' + ui.tzLabel(aTz));
      }
      form.addEventListener('input', function () { calc(true); });
      form.addEventListener('change', function () { calc(true); });
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-reset]', form).addEventListener('click', function () { store.clear(); MEIKO.app.rerender(); });
      calc(true);
    }
  });

  /* ======================= F. Speed / distance / time ======================= */
  reg({
    id: 'dst', cat: 'calculator', order: 5, icon: 'i-gauge', title: 'Speed · Distance · Time',
    desc: 'Solve D = S × T for any one value', keywords: 'speed distance time knots formula navigation calculator',
    lead: 'Solve for distance, speed or time. Maritime units by default.',
    render: function (view) {
      view.innerHTML = layout(this,
        '<div class="seg" role="tablist"><button type="button" data-mode="distance" class="on">Distance</button><button type="button" data-mode="speed">Speed</button><button type="button" data-mode="time">Time</button></div>' +
        '<div class="formula" data-formula style="margin:0"></div>' +
        '<div data-fields class="form-gap"></div>' + actions('Calculate'),
        ui.empty('i-gauge', 'Choose what to solve for', 'Fill in the two known values.'),
        ui.help('Formulas', '<span class="formula">Distance = Speed × Time\nSpeed    = Distance ÷ Time\nTime     = Distance ÷ Speed</span><p>1 knot = 1 nautical mile per hour, so with NM, knots and hours no conversion factor is needed. Other units are converted exactly (1 NM = 1 852 m).</p>'));
      var form = ui.$('form', view), out = ui.$('[data-out]', view), fields = ui.$('[data-fields]', form);
      var mode = MEIKO.storage.get('dst:mode', 'distance');
      var DU = { nm: 'NM', km: 'km', m: 'm' };
      var TU = { h: 'hours', min: 'minutes', s: 'seconds', d: 'days' };
      var DEF = { dist: S('distUnit'), spd: S('speedUnit'), time: 'h' };
      var row = function (name, label, unitMap, unitSel) {
        return '<div class="row unit"><label class="field"><span>' + label + '</span><input name="' + name + '" inputmode="decimal"></label>' +
          '<label class="field"><span>Unit</span><select name="' + name + 'U">' + ui.options(unitMap, unitSel) + '</select></label></div>';
      };
      var outRow = function (unitMap, sel) { return '<label class="field"><span>Show result in</span><select name="outU">' + ui.options(unitMap, sel) + '</select></label>'; };
      function build() {
        ui.$$('[data-mode]', form).forEach(function (b) { b.classList.toggle('on', b.dataset.mode === mode); });
        var f = ui.$('[data-formula]', form);
        if (mode === 'distance') { f.textContent = 'Distance = Speed × Time'; fields.innerHTML = row('spd', 'Speed', ui.SPEED_UNITS, DEF.spd) + row('time', 'Time', TU, DEF.time) + outRow(DU, DEF.dist); }
        if (mode === 'speed') { f.textContent = 'Speed = Distance ÷ Time'; fields.innerHTML = row('dist', 'Distance', DU, DEF.dist) + row('time', 'Time', TU, DEF.time) + outRow(ui.SPEED_UNITS, DEF.spd); }
        if (mode === 'time') { f.textContent = 'Time = Distance ÷ Speed'; fields.innerHTML = row('dist', 'Distance', DU, DEF.dist) + row('spd', 'Speed', ui.SPEED_UNITS, DEF.spd) + outRow(TU, 'h'); }
        out.innerHTML = ui.empty('i-gauge', 'Enter the two known values', 'The result updates as you type.');
      }
      function v(name) { var el = ui.$('[name=' + name + ']', form); return el ? ui.readNum(el) : { ok: false }; }
      function u(name) { return ui.$('[name=' + name + ']', form).value; }
      function calc(silent) {
        var res, unitLabel, text;
        try {
          if (mode === 'distance') {
            var s = v('spd'), t = v('time'); if (!s.ok || !t.ok) throw new Error('Enter both speed and time.');
            res = C.navcalc.distance(s.value, u('spdU'), t.value, u('timeU'), u('outU')); unitLabel = DU[u('outU')];
          } else if (mode === 'speed') {
            var d = v('dist'), t2 = v('time'); if (!d.ok || !t2.ok) throw new Error('Enter both distance and time.');
            res = C.navcalc.speed(d.value, u('distU'), t2.value, u('timeU'), u('outU')); unitLabel = ui.SPEED_UNITS[u('outU')];
          } else {
            var d2 = v('dist'), s2 = v('spd'); if (!d2.ok || !s2.ok) throw new Error('Enter both distance and speed.');
            res = C.navcalc.time(d2.value, u('distU'), s2.value, u('spdU'), u('outU')); unitLabel = TU[u('outU')];
          }
        } catch (e) { if (!silent) ui.showError(out, e.message); else if (!/Enter/.test(e.message)) ui.showError(out, e.message); return; }
        var extra = mode === 'time' ? C.navcalc.formatDuration(C.navcalc.toHours(res, u('outU'))) : '';
        text = mode.charAt(0).toUpperCase() + mode.slice(1) + ' = ' + ui.num(res, 4, { trim: true }) + ' ' + unitLabel;
        ui.showResult(out, ui.resultCard('Result', ui.big(mode.charAt(0).toUpperCase() + mode.slice(1), ui.num(res, 4, { trim: true }), unitLabel, extra), { copy: true, icon: 'i-gauge' }), 'MEIKO · ' + text);
      }
      ui.$$('[data-mode]', form).forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.mode; MEIKO.storage.set('dst:mode', mode); build(); }); });
      form.addEventListener('input', function () { calc(true); }); form.addEventListener('change', function () { calc(true); });
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-reset]', form).addEventListener('click', build);
      build();
    }
  });

  /* ======================= G. Coordinate converter ======================= */
  reg({
    id: 'coords', cat: 'calculator', order: 6, icon: 'i-grid', title: 'Coordinate Converter',
    desc: 'Convert between DD, DDM and DMS', keywords: 'latitude longitude format degrees minutes seconds dms ddm lintang bujur',
    lead: 'Type a latitude and longitude in any format — decimal degrees, degrees & decimal minutes, or degrees minutes seconds.',
    render: function (view) {
      view.innerHTML = layout(this, ui.coordField('p', 'Position') +
        '<p class="small muted">Accepted: <span class="mono">-6.10417</span> · <span class="mono">06 06.25 S</span> · <span class="mono">6°06\'15"S</span> · <span class="mono">6,1 LS</span> / <span class="mono">106 BT</span> (Indonesian LU/LS/BT/BB).</p>' + actions('Convert'),
        ui.empty('i-grid', 'Nothing to convert yet', 'Enter a latitude and/or longitude.'));
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var p = ui.bindCoord(form, 'p', { onChange: function () { calc(true); } });
      var store = ui.persist(form, 'coords');
      function line(label, value) { return '<li><div class="grow"><small>' + label + '</small><b class="mono">' + esc(value) + '</b></div><button type="button" class="icon-btn" data-c="' + esc(value) + '" aria-label="Copy ' + label + '">' + icon('i-copy') + '</button></li>'; }
      function calc(silent) {
        var latIn = ui.$('[name=p-lat]', form).value.trim(), lonIn = ui.$('[name=p-lon]', form).value.trim();
        var lat = latIn ? C.coords.parse(latIn, 'lat') : null, lon = lonIn ? C.coords.parse(lonIn, 'lon') : null;
        if ((!lat && !lon) || (lat && !lat.ok) || (lon && !lon.ok)) {
          if (!silent) ui.showError(out, (lat && !lat.ok ? 'Latitude: ' + lat.error : lon && !lon.ok ? 'Longitude: ' + lon.error : 'Enter a latitude or longitude.'));
          return;
        }
        var html = '<ul class="list" style="padding:4px 18px 8px">';
        if (lat) html += line('Latitude · DD', C.coords.formatDD(lat.value, 'lat')) + line('Latitude · DDM', C.coords.formatDDM(lat.value, 'lat')) + line('Latitude · DMS', C.coords.formatDMS(lat.value, 'lat'));
        if (lon) html += line('Longitude · DD', C.coords.formatDD(lon.value, 'lon')) + line('Longitude · DDM', C.coords.formatDDM(lon.value, 'lon')) + line('Longitude · DMS', C.coords.formatDMS(lon.value, 'lon'));
        if (lat && lon) {
          html += line('Pair · DD', C.coords.formatPair(lat.value, lon.value, 'DD')) + line('Pair · DDM', C.coords.formatPair(lat.value, lon.value, 'DDM')) + line('Pair · DMS', C.coords.formatPair(lat.value, lon.value, 'DMS'));
        }
        html += '</ul>';
        var txt = [lat ? C.coords.formatDD(lat.value, 'lat') + ' | ' + C.coords.formatDDM(lat.value, 'lat') + ' | ' + C.coords.formatDMS(lat.value, 'lat') : '', lon ? C.coords.formatDD(lon.value, 'lon') + ' | ' + C.coords.formatDDM(lon.value, 'lon') + ' | ' + C.coords.formatDMS(lon.value, 'lon') : ''].filter(Boolean).join('\n');
        ui.showResult(out, ui.resultCard('Converted', html, { copy: true, icon: 'i-grid', foot: 'Signed decimal degrees: north and east positive, south and west negative.' }), txt);
        ui.$$('[data-c]', out).forEach(function (b) { b.addEventListener('click', function () { ui.copy(b.dataset.c); }); });
      }
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-reset]', form).addEventListener('click', function () { p.clear(); store.clear(); out.innerHTML = ui.empty('i-grid', 'Nothing to convert yet', 'Enter a latitude and/or longitude.'); });
      calc(true);
    }
  });

  MEIKO.navUI = { dial: dial };
})();
