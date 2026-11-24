/*
 * MEIKO core — live navigation: COG/SOG smoothing and track following.
 *
 *  Smoother: SOG = exponential moving average; COG = speed-weighted average of the unit vector
 *  (so 359° and 001° average to 000°, and the course freezes when stopped). If a fix carries no
 *  speed/course (some browsers), they are derived from consecutive fixes.
 *
 *  follow(): for the active waypoint i of a track (leg from WP i−1 to WP i):
 *    BRG  great-circle bearing from own ship to WP i        DTW  distance to WP i
 *    XTE  cross-track distance from the leg (+ = right of track, − = left)
 *    VMG  speed made good towards WP i = SOG · cos(COG − BRG)
 *    ETA  to WP i and to the last WP, from SOG (or the planned speed when SOG is too low)
 *  Arrival: inside the arrival radius, or past the line through WP i perpendicular to the leg.
 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.livenav = mod; }
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var geo = (typeof module === 'object' && module.exports) ? require('./geo.js') : root.MeikoCore.geo;
  var R = 6371008.8, NM = 1852, KN = 1852 / 3600; // 1 kn in m/s
  var rad = Math.PI / 180;
  function norm360(d) { var x = d % 360; if (x < 0) x += 360; return x >= 359.9999999 ? 0 : x; }
  function angDiff(a, b) { var d = ((a - b) % 360 + 540) % 360 - 180; return d; } // a − b in −180..180

  /** Create a smoother. opts: { tau: seconds (default 6), minKn: below this COG is held (default 0.5) } */
  function smoother(opts) {
    opts = opts || {};
    var tau = opts.tau || 6, minKn = opts.minKn == null ? 0.5 : opts.minKn;
    var sog = null, vx = 0, vy = 0, cog = null, prev = null, lastT = null;
    return {
      push: function (f) {
        var t = f.timestamp != null && isFinite(f.timestamp) ? +f.timestamp : Date.now();
        var spd = (f.speed != null && isFinite(f.speed) && f.speed >= 0) ? f.speed : null;
        var hdg = (f.heading != null && isFinite(f.heading) && f.heading >= 0) ? f.heading : null;
        if ((spd == null || hdg == null) && prev && t > prev.t) {
          var dt = (t - prev.t) / 1000;
          if (dt >= 1 && dt <= 120) {
            var d = geo.haversine(prev.lat, prev.lon, f.lat, f.lon);
            var noise = Math.max(f.accuracy || 0, prev.acc || 0);
            if (spd == null) spd = d > noise * 0.5 ? d / dt : 0;
            if (hdg == null && d > Math.max(3, noise * 0.5)) hdg = geo.initialBearing(prev.lat, prev.lon, f.lat, f.lon);
          }
        }
        if (!prev || t - prev.t >= 1000) prev = { lat: f.lat, lon: f.lon, t: t, acc: f.accuracy };
        var a = lastT == null ? 1 : 1 - Math.exp(-Math.max(0, (t - lastT) / 1000) / tau);
        lastT = t;
        if (spd != null) sog = sog == null ? spd : sog + a * (spd - sog);
        if (hdg != null && spd != null && spd / KN >= minKn) {
          var w = spd;
          var x = Math.sin(hdg * rad) * w, y = Math.cos(hdg * rad) * w;
          if (cog == null) { vx = x; vy = y; } else { vx += a * (x - vx); vy += a * (y - vy); }
          cog = norm360(Math.atan2(vx, vy) / rad);
        }
        return this.state();
      },
      state: function () { return { sogMs: sog, sogKn: sog == null ? null : sog / KN, cog: (sog != null && sog / KN < minKn) ? null : cog, cogHeld: cog }; },
      reset: function () { sog = null; vx = vy = 0; cog = null; prev = null; lastT = null; }
    };
  }

  /** Signed cross-track distance (m) of P from the great circle A→B (+ right, − left) and along-track distance from A. */
  function crossTrack(a, b, p) {
    var d13 = geo.haversine(a.lat, a.lon, p.lat, p.lon) / R;
    if (d13 === 0) return { xte: 0, atd: 0 };
    var t13 = geo.initialBearing(a.lat, a.lon, p.lat, p.lon) * rad, t12 = geo.initialBearing(a.lat, a.lon, b.lat, b.lon) * rad;
    var dxt = Math.asin(Math.sin(d13) * Math.sin(t13 - t12));
    var cosAt = Math.cos(d13) / Math.cos(dxt);
    var datv = Math.acos(Math.max(-1, Math.min(1, cosAt))) * (Math.cos(t13 - t12) < 0 ? -1 : 1);
    return { xte: dxt * R, atd: datv * R };
  }

  /**
   * points: track waypoints; idx: active waypoint index (1..n−1, or 0 to go to WP1 first)
   * own: { lat, lon, sogKn, cog }; opts: { plannedKn, arrivalNM (default 0.05), minKn (0.5), now }
   */
  function follow(points, idx, own, opts) {
    opts = opts || {};
    var n = points.length;
    if (!n || idx < 0 || idx >= n) return null;
    var now = opts.now || Date.now(), minKn = opts.minKn == null ? 0.5 : opts.minKn;
    var wp = points[idx];
    var dtw = geo.haversine(own.lat, own.lon, wp.lat, wp.lon);
    var brg = dtw > 0 ? geo.initialBearing(own.lat, own.lon, wp.lat, wp.lon) : null;
    var xte = null, legLen = null, atd = null;
    if (idx > 0) {
      var a = points[idx - 1];
      var ct = crossTrack(a, wp, own);
      xte = ct.xte; atd = ct.atd; legLen = geo.haversine(a.lat, a.lon, wp.lat, wp.lon);
    }
    var sog = own.sogKn != null && own.sogKn >= minKn ? own.sogKn : null;
    var vmg = (sog != null && own.cog != null && brg != null) ? sog * Math.cos(angDiff(own.cog, brg) * rad) : null;
    var useKn = sog != null ? sog : (opts.plannedKn > 0 ? +opts.plannedKn : null);
    var speedSource = sog != null ? 'sog' : (useKn != null ? 'planned' : null);
    var rest = 0;
    for (var i = idx + 1; i < n; i++) rest += geo.haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    var toEnd = dtw + rest;
    var hNext = useKn ? dtw / NM / useKn : null, hEnd = useKn ? toEnd / NM / useKn : null;
    var arrivalM = (opts.arrivalNM > 0 ? opts.arrivalNM : 0.05) * NM;
    var arrived = dtw <= arrivalM || (legLen != null && atd != null && atd >= legLen && Math.abs(xte) < Math.max(legLen, 5 * arrivalM));
    return {
      index: idx, wp: wp, isLast: idx === n - 1,
      brg: brg, dtwM: dtw, dtwNM: dtw / NM, xteM: xte, xteNM: xte == null ? null : xte / NM, steer: xte == null || Math.abs(xte) < 1 ? null : (xte > 0 ? 'left' : 'right'),
      courseError: (own.cog != null && brg != null) ? angDiff(brg, own.cog) : null, // + = turn to starboard
      vmgKn: vmg, speedKn: useKn, speedSource: speedSource,
      toEndM: toEnd, toEndNM: toEnd / NM,
      hoursNext: hNext, hoursEnd: hEnd,
      etaNext: hNext != null ? now + hNext * 3600000 : null, etaEnd: hEnd != null ? now + hEnd * 3600000 : null,
      arrived: arrived
    };
  }

  /** Index of the waypoint to steer to when starting: the next WP ahead of the nearest leg. */
  function startIndex(points, own) {
    if (points.length < 2) return 0;
    var best = 1, bestD = Infinity;
    for (var i = 1; i < points.length; i++) {
      var ct = crossTrack(points[i - 1], points[i], own);
      var len = geo.haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
      var d = ct.atd < 0 ? geo.haversine(own.lat, own.lon, points[i - 1].lat, points[i - 1].lon) : ct.atd > len ? geo.haversine(own.lat, own.lon, points[i].lat, points[i].lon) : Math.abs(ct.xte);
      if (d < bestD - 1e-6) { bestD = d; best = i; }
    }
    // Far before the first waypoint → go to WP1 first.
    var d0 = geo.haversine(own.lat, own.lon, points[0].lat, points[0].lon);
    if (best === 1 && crossTrack(points[0], points[1], own).atd < 0 && d0 > 0.05 * NM) return 0;
    return best;
  }

  return { smoother: smoother, follow: follow, crossTrack: crossTrack, startIndex: startIndex, angDiff: angDiff, KN: KN };
});
