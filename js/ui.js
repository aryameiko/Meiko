/*
 * MEIKO — shared UI helpers and components (formatting, coordinate field, sheets, toasts, copy).
 */
(function () {
  'use strict';
  var C = window.MeikoCore;
  var S = function (k) { return MEIKO.settings.get(k); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(name, extra) { return '<svg class="i' + (extra ? ' ' + extra : '') + '" aria-hidden="true"><use href="#' + name + '"/></svg>'; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = $('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---------- Copy ---------- */
  function copy(text, label) {
    var done = function () { toast((label || 'Copied') + ' to clipboard'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copy not supported on this browser'); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- Sheet (modal) ---------- */
  function sheet(opts) {
    var bd = document.createElement('div');
    bd.className = 'sheet-backdrop';
    bd.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
      '<div class="sheet-head"><h3' + (opts.rawTitle ? ' translate="no"' : '') + '>' + esc(opts.title) + '</h3><button class="icon-btn" data-close aria-label="Close">' + icon('i-x') + '</button></div>' +
      '<div class="sheet-body">' + (opts.html || '') + '</div></div>';
    document.body.appendChild(bd);
    var prevFocus = document.activeElement;
    function close() { if (!bd.parentNode) return; bd.remove(); document.removeEventListener('keydown', onKey); if (opts.onClose) try { opts.onClose(); } catch (e) {} if (prevFocus && prevFocus.focus) prevFocus.focus(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    bd.addEventListener('click', function (e) { if (e.target === bd || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    if (opts.onMount) opts.onMount($('.sheet-body', bd), close);
    var f = $('input, button:not([data-close])', bd); if (f) setTimeout(function () { f.focus(); }, 50);
    return close;
  }

  /* ---------- Number & time formatting ---------- */
  function num(v, dp, opts) {
    if (v == null || !isFinite(v)) return '—';
    dp = dp == null ? 2 : dp;
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: (opts && opts.trim) ? 0 : dp, maximumFractionDigits: dp });
  }
  function bearing(v, dp) {
    if (v == null || !isFinite(v)) return '—';
    dp = dp == null ? 1 : dp;
    var s = C.geo.norm360(v).toFixed(dp);
    if (parseFloat(s) >= 360) s = (0).toFixed(dp);
    var intPart = s.split('.')[0]; while (intPart.length < 3) { s = '0' + s; intPart = '0' + intPart; }
    return s + '°';
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function shifted(utcMs, tz) { return new Date(utcMs + tz * 3600000); } // read with getUTC*
  function time(utcMs, tz, opts) {
    if (utcMs == null || !isFinite(utcMs)) return '—';
    opts = opts || {};
    var d = shifted(utcMs, tz == null ? S('tz') : tz);
    var h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds();
    var sec = opts.seconds ? ':' + pad2(s) : '';
    if ((opts.format || S('timeFormat')) === '12') {
      var ap = h >= 12 ? 'PM' : 'AM'; var h12 = h % 12 || 12;
      return h12 + ':' + pad2(m) + sec + ' ' + ap;
    }
    return pad2(h) + ':' + pad2(m) + sec;
  }
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  /** Dates in the chosen language (Intl), English names as the fallback. */
  function intlDate(d, long) {
    var L = MEIKO.i18n && MEIKO.i18n.lang();
    if (!L || L === 'en' || !window.Intl || !Intl.DateTimeFormat) return null;
    try {
      return new Intl.DateTimeFormat(MEIKO.i18n.locale(), long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
    } catch (e) { return null; }
  }
  function date(utcMs, tz, long) {
    if (utcMs == null || !isFinite(utcMs)) return '—';
    var d = shifted(utcMs, tz == null ? S('tz') : tz), loc = intlDate(d, long);
    if (loc) return loc;
    if (long) return DOW_LONG[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MON_LONG[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    return DOW[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function dateYMD(ymd) { // {y,m,d} → "Mon 23 Nov 2026"
    var d = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)), loc = intlDate(d, false);
    if (loc) return loc;
    return DOW[d.getUTCDay()] + ' ' + ymd.d + ' ' + MON[ymd.m - 1] + ' ' + ymd.y;
  }
  function tzLabel(tz) {
    var sign = tz < 0 ? '−' : '+'; var a = Math.abs(tz);
    var h = Math.floor(a), m = Math.round((a - h) * 60);
    return 'UTC' + sign + pad2(h) + ':' + pad2(m);
  }
  var TZ_NAMES = { 7: 'WIB · Jakarta', 8: 'WITA · Makassar, Bali', 9: 'WIT · Jayapura', 0: 'UTC / GMT', 3: 'Makkah', 5.5: 'India', 10: 'Sydney (std)', '-5': 'New York (std)', 1: 'Central Europe (std)' };
  var TZ_LIST = [-12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14];
  function tzOptions(selected) {
    if (TZ_LIST.indexOf(selected) === -1) TZ_LIST = TZ_LIST.concat([selected]).sort(function (a, b) { return a - b; });
    return TZ_LIST.map(function (tz) {
      var name = TZ_NAMES[tz] || TZ_NAMES[String(tz)];
      return '<option value="' + tz + '"' + (tz === selected ? ' selected' : '') + '>' + tzLabel(tz) + (name ? ' — ' + name : '') + '</option>';
    }).join('');
  }
  function todayISO(tz) {
    var d = shifted(Date.now(), tz == null ? S('tz') : tz);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }
  function nowLocalISO(tz) { // for datetime-local inputs
    var d = shifted(Date.now(), tz == null ? S('tz') : tz);
    return todayISO(tz) + 'T' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes());
  }
  function parseISODate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var test = new Date(Date.UTC(y, mo - 1, d));
    if (test.getUTCMonth() !== mo - 1 || y < 1900 || y > 2200) return null;
    return { y: y, m: mo, d: d };
  }
  function parseLocalDateTime(s, tz) { // "YYYY-MM-DDTHH:MM" in given offset → UTC ms
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s || ''));
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - tz * 3600000;
  }
  function coord(v, axis, fmt) { return C.coords.format(v, axis, fmt || S('coordFormat')); }
  function coordPair(lat, lon, fmt) { return coord(lat, 'lat', fmt) + '  ' + coord(lon, 'lon', fmt); }
  function minutesToHMS(mins, signed) {
    var sign = mins < 0 ? '−' : (signed ? '+' : '');
    var t = Math.round(Math.abs(mins) * 60);
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return sign + (h ? h + 'h ' : '') + pad2(m) + 'm ' + pad2(s) + 's';
  }
  function decl(v) { return C.coords.formatDDM(v, 'lat', 1); }

  /* ---------- Unit labels ---------- */
  var DIST_UNITS = { nm: 'NM', km: 'km', m: 'm' };
  var SPEED_UNITS = { kn: 'kn', kmh: 'km/h', ms: 'm/s', mph: 'mph' };
  var TIME_UNITS = { h: 'hours', min: 'minutes', s: 'seconds', d: 'days' };
  function options(map, selected) {
    return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + map[k] + '</option>'; }).join('');
  }

  /* ---------- Blocks ---------- */
  function pageHead(tool) {
    return '<div class="page-head"><div class="eyebrow">' + esc(MEIKO.t('cat.' + tool.cat)) + '</div><h1>' + esc(tool.title) + '</h1>' +
      (tool.lead ? '<p>' + tool.lead + '</p>' : '') + '</div>';
  }
  function empty(ic, title, text) {
    return '<div class="empty">' + icon(ic) + '<b>' + esc(title) + '</b><span class="small">' + esc(text) + '</span></div>';
  }
  function kv(rows) {
    return '<div class="kv">' + rows.filter(Boolean).map(function (r) {
      return '<div class="k">' + r[0] + '</div><div class="v">' + r[1] + '</div>';
    }).join('') + '</div>';
  }
  function notice(kind, html, ic) {
    return '<div class="notice ' + (kind || '') + '">' + icon(ic || (kind === 'ok' ? 'i-check' : kind ? 'i-alert' : 'i-info')) + '<div>' + html + '</div></div>';
  }
  function help(title, html, open) {
    return '<details class="help"' + (open ? ' open' : '') + '><summary>' + icon('i-book') + esc(title) + '</summary><div class="body">' + html + '</div></details>';
  }
  function resultCard(title, bodyHtml, opts) {
    opts = opts || {};
    return '<div class="result" aria-live="polite"><div class="result-head">' + icon(opts.icon || 'i-check') + '<h3>' + esc(title) + '</h3>' +
      (opts.badge || '') + (opts.copy ? '<button class="btn btn-ghost btn-sm" data-copy-result>' + icon('i-copy') + 'Copy</button>' : '') +
      '</div>' + bodyHtml + (opts.foot ? '<div class="result-foot">' + opts.foot + '</div>' : '') + '</div>';
  }
  function big(k, v, unit, sub) {
    return '<div class="result-big"><div class="k">' + k + '</div><div class="v">' + v + (unit ? '<small>' + unit + '</small>' : '') + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>';
  }
  var NAV_DISCLAIMER = 'MEIKO is a calculation aid. It does not replace official nautical charts, approved navigation systems, official nautical publications or professional navigational judgement.';
  function disclaimer(text) { return '<p class="disclaimer">' + icon('i-info') + '<span>' + esc(text || NAV_DISCLAIMER) + '</span></p>'; }

  /** Render a result into container and wire its copy button with plain text. */
  function showResult(container, html, copyText) {
    container.innerHTML = html;
    var b = $('[data-copy-result]', container);
    if (b && copyText) b.addEventListener('click', function () { copy(copyText, 'Result copied'); });
  }
  function showError(container, msg) {
    container.innerHTML = notice('err', '<b>Cannot calculate.</b> ' + esc(msg));
  }

  /* ---------- Coordinate field ---------- */
  function coordField(key, label, opts) {
    opts = opts || {};
    return '<div class="coord-field" data-coord="' + key + '">' +
      '<div class="cf-head"><span class="label">' + esc(label) + '</span>' +
      (opts.noGps ? '' : '<button type="button" class="chip" data-act="gps">' + icon('i-gps') + 'GPS</button>') +
      '<button type="button" class="chip" data-act="map">' + icon('i-map') + 'Map</button>' +
      '<button type="button" class="chip" data-act="pick">' + icon('i-star') + (opts.ports ? 'Saved / Ports' : 'Saved') + '</button></div>' +
      '<div class="row">' +
      '<label class="field"><span>Latitude</span><input name="' + key + '-lat" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="06° 06.25′ S or −6.104"><small class="hint"></small></label>' +
      '<label class="field"><span>Longitude</span><input name="' + key + '-lon" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="106° 52.8′ E or 106.88"><small class="hint"></small></label>' +
      '</div></div>';
  }

  function bindCoord(root, key, opts) {
    opts = opts || {};
    var box = $('[data-coord="' + key + '"]', root);
    var latIn = $('input[name="' + key + '-lat"]', box), lonIn = $('input[name="' + key + '-lon"]', box);
    function hint(input, axis) {
      var h = input.parentNode.querySelector('.hint');
      var v = input.value.trim();
      input.classList.remove('invalid'); h.className = 'hint'; h.textContent = '';
      if (!v) return null;
      var r = C.coords.parse(v, axis);
      if (!r.ok) { h.textContent = r.error; h.classList.add('err'); return null; }
      var fmt = S('coordFormat');
      var alt = fmt === 'DD' ? C.coords.formatDDM(r.value, axis) : C.coords.formatDD(r.value, axis, 5);
      h.textContent = '= ' + C.coords.format(r.value, axis, fmt) + '  ·  ' + alt;
      return r.value;
    }
    latIn.addEventListener('input', function () { hint(latIn, 'lat'); if (opts.onChange) opts.onChange(); });
    lonIn.addEventListener('input', function () { hint(lonIn, 'lon'); if (opts.onChange) opts.onChange(); });

    var gpsBtn = $('[data-act="gps"]', box);
    if (gpsBtn) gpsBtn.addEventListener('click', function () {
      gpsBtn.disabled = true; var old = gpsBtn.innerHTML; gpsBtn.innerHTML = icon('i-gps') + 'Locating…';
      MEIKO.gps.getPosition().then(function (p) {
        api.set(p.lat, p.lon);
        toast('Position set' + (p.source === 'external' ? ' from external GPS' : '') + (p.accuracy != null ? ' · accuracy ±' + Math.round(p.accuracy) + ' m' : ''));
        if (opts.onChange) opts.onChange();
      }, function (err) {
        sheet({ title: 'Location unavailable', html: notice('err', esc(err.message)) + '<p class="small muted mt-12">You can type the coordinates manually or pick a saved position instead.</p><div class="actions"><button class="btn btn-ghost" data-close data-lh>' + icon('i-info') + 'How to allow location</button></div>', onMount: function (body) { $('[data-lh]', body).addEventListener('click', function () { setTimeout(MEIKO.app.showLocationHelp, 0); }); } });
      }).then(function () { gpsBtn.disabled = false; gpsBtn.innerHTML = old; });
    });
    $('[data-act="map"]', box).addEventListener('click', function () {
      var cur = api.isEmpty() ? null : api.get();
      MEIKO.map.pick({ lat: cur && cur.ok ? cur.lat : null, lon: cur && cur.ok ? cur.lon : null, title: 'Pick on map' }, function (p) {
        api.set(p.lat, p.lon); toast('Position set from map'); if (opts.onChange) opts.onChange();
      });
    });
    $('[data-act="pick"]', box).addEventListener('click', function () {
      pickLocation({ ports: opts.ports }, function (loc) { api.set(loc.lat, loc.lon); if (opts.onChange) opts.onChange(); });
    });

    var api = {
      get: function () {
        var lat = C.coords.parse(latIn.value, 'lat'), lon = C.coords.parse(lonIn.value, 'lon');
        latIn.classList.toggle('invalid', !lat.ok); lonIn.classList.toggle('invalid', !lon.ok);
        if (!lat.ok) return { ok: false, error: 'Latitude: ' + lat.error };
        if (!lon.ok) return { ok: false, error: 'Longitude: ' + lon.error };
        return { ok: true, lat: lat.value, lon: lon.value };
      },
      set: function (lat, lon) {
        latIn.value = C.coords.format(lat, 'lat', S('coordFormat') === 'DD' ? 'DD' : S('coordFormat'));
        lonIn.value = C.coords.format(lon, 'lon', S('coordFormat') === 'DD' ? 'DD' : S('coordFormat'));
        if (S('coordFormat') === 'DD') { latIn.value = lat.toFixed(6); lonIn.value = lon.toFixed(6); }
        hint(latIn, 'lat'); hint(lonIn, 'lon');
        latIn.dispatchEvent(new Event('change', { bubbles: true }));
      },
      clear: function () { latIn.value = ''; lonIn.value = ''; hint(latIn, 'lat'); hint(lonIn, 'lon'); },
      refreshHints: function () { hint(latIn, 'lat'); hint(lonIn, 'lon'); },
      isEmpty: function () { return !latIn.value.trim() && !lonIn.value.trim(); }
    };
    return api;
  }

  /** Sheet listing saved locations (and optionally sample ports). */
  function pickLocation(opts, onPick) {
    var saved = MEIKO.storage.locations.all();
    var ports = opts.ports ? MeikoData.ports.all() : [];
    var html = '<div class="search" style="margin-top:0">' + icon('i-search') + '<input type="search" placeholder="Search saved places' + (opts.ports ? ' and ports' : '') + '" data-q></div><div data-list></div>';
    sheet({
      title: 'Choose a position', html: html, onMount: function (body, close) {
        var list = $('[data-list]', body), q = $('[data-q]', body);
        function render() {
          var term = q.value.trim().toLowerCase();
          var s = saved.filter(function (l) { return !term || l.name.toLowerCase().indexOf(term) !== -1; });
          var p = opts.ports ? MeikoData.ports.search(term) : [];
          var out = '';
          out += '<div class="section-title" style="margin-top:14px">' + icon('i-star') + 'Saved positions</div>';
          if (!s.length) out += '<p class="small muted">' + (saved.length ? 'No match.' : 'No saved positions yet. Save one from Position & GPS or Settings.') + '</p>';
          else out += '<ul class="list">' + s.map(function (l) {
            return '<li><div class="grow"><b>' + esc(l.name) + '</b><small>' + esc(coordPair(l.lat, l.lon)) + '</small></div><button class="btn btn-ghost btn-sm" data-pick-s="' + l.id + '">Use</button></li>';
          }).join('') + '</ul>';
          if (opts.ports) {
            out += '<div class="section-title">' + icon('i-anchor') + 'Ports <span class="badge warn">sample · unverified</span></div>';
            out += p.length ? '<ul class="list">' + p.map(function (pt) {
              return '<li><div class="grow"><b>' + esc(pt.name) + '</b><small>' + esc(pt.city) + ' · ' + esc(coordPair(pt.lat, pt.lon)) + '</small></div><button class="btn btn-ghost btn-sm" data-pick-p="' + pt.id + '">Use</button></li>';
            }).join('') + '</ul>' : '<p class="small muted">No match.</p>';
          }
          list.innerHTML = out;
        }
        q.addEventListener('input', render); render();
        list.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          var loc = b.dataset.pickS ? saved.filter(function (l) { return l.id === b.dataset.pickS; })[0] : MeikoData.ports.byId(b.dataset.pickP);
          if (loc) { onPick(loc); close(); }
        });
      }
    });
  }

  /** Persist and restore named form inputs between visits (per tool). */
  function persist(form, key) {
    var stored = MEIKO.storage.get('form:' + key, {});
    $$('input[name], select[name]', form).forEach(function (el) {
      if (el.dataset.noPersist != null) return;
      if (stored[el.name] != null && el.type !== 'checkbox') el.value = stored[el.name];
      if (el.type === 'checkbox' && stored[el.name] != null) el.checked = stored[el.name];
    });
    $$('input[name]', form).forEach(function (el) { if (el.value) el.dispatchEvent(new Event('input')); });
    var save = function () {
      var data = {};
      $$('input[name], select[name]', form).forEach(function (el) {
        if (el.dataset.noPersist != null) return;
        data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      });
      MEIKO.storage.set('form:' + key, data);
    };
    form.addEventListener('input', save); form.addEventListener('change', save);
    return { clear: function () { MEIKO.storage.remove('form:' + key); } };
  }

  function readNum(input) {
    var raw = String(input.value).trim().replace(',', '.');
    if (raw === '') return { ok: false, error: 'required' };
    var v = Number(raw);
    if (!isFinite(v)) return { ok: false, error: 'not a number' };
    return { ok: true, value: v };
  }

  MEIKO.ui = {
    esc: esc, icon: icon, $: $, $$: $$, toast: toast, copy: copy, sheet: sheet,
    num: num, bearing: bearing, time: time, date: date, dateYMD: dateYMD, tzLabel: tzLabel, tzOptions: tzOptions,
    todayISO: todayISO, nowLocalISO: nowLocalISO, parseISODate: parseISODate, parseLocalDateTime: parseLocalDateTime,
    coord: coord, coordPair: coordPair, minutesToHMS: minutesToHMS, decl: decl,
    DIST_UNITS: DIST_UNITS, SPEED_UNITS: SPEED_UNITS, TIME_UNITS: TIME_UNITS, options: options,
    pageHead: pageHead, empty: empty, kv: kv, notice: notice, help: help, resultCard: resultCard, big: big,
    disclaimer: disclaimer, showResult: showResult, showError: showError, NAV_DISCLAIMER: NAV_DISCLAIMER,
    coordField: coordField, bindCoord: bindCoord, pickLocation: pickLocation, persist: persist, readNum: readNum
  };
})();
