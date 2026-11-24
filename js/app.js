/*
 * MEIKO — application shell: navigation, routing, dashboard, install & offline handling.
 * Routes:  #/  ·  #/c/<category>  ·  #/t/<tool>
 */
(function () {
  'use strict';
  MEIKO.VERSION = '1.11.0';
  var ui = MEIKO.ui, F = MEIKO.features, icon = ui.icon, C = window.MeikoCore;
  var view = ui.$('#view'), cleanup = null, clockTimer = null, deferredInstall = null;

  /* ---------- Navigation chrome ---------- */
  function catHref(cat) { var tools = F.inCategory(cat.id); return tools.length === 1 ? '#/t/' + tools[0].id : '#/c/' + cat.id; }

  function buildSidebar() {
    var html = '<a class="brand" href="#/"><svg class="logo"><use href="#logo"/></svg><span class="wordmark"><b>MEIKO</b><small>' + ui.esc(MEIKO.t('tagline')) + '</small></span></a>';
    html += '<div class="nav-group" data-group="home"><a href="#/" data-nav="home">' + icon('i-home') + MEIKO.t('nav.home') + '</a></div>';
    F.CATEGORIES.forEach(function (c) {
      var tools = F.inCategory(c.id);
      html += '<div class="nav-group" data-group="' + c.id + '"><a href="' + catHref(c) + '" data-nav="' + c.id + '">' + icon(c.icon) + ui.esc(MEIKO.t('cat.' + c.id)) + '</a>';
      if (tools.length > 1) html += '<div class="nav-sub">' + tools.map(function (t) { return '<a href="#/t/' + t.id + '" data-tool="' + t.id + '">' + ui.esc(t.title) + '</a>'; }).join('') + '</div>';
      html += '</div>';
    });
    html += '<div class="side-foot">Calculation aid only — not a substitute for official charts, publications or professional judgement.<br><span style="opacity:.7">v' + MEIKO.VERSION + '</span></div>';
    ui.$('#sidebar').innerHTML = html;
  }
  function buildBottomNav() {
    var items = [['#/', 'i-home', 'nav.home', 'home'], ['#/c/navigation', 'i-nav', 'nav.navigate', 'navigation'], ['#/t/qibla', 'i-kaaba', 'nav.qibla', 'qibla'], ['#/t/gps', 'i-gps', 'nav.gps', 'gps'], ['#/t/settings', 'i-settings', 'nav.settings', 'settings']];
    ui.$('#bottomNav').innerHTML = items.map(function (i) { return '<a href="' + i[0] + '" data-bn="' + i[3] + '">' + icon(i[1]) + '<span>' + MEIKO.t(i[2]) + '</span></a>'; }).join('');
  }
  function setActive(route) {
    var cat = route.cat || (route.tool && F.get(route.tool) ? F.get(route.tool).cat : null);
    ui.$$('#sidebar [data-nav]').forEach(function (a) { a.classList.toggle('active', route.name === 'home' ? a.dataset.nav === 'home' : a.dataset.nav === cat); });
    ui.$$('#sidebar .nav-group').forEach(function (g) { g.classList.toggle('open', g.dataset.group === cat); });
    ui.$$('#sidebar [data-tool]').forEach(function (a) { a.classList.toggle('active', a.dataset.tool === route.tool); });
    ui.$$('#bottomNav [data-bn]').forEach(function (a) {
      var k = a.dataset.bn, on = false;
      if (k === 'home') on = route.name === 'home' || (route.name !== 'home' && ['calculator', 'converter', 'astronomy'].indexOf(cat) !== -1) || (cat === 'prayer' && route.tool !== 'qibla') || (cat === 'position' && route.tool !== 'gps');
      else if (k === 'navigation') on = cat === 'navigation';
      else on = route.tool === k;
      a.classList.toggle('active', on);
    });
  }

  /* ---------- Router ---------- */
  function parse() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    if (parts[0] === 'c' && F.category(parts[1])) return { name: 'cat', cat: parts[1] };
    if (parts[0] === 't' && F.get(parts[1])) return { name: 'tool', tool: parts[1] };
    return { name: 'home' };
  }
  function render() {
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) {} }
    cleanup = null; clearInterval(clockTimer);
    var route = parse(), title = 'MEIKO';
    if (route.name === 'cat') {
      var tools = F.inCategory(route.cat);
      if (tools.length === 1) { location.replace('#/t/' + tools[0].id); return; }
      title = MEIKO.t('cat.' + route.cat); renderCategory(route.cat);
    } else if (route.name === 'tool') {
      var tool = F.get(route.tool); title = tool.title;
      if (!F.entitlements.canUse(tool)) { view.innerHTML = ui.notice('warn', 'This tool is part of MEIKO Pro.'); }
      else {
        try { cleanup = tool.render.call(tool, view); }
        catch (e) { console.error(e); view.innerHTML = ui.notice('err', '<b>Something went wrong loading this tool.</b> ' + ui.esc(e.message)); }
      }
      MEIKO.storage.set('recent', [route.tool].concat((MEIKO.storage.get('recent', []) || []).filter(function (x) { return x !== route.tool; })).slice(0, 4));
    } else renderHome();
    ui.$('#pageTitle').textContent = route.name === 'home' ? 'MEIKO' : title;
    document.title = (route.name === 'home' ? 'MEIKO — Navigate • Calculate • Explore' : title + ' · MEIKO');
    ui.$('#backBtn').hidden = route.name === 'home';
    ui.$('#brandMini').style.display = route.name === 'home' ? '' : 'none';
    setActive(route);
    window.scrollTo(0, 0);
  }
  ui.$('#backBtn').addEventListener('click', function () {
    var r = parse();
    if (r.name === 'tool') { var t = F.get(r.tool); location.hash = F.inCategory(t.cat).length > 1 ? '#/c/' + t.cat : '#/'; }
    else location.hash = '#/';
  });

  /* ---------- Dashboard ---------- */
  var QUICK = ['map', 'track', 'distance', 'ports', 'eta', 'course', 'qibla', 'maghrib'];
  function tile(t) { return '<a class="tile" href="#/t/' + t.id + '"><div class="ico">' + icon(t.icon) + '</div><b>' + ui.esc(t.title) + '</b><span>' + ui.esc(t.desc) + '</span></a>'; }

  function renderHome() {
    var cats = F.CATEGORIES.map(function (c) {
      var n = F.inCategory(c.id).length;
      return '<a class="cat" href="' + catHref(c) + '"><div class="ico">' + icon(c.icon) + '</div><div class="txt"><b>' + ui.esc(MEIKO.t('cat.' + c.id)) + '</b><small>' + ui.esc(c.desc) + '</small></div>' + (n > 1 ? '<span class="badge info">' + n + '</span>' : '') + icon('i-chev', 'chev') + '</a>';
    }).join('');
    view.innerHTML =
      '<section class="hero" aria-label="Date, time and position">' +
        '<svg class="rose" style="color:#E9D18A"><use href="#i-compass-rose"/></svg>' +
        '<div class="hero-top"><div><div class="clock" data-clock>--:--</div><div class="date" data-date></div><div class="sub" data-utc></div></div>' +
        '<div class="tagline">' + ui.esc(MEIKO.t('tagline')) + '</div></div>' +
        (MEIKO.vessel ? MEIKO.vessel.heroHTML() : '') +
        '<div class="pos" data-pos></div>' +
      '</section>' +
      '<div class="search">' + icon('i-search') + '<input type="search" placeholder="Search tools — e.g. ETA, qibla, knots, sunrise" aria-label="Search tools" data-search></div>' +
      '<div data-search-results></div>' +
      '<div data-home-main>' +
        '<div class="section-title">Quick access</div><div class="tiles">' + QUICK.map(function (id) { return F.get(id); }).filter(Boolean).map(tile).join('') + '</div>' +
        '<div class="section-title">Categories</div><div class="cat-list">' + cats + '</div>' +
      '</div>' + ui.disclaimer();

    var clockEl = ui.$('[data-clock]', view), dateEl = ui.$('[data-date]', view), utcEl = ui.$('[data-utc]', view);
    function tick() {
      var tz = MEIKO.settings.get('tz'), now = Date.now();
      var t = ui.time(now, tz, { seconds: false });
      var sec = String(new Date(now).getUTCSeconds()).padStart(2, '0');
      clockEl.innerHTML = ui.esc(t.replace(/ (AM|PM)$/, '')) + '<small>' + sec + (/ (AM|PM)$/.test(t) ? ' ' + t.slice(-2) : '') + '</small>';
      dateEl.textContent = ui.date(now, tz, true);
      utcEl.textContent = ui.tzLabel(tz) + ' · UTC ' + ui.time(now, 0, { format: '24' });
    }
    tick(); clockTimer = setInterval(tick, 1000);
    renderPos();

    var search = ui.$('[data-search]', view), results = ui.$('[data-search-results]', view), main = ui.$('[data-home-main]', view);
    search.addEventListener('input', function () {
      var q = search.value.trim();
      if (!q) { results.innerHTML = ''; main.hidden = false; return; }
      var found = F.search(q); main.hidden = true;
      results.innerHTML = '<div class="section-title">' + found.length + ' result' + (found.length === 1 ? '' : 's') + '</div>' +
        (found.length ? '<div class="tiles">' + found.map(tile).join('') + '</div>' : '<div class="card">' + ui.empty('i-search', 'No tools found', 'Try “distance”, “knots”, “sunrise” or “kiblat”.') + '</div>');
    });
    search.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var f = F.search(search.value)[0]; if (f) location.hash = '#/t/' + f.id; } });
  }

  function renderPos() {
    var el = ui.$('[data-pos]', view); if (!el) return;
    var f = MEIKO.gps.last();
    if (!f) {
      el.innerHTML = '<div class="grow"><div class="coords">Position not set</div><div class="meta">GPS is used only when you ask. Nothing is shared.</div></div><button class="btn btn-gold btn-sm" data-loc>' + icon('i-gps') + 'Get GPS position</button>';
    } else {
      var age = Date.now() - f.timestamp, mins = Math.round(age / 60000);
      var ageTxt = mins < 1 ? 'just now' : mins < 60 ? mins + ' min ago' : mins < 1440 ? Math.round(mins / 60) + ' h ago' : ui.date(f.timestamp);
      var tz = MEIKO.settings.get('tz'), d = ui.parseISODate(ui.todayISO(tz)), extra = '';
      try {
        var s = C.solar.sunTimes(d, f.lat, f.lon, tz), m = C.prayer.maghrib(d, f.lat, f.lon, tz, { method: 'kemenag' });
        extra = '<div class="meta" style="margin-top:4px">Sunrise ' + ui.time(s.sunrise, tz) + ' · Merpass ' + ui.time(s.solarNoon, tz) + ' · Sunset ' + ui.time(s.sunset, tz) + (m.ok ? ' · Maghrib ' + ui.time(C.prayer.ceilMinute(m.utcMs), tz) : '') +
          ' · Qibla ' + ui.bearing(C.qibla.qibla(f.lat, f.lon).bearing, 0) + ' T</div>';
      } catch (e) {}
      el.innerHTML = '<div class="grow"><div class="coords"><span>' + ui.esc(ui.coord(f.lat, 'lat')) + '</span> &nbsp;<span>' + ui.esc(ui.coord(f.lon, 'lon')) + '</span></div><div class="meta">' + (age > 600000 ? 'Last known position · ' : '') + (f.source === 'external' ? 'External GPS · ' : '') + (f.accuracy != null ? '±' + Math.round(f.accuracy) + ' m' + (f.accuracyEstimated ? ' est.' : '') + ' · ' : '') + ageTxt + '</div>' + extra + '</div>' +
        '<button class="btn btn-gold btn-sm" data-loc>' + icon('i-gps') + 'Update</button>';
    }
    var b = ui.$('[data-loc]', el);
    b.addEventListener('click', function () {
      b.disabled = true; b.innerHTML = icon('i-gps') + 'Locating…';
      MEIKO.gps.getPosition({ maximumAge: 0 }).then(renderPos, function (err) {
        b.disabled = false; b.innerHTML = icon('i-gps') + 'Try again';
        ui.sheet({ title: 'Location unavailable', html: ui.notice('err', ui.esc(err.message)) + '<p class="small muted mt-12">All tools also accept manually entered coordinates.</p><div class="actions"><button class="btn btn-ghost" data-close data-lh>' + icon('i-info') + 'How to allow location</button></div>', onMount: function (body) { ui.$('[data-lh]', body).addEventListener('click', function () { setTimeout(showLocationHelp, 0); }); } });
      });
    });
  }

  function renderCategory(catId) {
    var cat = F.category(catId), tools = F.inCategory(catId);
    view.innerHTML = '<div class="page-head"><div class="eyebrow">Category</div><h1>' + ui.esc(MEIKO.t('cat.' + catId)) + '</h1><p>' + ui.esc(cat.desc) + '.</p></div>' +
      '<div class="tool-list">' + tools.map(function (t) {
        return '<a class="cat" href="#/t/' + t.id + '"><div class="ico">' + icon(t.icon) + '</div><div class="txt"><b>' + ui.esc(t.title) + '</b><small>' + ui.esc(t.desc) + '</small></div>' + icon('i-chev', 'chev') + '</a>';
      }).join('') + '</div>' + (catId === 'navigation' || catId === 'calculator' ? ui.disclaimer() : '');
  }

  /* ---------- Shared dialogs ---------- */
  function promptSave(lat, lon, cb) {
    ui.sheet({
      title: 'Save position',
      html: '<p class="small muted">' + ui.esc(ui.coordPair(lat, lon)) + '</p><label class="field mt-12"><span>Name</span><input data-n maxlength="60" placeholder="e.g. Home port, Anchorage A"></label><div class="actions"><button class="btn btn-primary" data-ok>' + icon('i-star') + 'Save</button></div>',
      onMount: function (body, close) {
        var n = ui.$('[data-n]', body);
        function ok() { var name = n.value.trim() || ('Position ' + ui.date(Date.now())); MEIKO.storage.locations.add({ name: name, lat: lat, lon: lon }); close(); ui.toast('Saved “' + name + '”'); if (cb) cb(); }
        ui.$('[data-ok]', body).addEventListener('click', ok); n.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
      }
    });
  }
  function addLocationManually(cb) {
    ui.sheet({
      title: 'Add a location',
      html: '<div class="form-gap"><label class="field"><span>Name</span><input data-n maxlength="60" placeholder="e.g. Pelabuhan Ratu"></label>' + ui.coordField('m', 'Coordinates', { noGps: false }) + '<div data-err></div><div class="actions"><button class="btn btn-primary" data-ok>' + icon('i-plus') + 'Add location</button></div></div>',
      onMount: function (body, close) {
        var c = ui.bindCoord(body, 'm');
        ui.$('[data-ok]', body).addEventListener('click', function () {
          var r = c.get(), name = ui.$('[data-n]', body).value.trim();
          if (!name) { ui.$('[data-err]', body).innerHTML = ui.notice('err', 'Enter a name.'); return; }
          if (!r.ok) { ui.$('[data-err]', body).innerHTML = ui.notice('err', ui.esc(r.error)); return; }
          MEIKO.storage.locations.add({ name: name, lat: r.lat, lon: r.lon }); close(); ui.toast('Added “' + name + '”'); if (cb) cb();
        });
      }
    });
  }

  /* ---------- Location permission ---------- */
  function locationHelpHTML() {
    var pf = MEIKO.gps.platform();
    var ios = '<div class="section-title" style="margin-top:4px">iPhone / iPad (Safari)</div><ol class="small" style="padding-left:18px;line-height:1.6;margin:0">' +
      '<li>Open <b>Settings → Privacy &amp; Security → Location Services</b> and switch it <b>on</b>.</li>' +
      '<li>On the same screen tap <b>Safari Websites</b> → choose <b>While Using the App</b> (or <b>Ask Next Time</b>) and turn on <b>Precise Location</b>.</li>' +
      '<li>In Safari, with MEIKO open, tap the page-settings button (<b>aA</b>) in the address bar → <b>Website Settings</b> → <b>Location</b> → <b>Allow</b> or <b>Ask</b>.</li>' +
      '<li>Come back and tap <b>Allow location access</b>. If MEIKO on the Home Screen still does not ask, open it once in Safari, allow there, then reopen it.</li></ol>' +
      '<div class="section-title">External GPS receiver on iPad / iPhone</div>' +
      '<p class="small">Safari cannot open Bluetooth or USB devices itself (Apple does not support Web Bluetooth or Web Serial). Two routes work:</p><ul class="small" style="padding-left:18px;line-height:1.6;margin:6px 0 0">' +
      '<li><b>iOS-compatible receiver (recommended):</b> receivers sold as working with iPhone/iPad location (e.g. Bad Elf, Garmin GLO 2, Dual XGPS series — check the maker\'s iOS support) feed <b>iOS Location Services</b>. Pair it in Settings → Bluetooth or in the maker\'s app, keep MEIKO\'s GPS source on <b>Auto</b> or <b>Phone / tablet</b>, and allow location as above. Safari and MEIKO then receive the receiver\'s position automatically.</li>' +
      '<li><b>Wi-Fi network:</b> if the boat has a Signal K server or a Wi-Fi gateway that offers NMEA/Signal K over <b>wss://</b> (WebSocket), connect it under <b>GPS source → Network (Wi-Fi)</b>.</li></ul>' +
      '<p class="small muted mt-8">Wi-Fi-only iPads have no GPS chip; without an external receiver their location comes from Wi-Fi networks and is usually unavailable at sea.</p>';
    var android = '<div class="section-title" style="margin-top:4px">Android (Chrome)</div><ol class="small" style="padding-left:18px;line-height:1.6;margin:0">' +
      '<li>Swipe down and make sure <b>Location</b> is on.</li>' +
      '<li>In Chrome, tap the icon left of the address → <b>Permissions</b> (or Site settings) → <b>Location</b> → <b>Allow</b>.</li>' +
      '<li>If still blocked: Android <b>Settings → Apps → Chrome → Permissions → Location → Allow</b> (and “Use precise location”).</li></ol>';
    var desktop = '<div class="section-title" style="margin-top:4px">Computer</div><p class="small">Click the icon left of the address bar → <b>Location</b> → <b>Allow</b>, then reload. On macOS/Windows also allow the browser in the system privacy settings.</p>';
    var order = pf.ios ? [ios, android, desktop] : pf.android ? [android, ios, desktop] : [desktop, ios, android];
    return order[0] + '<details class="help"><summary>' + icon('i-info') + 'Other devices</summary><div class="body">' + order[1] + order[2] + '</div></details>' +
      '<p class="small muted mt-12">Location needs https. MEIKO asks only when you tap a GPS button and never sends your position anywhere. All tools also accept typed coordinates.</p>';
  }
  function showLocationHelp() { ui.sheet({ title: 'Allow location access', html: locationHelpHTML() }); }

  var PERM = {
    granted: ['ok', 'Allowed', 'Location access is allowed for MEIKO.'],
    prompt: ['info', 'Not asked yet', 'Tap “Allow location access” — your browser will ask once.'],
    denied: ['warn', 'Blocked', 'Location is blocked for this site. Tap “How to allow” for the steps to switch it back on.'],
    insecure: ['warn', 'Needs https', 'Location only works when MEIKO is opened over https (or localhost).'],
    unsupported: ['warn', 'Not supported', 'This browser has no location support. Use an external receiver or type coordinates.'],
    unknown: ['info', 'Unknown', 'This browser does not report the permission state. Tap “Allow location access” to check.']
  };
  /** Location-permission panel; mounts into `el` (used on Position & GPS and Settings). */
  function mountPermission(el, onFix) {
    el.innerHTML = '<div class="card-title">' + icon('i-pin') + 'Location permission<span class="spacer"></span><span data-perm-badge></span></div>' +
      '<p class="small" style="color:var(--text-2)" data-perm-text></p>' +
      '<div class="flex mt-12"><button class="btn btn-gold btn-sm" data-perm-ask>' + icon('i-gps') + 'Allow location access</button><button class="btn btn-ghost btn-sm" data-perm-help>' + icon('i-info') + 'How to allow</button></div><div data-perm-msg class="mt-8"></div>';
    function render(state) {
      var p = PERM[state] || PERM.unknown;
      ui.$('[data-perm-badge]', el).innerHTML = '<span class="badge ' + p[0] + '">' + p[1] + '</span>';
      ui.$('[data-perm-text]', el).textContent = p[2];
      ui.$('[data-perm-ask]', el).textContent = state === 'granted' ? 'Test location now' : 'Allow location access';
    }
    var deniedNow = false; // some browsers keep reporting "prompt" after the user taps Don't Allow
    function refresh() { MEIKO.gps.permissionState().then(function (st) { render(deniedNow && st !== 'granted' ? 'denied' : st); }); }
    ui.$('[data-perm-help]', el).addEventListener('click', showLocationHelp);
    var ask = ui.$('[data-perm-ask]', el), msg = ui.$('[data-perm-msg]', el);
    ask.addEventListener('click', function () {
      ask.disabled = true; msg.innerHTML = '<p class="small muted">Waiting for the browser… answer “Allow” in the prompt.</p>';
      MEIKO.gps.requestPermission().then(function (f) {
        msg.innerHTML = ui.notice('ok', 'Location works · ±' + Math.round(f.accuracy) + ' m');
        if (onFix) onFix(f);
      }, function (e) {
        deniedNow = /denied/i.test(e.message);
        msg.innerHTML = ui.notice('err', ui.esc(e.message) + ' <a href="#" data-h>How to allow</a>');
        var a = ui.$('[data-h]', msg); if (a) a.addEventListener('click', function (ev) { ev.preventDefault(); showLocationHelp(); });
      }).then(function () { ask.disabled = false; refresh(); });
    });
    MEIKO.gps.watchPermission(render);
    refresh();
  }

  /* ---------- Install / offline / service worker ---------- */
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; });
  window.addEventListener('appinstalled', function () { deferredInstall = null; ui.toast('MEIKO installed'); });
  function syncOnline() { document.body.classList.toggle('offline', !navigator.onLine); }
  window.addEventListener('online', function () { syncOnline(); ui.toast('Back online'); });
  window.addEventListener('offline', function () { syncOnline(); ui.toast('Offline — calculators keep working'); });
  syncOnline();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      // Auto-update: when a new service worker takes over, reload once so the new version shows
      // immediately (not on the next visit). Skipped on the very first install.
      var hadController = !!navigator.serviceWorker.controller, reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadController || reloading) return;
        reloading = true;
        try { sessionStorage.setItem('meiko:updated', MEIKO.VERSION); } catch (e) {}
        location.reload();
      });
      navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' }).then(function (reg) {
        var check = function () { if (navigator.onLine !== false) reg.update().catch(function () {}); };
        check();
        // Check again when the app comes back to the foreground (installed PWAs stay open for days).
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
        setInterval(check, 30 * 60 * 1000);
      }).catch(function () { /* e.g. sandboxed preview: app still works online */ });
      try { if (sessionStorage.getItem('meiko:updated')) { sessionStorage.removeItem('meiko:updated'); setTimeout(function () { ui.toast('MEIKO updated to v' + MEIKO.VERSION); }, 600); } } catch (e) {}
    });
  }

  window.addEventListener('scroll', function () { ui.$('#topbar').classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
  MEIKO.settings.onChange(function (k) { if (k === 'lang') { buildSidebar(); buildBottomNav(); } });

  MEIKO.app = {
    rerender: render, promptSave: promptSave, addLocationManually: addLocationManually,
    showLocationHelp: showLocationHelp, mountPermission: mountPermission, locationHelpHTML: locationHelpHTML,
    canInstall: function () { return !!deferredInstall; },
    install: function () { if (!deferredInstall) return Promise.resolve(); deferredInstall.prompt(); return deferredInstall.userChoice.then(function () { deferredInstall = null; }); }
  };

  buildSidebar(); buildBottomNav();
  window.addEventListener('hashchange', render);
  render();
})();
