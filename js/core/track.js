/*
 * MEIKO core — tracks (waypoint routes): leg courses & distances, ETA, GPX import/export.
 *
 *  - Leg type 'rhumb' (default): constant true course, Mercator rhumb line — what is steered between
 *    waypoints. Leg type 'gc': great circle, initial course shown.
 *  - Magnetic course = true course − variation (variation east positive). Variation per leg comes
 *    from the caller: a fixed value (from the chart) or a function(lat, lon) such as WMM2025.
 *  - GPX 1.1: exported as <rte>/<rtept>; import reads <rte>, then <trk>, then loose <wpt>.
 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.track = mod; }
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var geo = (typeof module === 'object' && module.exports) ? require('./geo.js') : root.MeikoCore.geo;
  var NM = 1852;
  function norm360(d) { var x = d % 360; if (x < 0) x += 360; return x >= 359.9999999 ? 0 : x; }
  function isPoint(p) { return p && isFinite(p.lat) && isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180; }

  /**
   * opts: { type: 'rhumb'|'gc', speedKn, departMs, variation: number | function(lat, lon) | null }
   * Returns { legs:[...], totalM, totalNM, totalH, arriveMs }.
   */
  function legs(points, opts) {
    opts = opts || {};
    var type = opts.type === 'gc' ? 'gc' : 'rhumb';
    var spd = isFinite(opts.speedKn) && opts.speedKn > 0 ? +opts.speedKn : null;
    var t = isFinite(opts.departMs) ? +opts.departMs : null;
    var out = [], total = 0, hours = 0;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      if (!isPoint(a) || !isPoint(b)) throw new Error('Waypoint ' + (isPoint(a) ? i + 1 : i) + ' has invalid coordinates.');
      var d, crs, fin = null;
      if (type === 'gc') {
        d = geo.haversine(a.lat, a.lon, b.lat, b.lon);
        crs = d > 0 ? geo.initialBearing(a.lat, a.lon, b.lat, b.lon) : 0;
        fin = d > 0 ? geo.finalBearing(a.lat, a.lon, b.lat, b.lon) : 0;
      } else {
        var r = geo.rhumb(a.lat, a.lon, b.lat, b.lon); d = r.distanceM; crs = r.bearing;
      }
      var v = typeof opts.variation === 'function' ? opts.variation(a.lat, a.lon) : (isFinite(opts.variation) ? +opts.variation : null);
      var h = spd ? d / NM / spd : null;
      total += d; if (h != null) hours += h;
      var leg = { index: i, from: i - 1, to: i, distM: d, distNM: d / NM, courseT: norm360(crs), finalT: fin == null ? null : norm360(fin),
        variation: v, courseM: v == null ? null : norm360(crs - v), hours: h, etaMs: (t != null && spd) ? t + hours * 3600000 : null };
      out.push(leg);
    }
    return { legs: out, totalM: total, totalNM: total / NM, totalH: spd ? hours : null, arriveMs: (t != null && spd) ? t + hours * 3600000 : null, type: type };
  }

  /* ---------- GPX ---------- */
  function xmlEsc(s) { return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]; }); }
  function xmlUnesc(s) {
    return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, function (m, e) {
      var map = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
      if (map[e.toLowerCase()]) return map[e.toLowerCase()];
      return String.fromCharCode(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    }).trim();
  }

  function toGPX(track) {
    var name = track.name || 'MEIKO track';
    var pts = track.points.map(function (p, i) {
      return '    <rtept lat="' + (+p.lat).toFixed(7) + '" lon="' + (+p.lon).toFixed(7) + '"><name>' + xmlEsc(p.name || ('WP' + (i + 1))) + '</name></rtept>';
    }).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<gpx version="1.1" creator="MEIKO" xmlns="http://www.topografix.com/GPX/1/1">\n' +
      '  <metadata><name>' + xmlEsc(name) + '</name>' + (track.updated ? '<time>' + xmlEsc(track.updated) + '</time>' : '') + '</metadata>\n' +
      '  <rte>\n    <name>' + xmlEsc(name) + '</name>\n' + pts + '\n  </rte>\n</gpx>\n';
  }

  function attr(tag, name) {
    var m = new RegExp('\\s' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i').exec(tag);
    return m ? (m[2] != null ? m[2] : m[3]) : null;
  }
  function childName(body) { var m = /<name>([\s\S]*?)<\/name>/i.exec(body || ''); return m ? xmlUnesc(m[1]) : ''; }
  function points(xml, tag, max) {
    var re = new RegExp('<' + tag + '\\b([^>]*?)(/>|>([\\s\\S]*?)</' + tag + '>)', 'gi'), m, out = [];
    while ((m = re.exec(xml)) && out.length < max) {
      var lat = parseFloat(attr(m[1], 'lat')), lon = parseFloat(attr(m[1], 'lon'));
      if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
      out.push({ lat: lat, lon: lon, name: childName(m[3]) });
    }
    return out;
  }
  function blocks(xml, tag) {
    var re = new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)</' + tag + '>', 'gi'), m, out = [];
    while ((m = re.exec(xml))) out.push(m[1]);
    return out;
  }
  /** Parse GPX text → [{ name, points:[{lat,lon,name}] }]. Throws if nothing usable is found. */
  function parseGPX(text, opts) {
    var max = (opts && opts.maxPoints) || 2000;
    var xml = String(text || '');
    if (!/<gpx\b/i.test(xml)) throw new Error('This is not a GPX file.');
    var out = [];
    blocks(xml, 'rte').forEach(function (b, i) {
      var pts = points(b, 'rtept', max);
      if (pts.length) out.push({ name: childName(b.replace(/<rtept\b[\s\S]*$/i, '')) || 'Route ' + (i + 1), points: pts, kind: 'route' });
    });
    blocks(xml, 'trk').forEach(function (b, i) {
      var pts = points(b, 'trkpt', max);
      if (pts.length) out.push({ name: childName(b.replace(/<trkseg\b[\s\S]*$/i, '')) || 'Track ' + (i + 1), points: pts, kind: 'track' });
    });
    if (!out.length) {
      var w = points(xml, 'wpt', max);
      if (w.length) out.push({ name: childName(xml.replace(/<wpt\b[\s\S]*$/i, '')) || 'Waypoints', points: w, kind: 'waypoints' });
    }
    if (!out.length) throw new Error('No route, track or waypoints found in this GPX file.');
    return out;
  }

  /** Thin a long recorded track to at most n points (keeps first and last). */
  function thin(pts, n) {
    if (pts.length <= n) return pts.slice();
    var out = [], step = (pts.length - 1) / (n - 1);
    for (var i = 0; i < n; i++) out.push(pts[Math.round(i * step)]);
    return out;
  }

  return { legs: legs, toGPX: toGPX, parseGPX: parseGPX, thin: thin, norm360: norm360 };
});
