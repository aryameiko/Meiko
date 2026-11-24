/*
 * MEIKO — live navigation panel on the map.
 *
 * While "Live" is on, MEIKO watches the GPS (phone or external receiver), smooths COG/SOG and shows
 * them with the position. When a track is being followed it shows the next waypoint, BRG, DTW, XTE,
 * VMG and the ETA to the next and the final waypoint (from live SOG, or the planned speed when the
 * vessel is slow or stopped), and advances to the next waypoint on arrival.
 *
 * State: 'nav:active' = { name, points, idx, plannedKn, arrivalNM } (survives reloads, works offline).
 * The calculations are in js/core/livenav.js.
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, icon = ui.icon, esc = ui.esc, C = window.MeikoCore;
  var S = function (k) { return MEIKO.settings.get(k); };
  var NAV = 'nav:active';
  var current = null;            // controller of the map page that is open
  var sessionLive = false;       // Live was on during this visit: resume when the map page reopens

  function getNav() { var n = MEIKO.storage.get(NAV, null); return n && Array.isArray(n.points) && n.points.length ? n : null; }
  function setNav(n) { if (n) MEIKO.storage.set(NAV, n); else MEIKO.storage.remove(NAV); }

  function pad3(v) { if (v == null || !isFinite(v)) return '—'; var s = (Math.round(v) % 360).toString(); while (s.length < 3) s = '0' + s; return s + '°'; }
  function kn(v) { return v == null || !isFinite(v) ? '—' : ui.num(v, v < 10 ? 1 : 1); }
  function dist(nm) {
    if (nm == null || !isFinite(nm)) return '—';
    if (S('distUnit') === 'km') { var k = nm * 1.852; return ui.num(k, k < 10 ? 2 : 1) + ' km'; }
    return ui.num(nm, nm < 10 ? 2 : 1) + ' NM';
  }
  function xteTxt(m) {
    if (m == null) return '—';
    var a = Math.abs(m);
    var t = a < 1852 * 0.1 ? Math.round(a) + ' m' : dist(a / 1852);
    return t + (a < 1 ? '' : m > 0 ? ' R' : ' L');
  }
  function dur(h) { if (h == null || !isFinite(h)) return ''; var m = Math.round(h * 60), d = Math.floor(m / 1440); m -= d * 1440; return (d ? d + 'd ' : '') + Math.floor(m / 60) + 'h ' + ('0' + (m % 60)).slice(-2) + 'm'; }
  function eta(ms, h) {
    if (ms == null) return { t: '—', s: '' };
    var sameDay = ui.date(ms) === ui.date(Date.now());
    return { t: ui.time(ms), s: (sameDay ? '' : ui.date(ms).replace(/ \d{4}$/, '') + ' · ') + 'in ' + dur(h) };
  }
  function cell(label, value, sub, cls) {
    return '<div class="ln-cell' + (cls ? ' ' + cls : '') + '"><small>' + label + '</small><b>' + value + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>';
  }

  function attach(ctl, el, opts) {
    opts = opts || {};
    var L = ctl.L, map = ctl.map;
    var sm = C.livenav.smoother({ tau: 5 });
    var live = false, follow = true, lastFix = null, st = null, err = null, layer = null, wake = null, lastArrive = 0;

    function requestWake() {
      try { if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(function (w) { wake = w; }, function () {}); } catch (e) {}
    }
    function releaseWake() { try { if (wake) wake.release(); } catch (e) {} wake = null; }
    function onVis() { if (live && document.visibilityState === 'visible' && !wake) requestWake(); }
    document.addEventListener('visibilitychange', onVis);

    function start() {
      err = null; live = true; sessionLive = true; follow = true; sm.reset();
      MEIKO.gps.watch(onFix, function (e) {
        err = e.message;
        // Signal loss / timeout: keep watching (the browser keeps trying). Permission or setup problems: stop.
        if (e.code !== 2 && e.code !== 3) { live = false; sessionLive = false; MEIKO.gps.stop(); releaseWake(); }
        render();
      });
      requestWake(); render();
    }
    function stop() { live = false; sessionLive = false; MEIKO.gps.stop(); releaseWake(); render(); draw(); }

    function onFix(f) {
      if (!live) return;
      lastFix = f; st = sm.push(f); err = null;
      ctl.showFix({ lat: f.lat, lon: f.lon, accuracy: f.accuracy, sourceLabel: f.sourceLabel, source: f.source, heading: st.cog, speed: st.cog != null ? st.sogMs : 0 }, false);
      if (follow) map.panTo([f.lat, f.lon], { animate: true });
      var n = getNav();
      if (n && n.auto) { n.idx = C.livenav.startIndex(n.points, f); delete n.auto; setNav(n); }
      if (n) {
        var r = calc(n);
        if (r && r.arrived && Date.now() - lastArrive > 3000) {
          lastArrive = Date.now();
          if (r.isLast) { if (!n.done) { n.done = true; setNav(n); ui.toast('Arrived at destination: ' + wpName(n, n.idx)); buzz(); } }
          else { n.idx++; setNav(n); ui.toast('Waypoint ' + wpName(n, n.idx - 1) + ' reached. Next: ' + wpName(n, n.idx)); buzz(); }
        }
      }
      render(); draw();
    }
    function buzz() { try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {} }
    function wpName(n, i) { var p = n.points[i]; return 'WP' + (i + 1) + (p && p.name ? ' ' + p.name : ''); }
    function calc(n) {
      if (!lastFix) return null;
      return C.livenav.follow(n.points, n.idx, { lat: lastFix.lat, lon: lastFix.lon, sogKn: st && st.sogKn, cog: st && st.cog }, { plannedKn: n.plannedKn, arrivalNM: n.arrivalNM || 0.05 });
    }

    function draw() {
      if (layer) { layer.remove(); layer = null; }
      var n = getNav(); if (!n) return;
      layer = L.layerGroup().addTo(map);
      var pts = n.points;
      if (pts.length > 1) L.polyline(pts.map(function (p) { return [p.lat, p.lon]; }), { className: 'nav-track', weight: 2, interactive: false }).addTo(layer);
      if (n.idx > 0) L.polyline([[pts[n.idx - 1].lat, pts[n.idx - 1].lon], [pts[n.idx].lat, pts[n.idx].lon]], { className: 'nav-leg', weight: 4, interactive: false }).addTo(layer);
      pts.forEach(function (p, i) {
        L.marker([p.lat, p.lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'mk mk-nwp' + (i === n.idx ? ' act' : i < n.idx ? ' done' : ''), html: String(i + 1), iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(layer);
      });
      if (lastFix && live) L.polyline([[lastFix.lat, lastFix.lon], [pts[n.idx].lat, pts[n.idx].lon]], { className: 'nav-goto', weight: 2, interactive: false }).addTo(layer);
    }

    function render() {
      var n = getNav(), h = '';
      h += '<div class="ln-head"><span class="ln-dot' + (live ? ' on' : '') + '"></span><b>Live navigation</b>' +
        (live && lastFix ? '<span class="small muted">' + esc(lastFix.sourceLabel || 'GPS') + (lastFix.accuracy != null ? ' · ±' + Math.round(lastFix.accuracy) + ' m' : '') + '</span>' : '') +
        '<span class="spacer"></span>' +
        (live ? '<button class="btn btn-ghost btn-sm" data-ln-center' + (follow ? ' hidden' : '') + '>' + icon('i-gps') + 'Centre</button><button class="btn btn-danger btn-sm" data-ln-stop>' + icon('i-x') + 'Stop GPS</button>'
              : '<button class="btn btn-primary btn-sm" data-ln-start>' + icon('i-gps') + 'Start GPS</button>') + '</div>';
      if (err) h += ui.notice(live ? 'warn' : 'err', (live ? '<b>GPS signal lost — still trying.</b> ' + (lastFix ? 'Values below are from the last fix.' : '') : esc(err)));
      if (live && !lastFix) h += '<p class="small muted">Waiting for the first GPS fix…</p>';
      if (lastFix && live) {
        h += '<div class="ln-grid">' +
          cell('COG', st && st.cog != null ? pad3(st.cog) : '—', st && st.cog == null ? 'stopped / slow' : 'true', 'big') +
          cell('SOG', kn(st && st.sogKn) + '<i>kn</i>', '', 'big') +
          cell('Position', '<span class="mono">' + esc(ui.coord(lastFix.lat, 'lat')) + '<br>' + esc(ui.coord(lastFix.lon, 'lon')) + '</span>', '', 'pos') +
          '</div>';
      }
      if (n) {
        var r = calc(n), wp = n.points[n.idx];
        h += '<div class="ln-track"><div class="ln-to">' + icon('i-route') + '<span><small>' + esc(n.name || 'Track') + ' · ' + (n.idx + 1) + ' of ' + n.points.length + '</small><b>To ' + esc(wpName(n, n.idx)) + '</b></span><span class="spacer"></span>' +
          '<button class="icon-btn" data-ln-prev aria-label="Previous waypoint"' + (n.idx === 0 ? ' disabled' : '') + '>' + icon('i-back') + '</button>' +
          '<button class="icon-btn" data-ln-next aria-label="Next waypoint"' + (n.idx >= n.points.length - 1 ? ' disabled' : '') + '>' + icon('i-chev') + '</button></div>';
        if (n.done && n.idx === n.points.length - 1) h += ui.notice('ok', '<b>Arrived at the destination.</b>');
        if (r) {
          var e1 = eta(r.etaNext, r.hoursNext), e2 = eta(r.etaEnd, r.hoursEnd);
          var steer = r.courseError == null || Math.abs(r.courseError) < 3 ? '' : (r.courseError > 0 ? 'turn ' + Math.round(r.courseError) + '° to starboard' : 'turn ' + Math.round(-r.courseError) + '° to port');
          h += '<div class="ln-grid">' +
            cell('BRG', pad3(r.brg), steer, 'big') +
            cell('DTW', esc(dist(r.dtwNM)), r.vmgKn != null ? 'VMG ' + kn(r.vmgKn) + ' kn' : '', 'big') +
            cell('XTE', esc(xteTxt(r.xteM)), r.steer ? 'steer ' + r.steer : (r.xteM == null ? 'no leg yet' : 'on track'), r.xteM != null && Math.abs(r.xteM) > 0.1 * 1852 ? 'warn' : '') +
            cell('ETA ' + esc('WP' + (n.idx + 1)), esc(e1.t), esc(e1.s)) +
            cell('ETA end', esc(e2.t), esc(e2.s)) +
            cell('To end', esc(dist(r.toEndNM)), r.speedSource === 'planned' ? 'at planned ' + kn(r.speedKn) + ' kn' : r.speedSource === 'sog' ? 'at SOG' : 'set a planned speed') +
            '</div>';
        } else if (!live) h += '<p class="small muted">Start GPS to see bearing, distance and ETA to ' + esc(wpName(n, n.idx)) + '.</p>';
        h += '<div class="flex ln-actions"><label class="small">Planned speed <input data-ln-plan inputmode="decimal" value="' + esc(n.plannedKn || '') + '" placeholder="kn"></label>' +
          '<label class="small">Arrival radius <select data-ln-arr>' + [[0.02, '0.02 NM (37 m)'], [0.05, '0.05 NM (93 m)'], [0.1, '0.1 NM'], [0.25, '0.25 NM'], [0.5, '0.5 NM']].map(function (o) { return '<option value="' + o[0] + '"' + ((n.arrivalNM || 0.05) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
          '<span class="spacer"></span><button class="btn btn-ghost btn-sm" data-ln-end>' + icon('i-x') + 'End route</button></div>';
      } else {
        h += '<div class="flex ln-actions"><span class="small muted">Not following a track.</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-ln-pick>' + icon('i-route') + 'Follow a track</button></div>';
      }
      h += '<p class="ln-note small muted">COG/SOG are smoothed over a few seconds. ' + esc(ui.NAV_DISCLAIMER) + '</p>';
      el.innerHTML = h;
      bind(n);
    }
    function bind(n) {
      var $ = function (s) { return ui.$(s, el); };
      var b;
      if ((b = $('[data-ln-start]'))) b.addEventListener('click', start);
      if ((b = $('[data-ln-stop]'))) b.addEventListener('click', stop);
      if ((b = $('[data-ln-center]'))) b.addEventListener('click', function () { follow = true; if (lastFix) map.panTo([lastFix.lat, lastFix.lon]); render(); });
      if ((b = $('[data-ln-pick]'))) b.addEventListener('click', pickTrack);
      if (!n) return;
      if ((b = $('[data-ln-prev]'))) b.addEventListener('click', function () { delete n.auto; n.idx = Math.max(0, n.idx - 1); n.done = false; setNav(n); render(); draw(); });
      if ((b = $('[data-ln-next]'))) b.addEventListener('click', function () { delete n.auto; n.idx = Math.min(n.points.length - 1, n.idx + 1); n.done = false; setNav(n); render(); draw(); });
      if ((b = $('[data-ln-end]'))) b.addEventListener('click', function () { setNav(null); render(); draw(); ui.toast('Route ended'); });
      if ((b = $('[data-ln-plan]'))) b.addEventListener('change', function (e) { var v = parseFloat(e.target.value.replace(',', '.')); n.plannedKn = isFinite(v) && v > 0 ? v : null; setNav(n); render(); });
      if ((b = $('[data-ln-arr]'))) b.addEventListener('change', function (e) { n.arrivalNM = +e.target.value; setNav(n); });
    }

    function pickTrack() {
      var saved = MEIKO.trackUI ? MEIKO.trackUI.all() : [], draft = MEIKO.storage.get('track:draft', null);
      var items = [];
      if (draft && draft.points && draft.points.length >= 1) items.push({ key: 'draft', name: (draft.name || 'Track being edited') + ' (current)', t: draft });
      saved.forEach(function (t) { items.push({ key: t.id, name: t.name, t: t }); });
      ui.sheet({
        title: 'Follow a track',
        html: !items.length ? '<p class="small muted">No tracks yet. Build one in the Track Planner first.</p><div class="actions"><a class="btn btn-primary" href="#/t/track" data-close>' + icon('i-route') + 'Open Track Planner</a></div>' :
          '<ul class="list">' + items.map(function (it, i) { return '<li><div class="grow"><b>' + esc(it.name) + '</b><small>' + it.t.points.length + ' waypoints</small></div><button class="btn btn-primary btn-sm" data-i="' + i + '">Follow</button></li>'; }).join('') + '</ul>',
        onMount: function (body, close) {
          body.addEventListener('click', function (e) {
            var b = e.target.closest('[data-i]'); if (!b) return;
            var it = items[+b.dataset.i]; close();
            startRoute({ name: it.t.name || it.name, points: it.t.points, plannedKn: parseFloat(it.t.speed) || null });
          });
        }
      });
    }

    function startRoute(t) {
      var pts = t.points.map(function (p) { return { lat: p.lat, lon: p.lon, name: p.name || '' }; });
      var idx = lastFix ? C.livenav.startIndex(pts, lastFix) : 0;
      setNav({ name: t.name || 'Track', points: pts, idx: idx, plannedKn: t.plannedKn || null, arrivalNM: 0.05, auto: !lastFix });
      if (!live) start(); else { render(); draw(); }
      el.scrollIntoView && el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      ui.toast('Following ' + (t.name || 'track') + ' · to WP' + (idx + 1));
    }

    map.on('dragstart', function () { if (live && follow) { follow = false; render(); } });
    render(); draw();
    if (sessionLive) start();

    var api = {
      startRoute: startRoute,
      destroy: function () { document.removeEventListener('visibilitychange', onVis); if (live) { MEIKO.gps.stop(); releaseWake(); } live = false; if (current === api) current = null; }
    };
    current = api;
    return api;
  }

  /** Start following a track from anywhere (e.g. the Track Planner's Navigate button). */
  function navigate(t) {
    if (current) return current.startRoute(t);
    var pts = t.points.map(function (p) { return { lat: p.lat, lon: p.lon, name: p.name || '' }; });
    setNav({ name: t.name || 'Track', points: pts, idx: 0, plannedKn: t.plannedKn || null, arrivalNM: 0.05, auto: true });
    sessionLive = true; location.hash = '#/t/map';
  }

  MEIKO.liveNav = { attach: attach, navigate: navigate, active: getNav };
})();
