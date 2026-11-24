/*
 * MEIKO — Stars: sky chart, star-photo identification (offline plate solving) and star sight reduction.
 * Core: js/core/celestial.js (sidereal time, precession, alt/az, corrections, least-squares fix),
 *       js/core/platesolve.js (star detection and matching), data: js/data/stars-data.js.
 */
(function () {
  'use strict';
  var C = window.MeikoCore, ui = MEIKO.ui, icon = ui.icon, esc = ui.esc;
  var CEL = C.celestial, PS = C.platesolve;
  var S = function (k) { return MEIKO.settings.get(k); };
  var rad = Math.PI / 180;

  /* ---------------- catalogue ---------------- */
  var CAT = null, BYID = null, NAVLIST = null;
  function cat() {
    if (CAT) return CAT;
    var D = MeikoData.stars;
    BYID = {};
    CAT = D.STARS.map(function (s) {
      var n = D.NAMES[s[0]] || null;
      var o = { id: s[0], ra: s[1], dec: s[2], mag: s[3], proper: n ? n[0] : '', bayer: n ? n[1] : '', con: n ? n[2] : '', nav: D.NAV[s[0]] || '' };
      BYID[o.id] = o;
      return o;
    });
    NAVLIST = Object.keys(D.NAV).map(function (id) { return BYID[id]; }).filter(Boolean).sort(function (a, b) { return a.nav.localeCompare(b.nav); });
    return CAT;
  }
  function starName(s) { return s.nav || s.proper || ((s.bayer ? s.bayer + ' ' : '') + (s.con || '')).trim() || ('HIP ' + s.id); }
  // Traditional Indonesian names for a few well-known figures (shown beside the IAU name).
  var LOCAL = { Cru: 'Gubuk Penceng', Ori: 'Waluku', UMa: 'Biduk', Sco: 'Kalajengking' };
  function conName(abbr) {
    var c = MeikoData.stars.CONS[abbr]; if (!c) return abbr;
    return c[0] + (LOCAL[abbr] ? ' · ' + LOCAL[abbr] : '');
  }
  var INDEX = {};
  function index(kind) {
    if (!INDEX[kind]) INDEX[kind] = kind === 'local' ? PS.buildIndex(cat(), { indexMag: 4.2, maxSideDeg: 20 }) : PS.buildIndex(cat(), { indexMag: 3.3, maxSideDeg: 70 });
    return INDEX[kind];
  }

  /* ---------------- small helpers ---------------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /** "YYYY-MM-DDTHH:MM[:SS]" in UTC offset tz (hours) → UTC ms */
  function parseDT(s, tz) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(s || ''));
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - tz * 3600000;
  }
  function toLocalInput(ms, tz) {
    var d = new Date(ms + tz * 3600000);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) + 'T' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds());
  }
  /** Degrees from "35 12.4", "35°12.4'", "35.2", "-0 12" */
  function parseDM(s) {
    s = String(s || '').trim().replace(/,/g, '.').replace(/[°'′"]/g, ' ').trim();
    if (!s) return null;
    var neg = /^[-−]/.test(s); s = s.replace(/^[-−+]/, '').trim();
    var p = s.split(/\s+/);
    if (p.length > 2 || p.some(function (x) { return !/^\d+(\.\d+)?$/.test(x); })) return null;
    var v = +p[0] + (p[1] ? +p[1] / 60 : 0);
    if (p[1] && +p[1] >= 60) return null;
    return neg ? -v : v;
  }
  function fmtDM(v, plus) {
    var sg = v < 0 ? '−' : (plus ? '+' : ''), a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60;
    if (m >= 59.95) { d++; m = 0; }
    return sg + d + '° ' + (m < 10 ? '0' : '') + m.toFixed(1) + '′';
  }
  function compass(az) { return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(CEL.norm360(az) / 22.5) % 16]; }
  function z3(az) { var a = Math.round(CEL.norm360(az)) % 360; return (a < 10 ? '00' : a < 100 ? '0' : '') + a + '°'; }
  function roughPair(lat, lon) { return C.coords.formatDDM(lat, 'lat', 0) + '  ' + C.coords.formatDDM(lon, 'lon', 0); }
  function recentFix() { var f = MEIKO.gps.last(); return f && isFinite(f.lat) ? f : null; }
  function tzBlock(name) { return '<label class="field"><span>Time zone (UTC offset)</span><select name="' + (name || 'tz') + '">' + ui.tzOptions(S('tz')) + '</select></label>'; }
  var DISC_STARS = 'Star positions are computed (Hipparcos catalogue, precessed to date; nutation and aberration ignored, ~1′). Planets and the Moon are not identified. A position from stars is a backup estimate — confirm with every other means available.';

  /* ================================================================
   *  1. Sky chart
   * ================================================================ */
  function skySVG(lat, lon, ms, opts) {
    opts = opts || {};
    var D = MeikoData.stars, R = 262, cx = 300, cy = 300;
    function P(alt, az) { var r = R * (90 - alt) / 90; return [cx - r * Math.sin(az * rad), cy - r * Math.cos(az * rad)]; }
    var out = ['<svg class="skychart" viewBox="0 0 600 600" role="img" aria-label="Sky chart"><defs><clipPath id="skyclip"><circle cx="300" cy="300" r="' + R + '"/></clipPath></defs>',
      '<circle cx="300" cy="300" r="' + R + '" class="sky-bg"/>'];
    out.push('<g clip-path="url(#skyclip)">');
    [30, 60].forEach(function (a) { out.push('<circle cx="300" cy="300" r="' + (R * (90 - a) / 90) + '" class="sky-grid"/>'); });
    // constellation lines
    var lines = [];
    Object.keys(D.LINES).forEach(function (abbr) {
      D.LINES[abbr].forEach(function (seg) {
        var pts = seg.map(function (p) { return CEL.altaz(p[0], p[1], lat, lon, ms); });
        for (var i = 1; i < pts.length; i++) {
          if (pts[i - 1].alt < -5 && pts[i].alt < -5) continue;
          var a = P(Math.max(-10, pts[i - 1].alt), pts[i - 1].az), b = P(Math.max(-10, pts[i].alt), pts[i].az);
          lines.push('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1));
        }
      });
    });
    out.push('<path class="sky-lines" d="' + lines.join('') + '"/>');
    // stars
    var labels = [];
    cat().forEach(function (s) {
      if (s.mag > 4.6) return;
      var h = CEL.altaz(s.ra, s.dec, lat, lon, ms); if (h.alt < 0) return;
      var p = P(h.alt, h.az), r = Math.max(0.8, 4.2 - 0.75 * s.mag);
      out.push('<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(1) + '" class="sky-star' + (s.nav ? ' nav' : '') + '"/>');
      if (s.nav && (s.mag < 1.6 || s.nav === 'Polaris' || opts.allNames)) labels.push('<text x="' + (p[0] + r + 3).toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" class="sky-name">' + esc(s.nav) + '</text>');
    });
    out.push(labels.join(''));
    // constellation names
    Object.keys(D.CONS).forEach(function (abbr) {
      var c = D.CONS[abbr]; if (c[3] > 2 && !LOCAL[abbr]) return;
      var h = CEL.altaz(c[1], c[2], lat, lon, ms); if (h.alt < 8) return;
      var p = P(h.alt, h.az);
      out.push('<text x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '" class="sky-con" text-anchor="middle">' + esc((LOCAL[abbr] ? LOCAL[abbr] : c[0]).toUpperCase()) + '</text>');
    });
    out.push('</g>');
    out.push('<circle cx="300" cy="300" r="' + R + '" class="sky-rim"/>');
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (k) { var p = P(-8, k[1]); out.push('<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 6).toFixed(1) + '" class="sky-card" text-anchor="middle">' + k[0] + '</text>'); });
    out.push('</svg>');
    return out.join('');
  }
  function navTable(lat, lon, ms) {
    cat();
    var rows = NAVLIST.map(function (s) { var h = CEL.altaz(s.ra, s.dec, lat, lon, ms); return { s: s, alt: h.alt, az: h.az }; })
      .filter(function (r) { return r.alt > 8; }).sort(function (a, b) { return a.az - b.az; });
    if (!rows.length) return '';
    return '<div class="table-wrap"><table class="startable"><thead><tr><th>Star</th><th>Altitude</th><th>Bearing</th></tr></thead><tbody>' +
      rows.map(function (r) { var good = r.alt >= 15 && r.alt <= 70; return '<tr' + (good ? '' : ' class="dim"') + '><td>' + esc(r.s.nav) + '<br><small>' + esc(conName(r.s.con).split(' · ')[0]) + ' · mag ' + r.s.mag.toFixed(1) + '</small></td><td>' + fmtDM(r.alt) + '</td><td>' + z3(r.az) + ' <small>' + compass(r.az) + '</small></td></tr>'; }).join('') +
      '</tbody></table></div>';
  }
  function poleHints(lat, lon, ms) {
    var out = [];
    var pol = BYID && NAVLIST.filter(function (s) { return s.nav === 'Polaris'; })[0];
    if (pol) { var h = CEL.altaz(pol.ra, pol.dec, lat, lon, ms); if (h.alt > 1) out.push('<b>Polaris</b> is up at ' + fmtDM(h.alt) + ', bearing ' + z3(h.az) + ' — the point on the horizon straight below it is within about 1° of <b>true north</b>.'); }
    var acrux = cat().filter(function (s) { return s.nav === 'Acrux'; })[0], gacrux = cat().filter(function (s) { return s.nav === 'Gacrux'; })[0];
    if (acrux && gacrux) {
      var a = CEL.altaz(acrux.ra, acrux.dec, lat, lon, ms), g = CEL.altaz(gacrux.ra, gacrux.dec, lat, lon, ms);
      if (a.alt > 3 && g.alt > 3) out.push('<b>Gubuk Penceng (Crux)</b> is up, toward ' + z3(a.az) + '. Extend the long bar from Gacrux through Acrux about 4½ times its length to reach the south celestial pole; straight below that is <b>true south</b>.');
    }
    return out.length ? ui.notice('', out.join('<br>'), 'i-compass-rose') : '';
  }

  MEIKO.features.register({
    id: 'skychart', cat: 'astronomy', order: 2, icon: 'i-star', title: 'Sky Chart · Constellations',
    desc: 'Stars and constellations overhead for any time and place', keywords: 'sky chart constellation rasi bintang stars polaris southern cross gubuk penceng planisphere navigational stars',
    lead: 'The sky above you for a time and position: constellations, the navigational stars with their altitude and bearing, and which way is north or south.',
    render: function (view) {
      view.innerHTML = ui.pageHead(this) + '<div class="tool-grid"><form class="card card-pad form-gap" novalidate>' + ui.coordField('p', 'Position') +
        '<div class="row"><label class="field"><span>Local date & time</span><input type="datetime-local" step="1" name="dt" data-no-persist></label>' + tzBlock() + '</div>' +
        '<div class="flex"><button type="button" class="chip" data-now>' + icon('i-clock') + 'Now</button></div>' +
        '<div class="actions"><button class="btn btn-primary" type="submit">' + icon('i-check') + 'Show sky</button></div></form>' +
        '<div class="results-col" data-out>' + ui.empty('i-star', 'No chart yet', 'Enter a position (or use GPS / last fix) and the time.') + '</div></div>' +
        ui.help('How to read the chart', '<p>The circle is the whole sky: the centre is straight overhead (zenith), the edge is the horizon. Hold the phone above your head with <b>N</b> toward north — east is on the left, as when looking up. Rings mark 30° and 60° altitude.</p><p>Navigational stars between about 15° and 70° altitude are the best for sights (shown bold in the table). Bright planets and the Moon are <b>not</b> drawn, so a very bright "star" that is missing from the chart is probably a planet.</p>') +
        ui.disclaimer(DISC_STARS);
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var p = ui.bindCoord(form, 'p', {});
      ui.persist(form, 'skychart');
      var dt = ui.$('[name=dt]', form), tzEl = ui.$('[name=tz]', form);
      function now() { dt.value = toLocalInput(Date.now(), +tzEl.value); }
      now();
      var f = recentFix(); if (p.isEmpty() && f) p.set(f.lat, f.lon);
      ui.$('[data-now]', form).addEventListener('click', function () { now(); draw(); });
      form.addEventListener('submit', function (e) { e.preventDefault(); draw(); });
      tzEl.addEventListener('change', now);
      function draw(silent) {
        var c = p.get(); if (!c.ok) { if (!silent) ui.showError(out, c.error || 'Enter your position.'); return; }
        var ms = parseDT(dt.value, +tzEl.value); if (ms == null) { if (!silent) ui.showError(out, 'Enter the date and time.'); return; }
        out.innerHTML = ui.resultCard('Sky · ' + ui.time(ms, +tzEl.value) + ' ' + ui.tzLabel(+tzEl.value), '<div class="sky-wrap">' + skySVG(c.lat, c.lon, ms) + '</div>' +
          '<div class="card-pad form-gap">' + poleHints(c.lat, c.lon, ms) + '<h4 class="mini-h">Navigational stars above the horizon</h4>' + navTable(c.lat, c.lon, ms) + '</div>',
          { icon: 'i-star', foot: 'Position ' + esc(ui.coordPair(c.lat, c.lon)) + '. Stars to magnitude 4.6, 88 IAU constellations.' });
      }
      draw(true);
    }
  });

  /* ================================================================
   *  2. Star photo → stars, constellations, direction, position
   * ================================================================ */
  /** EXIF DateTimeOriginal (+ OffsetTimeOriginal) from a JPEG ArrayBuffer. */
  function exifDate(buf) {
    try {
      var v = new DataView(buf), n = v.byteLength;
      if (v.getUint16(0) !== 0xFFD8) return null;
      var o = 2;
      while (o + 4 < n) {
        var mk = v.getUint16(o), len = v.getUint16(o + 2);
        if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) {
          var t = o + 10, le = v.getUint16(t) === 0x4949;
          var u16 = function (p) { return v.getUint16(t + p, le); }, u32 = function (p) { return v.getUint32(t + p, le); };
          var str = function (p, l) { var s = ''; for (var i = 0; i < l; i++) { var ch = v.getUint8(t + p + i); if (!ch) break; s += String.fromCharCode(ch); } return s; };
          var readIfd = function (off, want) {
            var cnt = u16(off), res = {};
            for (var i = 0; i < cnt; i++) {
              var e = off + 2 + i * 12, tag = u16(e);
              if (want.indexOf(tag) < 0) continue;
              var type = u16(e + 2), count = u32(e + 4);
              res[tag] = type === 2 ? str(count > 4 ? u32(e + 8) : e + 8, count) : u32(e + 8);
            }
            return res;
          };
          var i0 = readIfd(u32(4), [0x8769, 0x0132]);
          var ex = i0[0x8769] ? readIfd(i0[0x8769], [0x9003, 0x9011]) : {};
          var dto = ex[0x9003] || i0[0x0132];
          if (!dto) return null;
          var m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(dto); if (!m) return null;
          var off = ex[0x9011] && /^([+-])(\d{2}):(\d{2})/.exec(ex[0x9011]);
          return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +m[6], offsetH: off ? (off[1] === '-' ? -1 : 1) * (+off[2] + off[3] / 60) : null };
        }
        if ((mk & 0xFF00) !== 0xFF00) break;
        o += 2 + len;
      }
    } catch (e) {}
    return null;
  }
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { res({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('This file could not be opened as a picture.')); };
      img.src = url;
    });
  }
  /** Solve a photo: canvas pixels → detections → plate solution (tries a local and a wide index). */
  function solveCanvas(cv) {
    var w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
    for (var i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.3 * d[j] + 0.59 * d[j + 1] + 0.11 * d[j + 2];
    var det = PS.detect(g, w, h, { max: 60 });
    var r = { ok: false, reason: 'few', found: det.stars.length };
    if (det.stars.length >= 5) {
      r = PS.solve(det.stars, w, h, cat(), { index: index('local'), K: 20, budgetMs: 5000 });
      if (!r.ok) r = PS.solve(det.stars, w, h, cat(), { index: index('wide'), K: 14, budgetMs: 5000 });
    }
    r.dets = det.stars;
    return r;
  }
  /** Constellations whose stars were matched, with their identified stars. */
  function constellationsIn(sol) {
    var byCon = {};
    sol.matches.forEach(function (m) { var c = m.s.con; if (!c) return; (byCon[c] = byCon[c] || []).push(m.s); });
    // also figures whose stick lines mostly fall inside the frame
    var D = MeikoData.stars;
    Object.keys(D.LINES).forEach(function (abbr) {
      var inside = 0, tot = 0;
      D.LINES[abbr].forEach(function (seg) { seg.forEach(function (p) { tot++; var q = PS.project(sol, p[0], p[1]); if (q && q.x >= 0 && q.y >= 0 && q.x <= sol.w && q.y <= sol.h) inside++; }); });
      if (tot && inside / tot >= 0.6 && !byCon[abbr]) byCon[abbr] = [];
    });
    return Object.keys(byCon).filter(function (k) { return byCon[k].length !== 1; }).map(function (k) { return { abbr: k, stars: byCon[k] }; }).sort(function (a, b) { return b.stars.length - a.stars.length; });
  }
  function drawOverlay(cv, img, sol, st) {
    var x = cv.getContext('2d'), w = cv.width, h = cv.height, lw = Math.max(1.5, w / 700);
    x.drawImage(img, 0, 0, w, h);
    if (sol && sol.ok) {
      var D = MeikoData.stars;
      x.lineWidth = lw; x.strokeStyle = 'rgba(120,190,255,.85)';
      Object.keys(D.LINES).forEach(function (abbr) {
        D.LINES[abbr].forEach(function (seg) {
          for (var i = 1; i < seg.length; i++) {
            var a = PS.project(sol, seg[i - 1][0], seg[i - 1][1]), b = PS.project(sol, seg[i][0], seg[i][1]);
            if (!a || !b || Math.abs(a.x - b.x) > w * 1.5 || Math.abs(a.y - b.y) > h * 1.5) continue;
            x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
          }
        });
      });
      x.strokeStyle = '#ffd34d'; x.fillStyle = '#ffd34d'; x.font = '600 ' + Math.round(w / 55) + 'px system-ui, sans-serif';
      sol.matches.forEach(function (m) {
        x.beginPath(); x.arc(m.d.x, m.d.y, Math.max(5, w / 140), 0, 2 * Math.PI); x.stroke();
        if (m.s.nav || (m.s.proper && m.s.mag < 2.6)) x.fillText(starName(m.s), m.d.x + w / 110, m.d.y - w / 140);
      });
      x.fillStyle = 'rgba(150,205,255,.95)'; x.font = '700 ' + Math.round(w / 42) + 'px system-ui, sans-serif'; x.textAlign = 'center';
      st.cons.forEach(function (c) {
        var lab = D.CONS[c.abbr]; if (!lab) return;
        var q = PS.project(sol, lab[1], lab[2]);
        if (!q || q.x < 0 || q.y < 0 || q.x > w || q.y > h) {
          if (!c.stars.length) return;
          q = { x: 0, y: 0 }; c.stars.forEach(function (s) { var p = PS.project(sol, s.ra, s.dec); q.x += p.x / c.stars.length; q.y += p.y / c.stars.length; });
          q.y += w / 30;
        }
        x.fillText((LOCAL[c.abbr] || lab[0]).toUpperCase(), q.x, q.y);
      });
      x.textAlign = 'left';
      // celestial poles: mark if inside, else an arrow at the edge pointing toward it
      [[90, 'N'], [-90, 'S']].forEach(function (pl) {
        var c = PS.mulT(sol.R, [0, 0, pl[0] > 0 ? 1 : -1]);
        var q = PS.project(sol, [0, 0, pl[0] > 0 ? 1 : -1]);
        x.strokeStyle = x.fillStyle = '#7dffb0'; x.lineWidth = lw * 1.4; x.font = '700 ' + Math.round(w / 45) + 'px system-ui, sans-serif';
        if (q && q.x >= 0 && q.y >= 0 && q.x <= w && q.y <= h) {
          var r0 = w / 60; x.beginPath(); x.moveTo(q.x - r0, q.y); x.lineTo(q.x + r0, q.y); x.moveTo(q.x, q.y - r0); x.lineTo(q.x, q.y + r0); x.stroke();
          x.fillText((pl[0] > 0 ? 'North' : 'South') + ' celestial pole', q.x + r0, q.y - r0);
        } else if (c[2] > -0.95) {
          var dx = c[0], dy = c[1], L = Math.sqrt(dx * dx + dy * dy); if (L < 1e-6) return;
          dx /= L; dy /= L;
          var t = Math.min(dx ? (dx > 0 ? (w * 0.46) / dx : (w * 0.46) / -dx) : 1e9, dy ? (dy > 0 ? (h * 0.44) / dy : (h * 0.44) / -dy) : 1e9);
          var ex = w / 2 + dx * t, ey = h / 2 + dy * t, al = w / 22;
          if (c[2] < 0.3) { x.globalAlpha = 0.85; }
          x.beginPath(); x.moveTo(ex - dx * al * 2, ey - dy * al * 2); x.lineTo(ex, ey); x.stroke();
          x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex - dx * al - dy * al * 0.5, ey - dy * al + dx * al * 0.5); x.lineTo(ex - dx * al + dy * al * 0.5, ey - dy * al - dx * al * 0.5); x.closePath(); x.fill();
          x.textAlign = dx > 0.3 ? 'right' : dx < -0.3 ? 'left' : 'center';
          x.fillText(pl[1] + ' pole', ex - dx * al * 2.6, ey - dy * al * 2.6 + (dy < 0 ? w / 40 : -w / 120));
          x.textAlign = 'left'; x.globalAlpha = 1;
        }
      });
    }
    // horizon marks
    if (st && st.hz && st.hz.length) {
      x.fillStyle = x.strokeStyle = '#ff6b6b'; x.lineWidth = lw * 1.6;
      st.hz.forEach(function (p) { x.beginPath(); x.arc(p.x, p.y, Math.max(4, w / 160), 0, 2 * Math.PI); x.fill(); });
      if (st.hz.length === 2) {
        var a = st.hz[0], b = st.hz[1], ddx = b.x - a.x, ddy = b.y - a.y;
        x.beginPath(); x.moveTo(a.x - ddx * 3, a.y - ddy * 3); x.lineTo(b.x + ddx * 3, b.y + ddy * 3); x.stroke();
      }
    }
  }
  /** Altitudes above the marked sea horizon → observed altitudes → least-squares fix. */
  function horizonFix(sol, hz, ms, heightM, ap) {
    var h1 = PS.pixVec(sol, hz[0].x, hz[0].y), h2 = PS.pixVec(sol, hz[1].x, hz[1].y);
    var n = PS.norm(PS.cross(h1, h2));
    var meanUp = 0; sol.matches.forEach(function (m) { meanUp += PS.dot(PS.pixVec(sol, m.d.x, m.d.y), n); });
    if (meanUp < 0) n = n.map(function (v) { return -v; });
    var sights = [];
    sol.matches.forEach(function (m) {
      var hs = Math.asin(Math.max(-1, Math.min(1, PS.dot(PS.pixVec(sol, m.d.x, m.d.y), n)))) / rad;
      if (hs < 4 || hs > 85) return;
      sights.push({ ra: m.s.ra, dec: m.s.dec, ms: ms, ho: CEL.observed(hs, { heightM: heightM }), hs: hs, name: starName(m.s) });
    });
    if (sights.length < 3) return { error: 'Fewer than 3 identified stars are at least 4° above the marked horizon.' };
    var azs = sights.map(function (s) { return CEL.altaz(s.ra, s.dec, ap ? ap.lat : 0, ap ? ap.lon : 0, ms).az; });
    var best = null;
    var starts = ap ? [ap] : [];
    for (var la = -60; la <= 60; la += 20) for (var lo = -180; lo < 180; lo += 30) starts.push({ lat: la, lon: lo });
    starts.forEach(function (s0) {
      var r = CEL.fix(sights, s0);
      if (r.error || r.rmsNM == null) return;
      if (!best || r.rmsNM < best.rmsNM - 0.01) best = r;
    });
    if (!best) return { error: 'The star altitudes did not give a position. The identified stars may be too close together in bearing.' };
    // spread in azimuth of the stars used (geometry)
    var z = best.lops.map(function (l) { return l.zn; }).sort(function (a, b) { return a - b; }), gap = 0;
    for (var i = 0; i < z.length; i++) gap = Math.max(gap, (i ? z[i] - z[i - 1] : z[0] + 360 - z[z.length - 1]));
    best.spread = 360 - gap; best.sights = sights; best.horizonTilt = Math.atan2(hz[1].y - hz[0].y, hz[1].x - hz[0].x) / rad;
    return best;
  }

  MEIKO.features.register({
    id: 'starphoto', cat: 'astronomy', order: 1, icon: 'i-star', title: 'Star Photo · Identify & Position',
    desc: 'Name the stars and constellations in a night-sky photo, find north/south, estimate position', keywords: 'star photo plate solve constellation rasi bintang identify gps lost backup celestial position direction north south',
    lead: 'Take or choose a photo of the night sky. MEIKO finds the stars, matches them to its offline catalogue and shows the constellations, which way the camera was pointing and where the celestial pole is. If the sea horizon is in the picture, it can also estimate your position.',
    render: function (view) {
      view.innerHTML = ui.pageHead(this) +
        '<div class="card card-pad form-gap">' +
        '<label class="btn btn-primary file-btn">' + icon('i-plus') + 'Take or choose a sky photo<input type="file" accept="image/*" data-file hidden></label>' +
        ui.notice('', 'Works offline. For best results: night mode or a few-second exposure, phone held steady or braced, no zoom, at least 8–10 stars visible. For a position, include the <b>sea horizon</b> along the bottom of the picture.', 'i-info') +
        '<div class="row"><label class="field"><span>Photo time (local)</span><input type="datetime-local" step="1" name="dt"><small class="hint" data-dt-src></small></label>' + tzBlock() + '</div>' +
        ui.coordField('p', 'Approximate position (last fix or DR — for bearings; optional)') +
        '<div class="row"><label class="field"><span>Height of eye (m)</span><input name="hoe" inputmode="decimal" placeholder="e.g. 3"></label><span></span></div>' +
        '</div>' +
        '<div data-photo></div>' +
        ui.help('How it works & how accurate it is', '<p><b>Identification.</b> MEIKO finds point-like bright spots in the picture, then compares the shapes of triangles between the brightest ones with triangles between catalogue stars (shape does not depend on zoom or rotation). A match is accepted only if many other catalogue stars then land on stars in the photo, far more than chance would give. If a match is uncertain, MEIKO says so instead of guessing. Planets, the Moon, aircraft and satellites are not in the catalogue and are ignored.</p>' +
          '<p><b>Direction.</b> The celestial poles are fixed in the sky. The horizon point directly below the north celestial pole (near Polaris) is true north; below the south celestial pole (found from Gubuk Penceng / Crux) is true south. This needs no time or position. With the time and an approximate position MEIKO also gives the camera\'s compass bearing.</p>' +
          '<p><b>Position.</b> Marking the sea horizon turns every identified star into a sextant-like altitude, corrected for dip and refraction, and solved by least squares — the same method as a star fix. But a phone photo is far less precise than a sextant: one pixel is several minutes of arc and each minute is one nautical mile, and lens distortion and a tilted horizon line add more. Expect <b>tens of nautical miles</b> of error, more with few stars or a hazy horizon. It is a rough check when GPS is lost, not a navigational fix. Time matters too: a clock error of 1 minute moves the position 15′ of longitude.</p>') +
        ui.disclaimer(DISC_STARS);
      var form = view, holder = ui.$('[data-photo]', view);
      var p = ui.bindCoord(view, 'p', {});
      var dt = ui.$('[name=dt]', view), tzEl = ui.$('[name=tz]', view), hoe = ui.$('[name=hoe]', view), dtSrc = ui.$('[data-dt-src]', view);
      var stored = MEIKO.storage.get('starphoto:opts', {});
      if (stored.hoe) hoe.value = stored.hoe;
      if (stored.tz != null) tzEl.value = String(stored.tz);
      var f = recentFix(); if (f) p.set(f.lat, f.lon);
      dt.value = toLocalInput(Date.now(), +tzEl.value);
      function saveOpts() { MEIKO.storage.set('starphoto:opts', { hoe: hoe.value, tz: +tzEl.value }); }
      hoe.addEventListener('input', function () { saveOpts(); results(); }); tzEl.addEventListener('change', function () { saveOpts(); results(); });
      dt.addEventListener('change', results); var pageEl = view.firstElementChild; view.addEventListener('change', function (e) { if (pageEl && pageEl.isConnected && e.target.name && /^p-/.test(e.target.name)) results(); });
      var st = null; // { img, cv, sol, cons, hz:[], marking }

      ui.$('[data-file]', view).addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0]; if (!file) return;
        holder.innerHTML = '<div class="card card-pad">' + ui.notice('', '<b>Reading the stars…</b> This can take a few seconds on a phone.', 'i-clock') + '</div>';
        var bufP = file.slice(0, 256 * 1024).arrayBuffer ? file.slice(0, 256 * 1024).arrayBuffer() : Promise.resolve(null);
        Promise.all([loadImage(file), bufP.catch(function () { return null; })]).then(function (r) {
          var ex = r[1] ? exifDate(r[1]) : null, tz = +tzEl.value;
          if (ex) {
            var utc = Date.UTC(ex.y, ex.mo - 1, ex.d, ex.h, ex.mi, ex.s) - (ex.offsetH != null ? ex.offsetH : tz) * 3600000;
            dt.value = toLocalInput(utc, tz);
            dtSrc.textContent = ex.offsetH != null ? 'From the photo (camera clock, with its time zone).' : 'From the photo (camera clock). Check the time zone above matches the phone\'s.';
          } else if (file.lastModified) { dt.value = toLocalInput(file.lastModified, tz); dtSrc.textContent = 'From the file date. Check it is when the photo was taken.'; }
          var img = r[0].img, sc = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
          var cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          setTimeout(function () {
            var sol;
            try { sol = solveCanvas(cv); } catch (err) { sol = { ok: false, reason: 'error', msg: err.message, dets: [] }; }
            st = { img: img, cv: cv, sol: sol, hz: [], cons: sol.ok ? constellationsIn(sol) : [] };
            show();
          }, 40);
        }).catch(function (err) { holder.innerHTML = '<div class="card card-pad">' + ui.notice('err', esc(err.message), 'i-alert') + '</div>'; });
        e.target.value = '';
      });

      function show() {
        var sol = st.sol;
        holder.innerHTML = '<div class="card photo-card"><canvas class="photo-cv" data-cv></canvas>' +
          (sol.ok ? '<div class="photo-tools card-pad"><button type="button" class="btn btn-ghost" data-hz>' + icon('i-ruler') + 'Mark sea horizon</button><span class="hz-help" data-hz-help></span>' +
            '<div class="hz-nudge" data-nudge hidden><span>Fine-tune:</span><span>Left end <button type="button" class="chip" data-n="0,-1">▲</button><button type="button" class="chip" data-n="0,1">▼</button></span><span>Right end <button type="button" class="chip" data-n="1,-1">▲</button><button type="button" class="chip" data-n="1,1">▼</button></span></div></div>' : '') +
          '</div><div data-res class="form-gap"></div>';
        var cv = ui.$('[data-cv]', holder); cv.width = st.cv.width; cv.height = st.cv.height;
        st.view = cv;
        drawOverlay(cv, st.img, sol, st);
        if (sol.ok) {
          var hzBtn = ui.$('[data-hz]', holder), help = ui.$('[data-hz-help]', holder), nudge = ui.$('[data-nudge]', holder);
          hzBtn.addEventListener('click', function () { st.hz = []; st.marking = true; help.textContent = 'Tap the horizon near the LEFT edge of the photo…'; nudge.hidden = true; drawOverlay(cv, st.img, sol, st); results(); });
          cv.addEventListener('click', function (e) {
            if (!st.marking) return;
            var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
            st.hz.push({ x: x, y: y });
            if (st.hz.length === 1) help.textContent = '…now near the RIGHT edge.';
            else { st.marking = false; st.hz.sort(function (a, b) { return a.x - b.x; }); help.textContent = 'Horizon marked. Zoom the screen to check it, and fine-tune if needed.'; nudge.hidden = false; }
            drawOverlay(cv, st.img, sol, st); if (st.hz.length === 2) results();
          });
          ui.$$('[data-n]', holder).forEach(function (b) {
            b.addEventListener('click', function () { var a = b.dataset.n.split(','); if (st.hz.length === 2) { st.hz[+a[0]].y += +a[1]; drawOverlay(cv, st.img, sol, st); results(); } });
          });
        }
        results();
      }

      function results() {
        if (!st) return;
        var res = ui.$('[data-res]', holder); if (!res) return;
        var sol = st.sol;
        if (!sol.ok) {
          var why = sol.reason === 'few' ? 'Only <b>' + (sol.found || 0) + '</b> star-like points were found — at least 5, ideally 10 or more, are needed.' :
            sol.reason === 'error' ? esc(sol.msg || 'Something went wrong.') : 'Found ' + (sol.found || 0) + ' star-like points, but they could not be matched to the catalogue with confidence, so MEIKO gives no answer rather than a possibly wrong one.';
          res.innerHTML = ui.resultCard('Stars not identified', '<div class="card-pad form-gap">' + ui.notice('warn', why, 'i-alert') +
            '<p class="muted small">Try: night mode or a longer exposure, brace the phone, no zoom, avoid lights on deck and the Moon, more open sky. Wide (0.5×) lenses also work. Very bright points that are not stars (planets, aircraft) do not count.</p></div>', { icon: 'i-star' });
          return;
        }
        var tz = +tzEl.value, ms = parseDT(dt.value, tz), c = p.isEmpty() ? null : p.get(), pos = c && c.ok ? c : null;
        var named = sol.matches.filter(function (m) { return m.s.nav || m.s.proper; }).sort(function (a, b) { return a.s.mag - b.s.mag; });
        var html = '';
        // constellations
        html += ui.resultCard('Constellations in the photo', '<div class="card-pad form-gap"><div class="con-list">' + st.cons.map(function (cn) {
          return '<div class="con-item"><b>' + esc(conName(cn.abbr)) + '</b>' + (cn.stars.length ? '<small>' + cn.stars.length + ' star' + (cn.stars.length > 1 ? 's' : '') + ' matched' + (cn.stars.some(function (s) { return s.proper || s.nav; }) ? ': ' + esc(cn.stars.filter(function (s) { return s.proper || s.nav; }).map(starName).slice(0, 4).join(', ')) : '') + '</small>' : '<small>in frame</small>') + '</div>';
        }).join('') + '</div>' +
          (named.length ? '<p class="small"><b>Named stars:</b> ' + esc(named.map(function (m) { return starName(m.s); }).slice(0, 14).join(', ')) + '</p>' : '') + '</div>',
          { icon: 'i-star', badge: '<span class="badge ok">' + sol.matches.length + ' stars matched</span>', foot: 'Field of view ' + sol.fovX.toFixed(0) + '° × ' + sol.fovY.toFixed(0) + '°, fit ' + sol.rmsPx.toFixed(1) + ' px, solved in ' + (sol.ms / 1000).toFixed(1) + ' s. Photo centre RA ' + (sol.center.ra / 15).toFixed(2) + 'h Dec ' + sol.center.dec.toFixed(1) + '°.' });
        // direction
        var dir = [];
        var npc = PS.mulT(sol.R, [0, 0, 1]), spc = PS.mulT(sol.R, [0, 0, -1]);
        var inFrame = function (q) { return q && q.x >= 0 && q.y >= 0 && q.x <= sol.w && q.y <= sol.h; };
        if (inFrame(PS.project(sol, [0, 0, 1]))) dir.push('The <b>north celestial pole</b> is in the picture (green cross). Straight below it on the horizon is <b>true north</b>.');
        else if (inFrame(PS.project(sol, [0, 0, -1]))) dir.push('The <b>south celestial pole</b> is in the picture (green cross). Straight below it on the horizon is <b>true south</b>.');
        else dir.push('The green arrow at the edge points across the sky toward the ' + (npc[2] > spc[2] ? 'north' : 'south') + ' celestial pole. The horizon point below that pole is true ' + (npc[2] > spc[2] ? 'north' : 'south') + '.');
        var kv = [];
        if (ms != null && pos) {
          var cc = CEL.altaz(sol.center.ra, sol.center.dec, pos.lat, pos.lon, ms);
          kv.push(['Camera pointing (photo centre)', z3(cc.az) + ' T ' + compass(cc.az) + ', ' + cc.alt.toFixed(0) + '° up']);
          var top = PS.unproject(sol, sol.w / 2, 0), bot = PS.unproject(sol, sol.w / 2, sol.h);
          var tr = PS.radec(top), br = PS.radec(bot), ta = CEL.altaz(tr.ra, tr.dec, pos.lat, pos.lon, ms), ba = CEL.altaz(br.ra, br.dec, pos.lat, pos.lon, ms);
          kv.push(['Altitude, top → bottom edge', ta.alt.toFixed(0) + '° → ' + ba.alt.toFixed(0) + '°']);
          var vis = sol.matches.filter(function (m) { return m.s.nav; }).map(function (m) { var h = CEL.altaz(m.s.ra, m.s.dec, pos.lat, pos.lon, ms); return [m.s.nav, z3(h.az) + ' T, ' + fmtDM(h.alt)]; });
          kv = kv.concat(vis.slice(0, 6).map(function (v) { return ['Bearing / altitude of ' + v[0], v[1]]; }));
        } else dir.push('Enter the photo time and an approximate position to get the camera\'s compass bearing.');
        html += ui.resultCard('Direction', '<div class="card-pad form-gap">' + ui.notice('ok', dir.join(' '), 'i-compass-rose') + '</div>' + (kv.length ? ui.kv(kv) : ''),
          { icon: 'i-compass-rose', foot: kv.length ? 'Bearings use the photo time and the position above (an error of 1° in position changes them by about 1°).' : '' });
        // position
        if (st.hz.length === 2 && ms != null) {
          var hm = ui.readNum(hoe), heightM = hm.ok ? hm.value : 0;
          var fx = horizonFix(sol, st.hz, ms, heightM, pos);
          if (fx.error) html += ui.resultCard('Position from the stars', '<div class="card-pad">' + ui.notice('warn', esc(fx.error), 'i-alert') + '</div>', { icon: 'i-gps' });
          else {
            var pxArc = sol.fovX / sol.w * 60, errNM = Math.max(15, 3 * pxArc * 1.5 + fx.rmsNM);
            var rows = [['Stars used', fx.sights.length + ' (spread over ' + Math.round(fx.spread) + '° of bearing)'], ['Fit between stars (rms)', fx.rmsNM.toFixed(1) + ' NM'], ['1 pixel in this photo', '≈ ' + pxArc.toFixed(1) + '′ ≈ ' + pxArc.toFixed(1) + ' NM']];
            if (pos) rows.push(['Distance from the position above', (C.geo.haversine(pos.lat, pos.lon, fx.lat, fx.lon) / 1852).toFixed(0) + ' NM']);
            var warn = fx.spread < 60 ? 'The stars are bunched in one direction, so the position is weak along that direction. ' : '';
            html += ui.resultCard('Position from the stars', ui.big('Estimated position', esc(roughPair(fx.lat, fx.lon)), '', 'uncertainty at least ±' + Math.round(errNM) + ' NM') + ui.kv(rows) +
              '<div class="card-pad form-gap">' + ui.notice('warn', '<b>Rough estimate only.</b> ' + warn + 'A photo is much less precise than a sextant. Use it to check you are roughly where you think, and confirm with other means.', 'i-alert') +
              '<div class="flex"><button type="button" class="chip" data-copyfix>' + icon('i-copy') + 'Copy position</button></div></div>',
              { icon: 'i-gps', badge: '<span class="badge warn">rough</span>', foot: 'Altitudes above the marked horizon, corrected for dip (height of eye ' + heightM + ' m) and refraction, then a least-squares fix over all identified stars at ' + ui.time(ms, 0, { seconds: true, format: '24' }) + ' UTC.' });
            st.fix = fx;
          }
        } else if (ms != null) {
          html += ui.resultCard('Position from the stars', '<div class="card-pad">' + ui.notice('', 'If the <b>sea horizon</b> shows in the photo, tap <b>Mark sea horizon</b> above and tap it at the left and right. MEIKO then measures each star\'s altitude and estimates your position (roughly).', 'i-info') + '</div>', { icon: 'i-gps' });
        }
        res.innerHTML = html;
        var cp = ui.$('[data-copyfix]', res); if (cp) cp.addEventListener('click', function () { ui.copy(roughPair(st.fix.lat, st.fix.lon), 'Position'); });
      }
    }
  });

  /* ================================================================
   *  3. Star sight reduction (sextant)
   * ================================================================ */
  MEIKO.features.register({
    id: 'starsight', cat: 'astronomy', order: 3, icon: 'i-course', title: 'Star Sight Reduction · Fix',
    desc: 'Sextant altitudes of stars → lines of position and a fix', keywords: 'sight reduction celestial navigation sextant star fix intercept hc zn line of position lop marcq st hilaire polaris',
    lead: 'Enter sextant altitudes of two or more stars with the exact time of each sight. MEIKO computes Hc, Zn and the intercept for each, and the fix where the lines of position meet.',
    render: function (view) {
      cat();
      var opts = NAVLIST.map(function (s) { return '<option value="' + s.id + '">' + esc(s.nav) + '</option>'; }).join('');
      view.innerHTML = ui.pageHead(this) + '<div class="tool-grid"><form class="card card-pad form-gap" novalidate>' +
        ui.coordField('p', 'DR / assumed position') +
        '<div class="row"><label class="field"><span>Date of sights (local)</span><input type="date" name="date"></label>' + tzBlock() + '</div>' +
        '<div class="row"><label class="field"><span>Index error (′, + on the arc)</span><input name="ic" inputmode="decimal" placeholder="0"></label><label class="field"><span>Height of eye (m)</span><input name="hoe" inputmode="decimal" placeholder="e.g. 3"></label></div>' +
        '<div class="row"><label class="field"><span>Air temp (°C, optional)</span><input name="temp" inputmode="decimal" placeholder="10"></label><label class="field"><span>Pressure (hPa, optional)</span><input name="pres" inputmode="decimal" placeholder="1010"></label></div>' +
        '<h4 class="mini-h">Sights</h4><div data-rows class="form-gap"></div>' +
        '<div class="flex"><button type="button" class="chip" data-add>' + icon('i-plus') + 'Add sight</button></div>' +
        '<div class="actions"><button class="btn btn-primary" type="submit">' + icon('i-check') + 'Reduce & fix</button><button class="btn btn-ghost" type="button" data-reset>' + icon('i-reset') + 'Reset</button></div></form>' +
        '<div class="results-col" data-out>' + ui.empty('i-course', 'No sights yet', 'Enter two or more star sights, ideally 3 stars about 120° apart in bearing.') + '</div></div>' +
        ui.help('Method', '<span class="formula">Ho = Hs − IE − dip − R        dip = 1.76′ × √(height of eye, m)\nHc = asin(sin L·sin Dec + cos L·cos Dec·cos LHA)\nIntercept = Ho − Hc (toward Zn if positive)</span>' +
          '<p>GHA and declination of each star are computed from the Hipparcos catalogue (precessed to the date, GMST from IAU 1982), good to about 1′ — check against the Nautical Almanac when you have it. Refraction: Bennett, with temperature and pressure. The fix is the least-squares point of all lines of position (no running fix: enter sights taken within a few minutes, or advance the DR yourself).</p>' +
          '<p>Time each sight to the second: 4 seconds of time error = 1′ of longitude.</p>') +
        ui.disclaimer(DISC_STARS);
      var form = ui.$('form', view), out = ui.$('[data-out]', view), rowsEl = ui.$('[data-rows]', form);
      var p = ui.bindCoord(form, 'p', {});
      var store = ui.persist(form, 'starsight');
      var dateEl = ui.$('[name=date]', form), tzEl = ui.$('[name=tz]', form);
      if (!dateEl.value) dateEl.value = ui.todayISO(+tzEl.value);
      var f = recentFix(); if (p.isEmpty() && f) p.set(f.lat, f.lon);
      var saved = MEIKO.storage.get('starsight:rows', null) || [{}, {}, {}];
      function rowHTML(r, i) {
        return '<div class="sight-row" data-row><div class="row"><label class="field"><span>Star ' + (i + 1) + '</span><select name="star">' + opts + '</select></label>' +
          '<label class="field"><span>Sextant alt Hs (° ′)</span><input name="hs" placeholder="35 12.4" autocomplete="off"></label></div>' +
          '<div class="row"><label class="field"><span>Time (local, h:m:s)</span><input type="time" step="1" name="tm"></label><span class="sight-del"><button type="button" class="chip" data-del>' + icon('i-trash') + 'Remove</button></span></div></div>';
      }
      function build(list) {
        rowsEl.innerHTML = list.map(rowHTML).join('');
        ui.$$('[data-row]', rowsEl).forEach(function (el, i) {
          var r = list[i] || {};
          if (r.star) ui.$('[name=star]', el).value = r.star; else ui.$('[name=star]', el).selectedIndex = (i * 17) % NAVLIST.length;
          if (r.hs) ui.$('[name=hs]', el).value = r.hs; if (r.tm) ui.$('[name=tm]', el).value = r.tm;
          ui.$('[data-del]', el).addEventListener('click', function () { var l = readRows(); l.splice(i, 1); build(l); saveRows(); });
        });
      }
      function readRows() { return ui.$$('[data-row]', rowsEl).map(function (el) { return { star: ui.$('[name=star]', el).value, hs: ui.$('[name=hs]', el).value, tm: ui.$('[name=tm]', el).value }; }); }
      function saveRows() { MEIKO.storage.set('starsight:rows', readRows()); }
      build(saved);
      rowsEl.addEventListener('input', saveRows); rowsEl.addEventListener('change', saveRows);
      ui.$('[data-add]', form).addEventListener('click', function () { var l = readRows(); if (l.length >= 8) return; l.push({}); build(l); saveRows(); });
      ui.$('[data-reset]', form).addEventListener('click', function () { store.clear(); MEIKO.storage.remove('starsight:rows'); p.clear(); build([{}, {}, {}]); out.innerHTML = ui.empty('i-course', 'No sights yet', 'Enter two or more star sights.'); });
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });

      function num(name, def) { var r = ui.readNum(ui.$('[name=' + name + ']', form)); return r.ok ? r.value : def; }
      function calc() {
        var c = p.get(); if (!c.ok) { ui.showError(out, 'Enter the DR position (an estimate is fine).'); return; }
        var d = ui.parseISODate(dateEl.value); if (!d) { ui.showError(out, 'Enter the date of the sights.'); return; }
        var tz = +tzEl.value, ic = num('ic', 0), hm = num('hoe', 0), temp = num('temp', null), pres = num('pres', null);
        var sights = [], errs = [];
        readRows().forEach(function (r, i) {
          if (!r.hs && !r.tm) return;
          var hs = parseDM(r.hs), tm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(r.tm || '');
          if (hs == null || hs <= 0 || hs >= 90) { errs.push('Sight ' + (i + 1) + ': enter Hs like 35 12.4 (degrees and minutes).'); return; }
          if (!tm) { errs.push('Sight ' + (i + 1) + ': enter the time of the sight.'); return; }
          var ms = Date.UTC(d.y, d.m - 1, d.d, +tm[1], +tm[2], +(tm[3] || 0)) - tz * 3600000;
          var s = BYID[r.star];
          var ho = CEL.observed(hs, { ic: ic, heightM: hm, tempC: temp, pressHpa: pres });
          sights.push({ ra: s.ra, dec: s.dec, ms: ms, ho: ho, hs: hs, name: s.nav });
        });
        if (errs.length) { ui.showError(out, errs.join(' ')); return; }
        if (!sights.length) { ui.showError(out, 'Enter at least one sight (star, Hs and time).'); return; }
        var r = CEL.fix(sights, { lat: c.lat, lon: c.lon });
        var lopsDR = sights.map(function (s) { return CEL.fix([s], { lat: c.lat, lon: c.lon }).lops[0]; });
        var tbl = '<div class="table-wrap"><table class="startable"><thead><tr><th>Star</th><th>Ho</th><th>Hc</th><th>Zn</th><th>Intercept</th></tr></thead><tbody>' +
          sights.map(function (s, i) { var l = lopsDR[i], a = l.interceptNM; return '<tr><td>' + esc(s.name) + '<br><small>' + ui.time(s.ms, tz, { seconds: true }) + '</small></td><td>' + fmtDM(s.ho) + '</td><td>' + fmtDM(l.hc) + '</td><td>' + z3(l.zn) + '</td><td>' + Math.abs(a).toFixed(1) + ' NM ' + (a >= 0 ? 'T' : 'A') + '</td></tr>'; }).join('') + '</tbody></table></div>';
        var html = '';
        if (r.error) html = ui.resultCard('Lines of position', '<div class="card-pad form-gap">' + ui.notice('warn', esc(r.error), 'i-alert') + tbl + '</div>', { icon: 'i-course' });
        else if (r.single) html = ui.resultCard('Line of position', '<div class="card-pad form-gap">' + tbl + lopPlot(c, lopsDR, null) + '<p class="small muted">One sight gives a line of position, not a fix. Add a second star 60–120° away in bearing.</p></div>', { icon: 'i-course' });
        else {
          var dd = C.geo.haversine(c.lat, c.lon, r.lat, r.lon);
          html = ui.resultCard('Star fix', ui.big('Fix', esc(ui.coordPair(r.lat, r.lon)), '', sights.length + ' stars · residual ' + r.rmsNM.toFixed(1) + ' NM rms') +
            ui.kv([['DR → fix', (dd / 1852).toFixed(1) + ' NM ' + z3(C.geo.initialBearing(c.lat, c.lon, r.lat, r.lon)) + ' T'], ['Time of sights', ui.time(sights[0].ms, tz, { seconds: true }) + ' ' + ui.tzLabel(tz)]]) +
            '<div class="card-pad form-gap">' + lopPlot(c, lopsDR, r) + tbl +
            (r.rmsNM > 3 ? ui.notice('warn', 'The lines do not meet well (residual ' + r.rmsNM.toFixed(1) + ' NM). Check the star names, times, and Hs of each sight.', 'i-alert') : '') +
            '<div class="flex"><button type="button" class="chip" data-copyfix>' + icon('i-copy') + 'Copy fix</button></div></div>',
            { icon: 'i-course', badge: '<span class="badge info">computed</span>', foot: 'Intercepts from the DR; fix by least squares (iterated). Star positions ~1′; check against the Nautical Almanac when possible.' });
        }
        ui.showResult(out, html, r.lat != null && !r.single && !r.error ? 'MEIKO star fix ' + ui.coordPair(r.lat, r.lon) : '');
        var cp = ui.$('[data-copyfix]', out); if (cp) cp.addEventListener('click', function () { ui.copy(ui.coordPair(r.lat, r.lon), 'Fix'); });
      }
    }
  });
  /** Plot of lines of position around the DR (north up, nautical miles). */
  function lopPlot(dr, lops, fx) {
    var pts = [[0, 0]];
    var clat = Math.cos(dr.lat * rad);
    lops.forEach(function (l) { var a = l.zn * rad; pts.push([l.interceptNM * Math.sin(a), l.interceptNM * Math.cos(a)]); });
    var fxy = fx && !fx.single ? [CEL.norm180(fx.lon - dr.lon) * 60 * clat, (fx.lat - dr.lat) * 60] : null;
    if (fxy) pts.push(fxy);
    var ext = 5; pts.forEach(function (q) { ext = Math.max(ext, Math.abs(q[0]) * 1.3, Math.abs(q[1]) * 1.3); });
    var W = 300, k = (W / 2 - 14) / ext, X = function (e) { return W / 2 + e * k; }, Y = function (n) { return W / 2 - n * k; };
    var s = ['<svg class="lopplot" viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Plot of lines of position">'];
    s.push('<line x1="' + W / 2 + '" y1="6" x2="' + W / 2 + '" y2="' + (W - 6) + '" class="lp-axis"/><line x1="6" y1="' + W / 2 + '" x2="' + (W - 6) + '" y2="' + W / 2 + '" class="lp-axis"/><text x="' + (W / 2 + 4) + '" y="16" class="lp-t">N</text>');
    lops.forEach(function (l, i) {
      var a = l.zn * rad, ex = l.interceptNM * Math.sin(a), ny = l.interceptNM * Math.cos(a), dx = Math.cos(a), dy = -Math.sin(a), L = ext * 2;
      s.push('<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(Math.sin(a) * ext * 0.9) + '" y2="' + Y(Math.cos(a) * ext * 0.9) + '" class="lp-zn"/>');
      s.push('<line x1="' + X(ex - dx * L) + '" y1="' + Y(ny - dy * L) + '" x2="' + X(ex + dx * L) + '" y2="' + Y(ny + dy * L) + '" class="lp-lop lp-c' + (i % 4) + '"/>');
    });
    s.push('<circle cx="' + X(0) + '" cy="' + Y(0) + '" r="4" class="lp-dr"/><text x="' + (X(0) + 6) + '" y="' + (Y(0) + 14) + '" class="lp-t">DR</text>');
    if (fxy) s.push('<circle cx="' + X(fxy[0]) + '" cy="' + Y(fxy[1]) + '" r="6" class="lp-fix"/><text x="' + (X(fxy[0]) + 8) + '" y="' + (Y(fxy[1]) - 6) + '" class="lp-t">Fix</text>');
    s.push('<text x="' + (W - 8) + '" y="' + (W - 8) + '" class="lp-t" text-anchor="end">grid ±' + ext.toFixed(0) + ' NM</text></svg>');
    return s.join('');
  }

  MEIKO.stars = { skySVG: skySVG, solveCanvas: solveCanvas, horizonFix: horizonFix, exifDate: exifDate, parseDM: parseDM, catalogue: cat };
})();
