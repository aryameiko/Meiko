/*
 * MEIKO core — geodesy
 * Pure functions, no DOM. Works in the browser (window.MeikoCore.geo) and in Node (require).
 *
 * Conventions
 *  - Latitude  : decimal degrees, north positive, range [-90, 90]
 *  - Longitude : decimal degrees, east positive,  range [-180, 180]
 *  - Bearings  : degrees clockwise from TRUE north, normalised to [0, 360)
 *  - Distances : metres internally; 1 international nautical mile = 1852 m exactly
 *
 * Methods
 *  - Great circle (spherical): haversine formula on a sphere of IUGG mean radius R1 = 6 371 008.8 m.
 *  - Ellipsoidal (WGS-84): Vincenty inverse formula (1975). Used to report a more precise
 *    distance alongside the spherical figure. Returns null if it fails to converge (near-antipodal points).
 *  - Rhumb line (loxodrome): Mercator-projection formulation on the same sphere.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.geo = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var R = 6371008.8;          // IUGG mean Earth radius, metres
  var NM = 1852;              // metres per international nautical mile
  var WGS84 = { a: 6378137.0, f: 1 / 298.257223563 };

  var toRad = function (d) { return d * Math.PI / 180; };
  var toDeg = function (r) { return r * 180 / Math.PI; };
  var norm360 = function (d) { var x = d % 360; if (x < 0) x += 360; return x === 360 ? 0 : x; };
  var norm180 = function (d) { var x = ((d + 180) % 360 + 360) % 360 - 180; return x; };

  function isFiniteNum(x) { return typeof x === 'number' && isFinite(x); }

  /** Validate a latitude/longitude pair. Returns null if OK, otherwise an error message. */
  function validate(lat, lon) {
    if (!isFiniteNum(lat)) return 'Latitude is missing or not a number.';
    if (!isFiniteNum(lon)) return 'Longitude is missing or not a number.';
    if (lat < -90 || lat > 90) return 'Latitude must be between 90° S and 90° N.';
    if (lon < -180 || lon > 180) return 'Longitude must be between 180° W and 180° E.';
    return null;
  }

  function assertPoint(lat, lon, label) {
    var err = validate(lat, lon);
    if (err) throw new RangeError((label ? label + ': ' : '') + err);
  }

  /** Great-circle distance in metres (haversine). */
  function haversine(lat1, lon1, lat2, lon2) {
    assertPoint(lat1, lon1, 'Start'); assertPoint(lat2, lon2, 'Destination');
    var p1 = toRad(lat1), p2 = toRad(lat2);
    var dp = toRad(lat2 - lat1), dl = toRad(lon2 - lon1);
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    a = Math.min(1, Math.max(0, a));
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Initial great-circle bearing (true), degrees [0,360). */
  function initialBearing(lat1, lon1, lat2, lon2) {
    assertPoint(lat1, lon1, 'Start'); assertPoint(lat2, lon2, 'Destination');
    var p1 = toRad(lat1), p2 = toRad(lat2), dl = toRad(lon2 - lon1);
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return norm360(toDeg(Math.atan2(y, x)));
  }

  /** Final great-circle bearing on arrival (true), degrees [0,360). */
  function finalBearing(lat1, lon1, lat2, lon2) {
    return norm360(initialBearing(lat2, lon2, lat1, lon1) + 180);
  }

  /** Rhumb line distance (m) and constant true bearing (deg). */
  function rhumb(lat1, lon1, lat2, lon2) {
    assertPoint(lat1, lon1, 'Start'); assertPoint(lat2, lon2, 'Destination');
    var p1 = toRad(lat1), p2 = toRad(lat2);
    var dp = p2 - p1;
    var dl = toRad(lon2 - lon1);
    if (Math.abs(dl) > Math.PI) dl = dl > 0 ? -(2 * Math.PI - dl) : (2 * Math.PI + dl); // shortest way across antimeridian
    // Clamp poles: Mercator is singular at ±90°
    var clamp = function (p) { var lim = Math.PI / 2 - 1e-12; return Math.max(-lim, Math.min(lim, p)); };
    var dpsi = Math.log(Math.tan(Math.PI / 4 + clamp(p2) / 2) / Math.tan(Math.PI / 4 + clamp(p1) / 2));
    var q = Math.abs(dpsi) > 1e-12 ? dp / dpsi : Math.cos(p1);
    var dist = Math.sqrt(dp * dp + q * q * dl * dl) * R;
    var brg = norm360(toDeg(Math.atan2(dl, dpsi)));
    return { distanceM: dist, bearing: brg };
  }

  /**
   * Vincenty inverse on WGS-84. Returns { distanceM, initialBearing, finalBearing } or null if no convergence.
   */
  function vincenty(lat1, lon1, lat2, lon2) {
    assertPoint(lat1, lon1, 'Start'); assertPoint(lat2, lon2, 'Destination');
    var a = WGS84.a, f = WGS84.f, b = a * (1 - f);
    var L = toRad(lon2 - lon1);
    var U1 = Math.atan((1 - f) * Math.tan(toRad(lat1)));
    var U2 = Math.atan((1 - f) * Math.tan(toRad(lat2)));
    var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
    var lambda = L, lambdaP, iter = 0;
    var sinSigma, cosSigma, sigma, sinAlpha, cos2Alpha, cos2SigmaM, sinLambda, cosLambda, C;
    do {
      sinLambda = Math.sin(lambda); cosLambda = Math.cos(lambda);
      var t1 = cosU2 * sinLambda, t2 = cosU1 * sinU2 - sinU1 * cosU2 * cosLambda;
      sinSigma = Math.sqrt(t1 * t1 + t2 * t2);
      if (sinSigma === 0) return { distanceM: 0, initialBearing: 0, finalBearing: 0 }; // coincident
      cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
      sigma = Math.atan2(sinSigma, cosSigma);
      sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
      cos2Alpha = 1 - sinAlpha * sinAlpha;
      cos2SigmaM = cos2Alpha !== 0 ? cosSigma - 2 * sinU1 * sinU2 / cos2Alpha : 0; // equatorial line
      C = f / 16 * cos2Alpha * (4 + f * (4 - 3 * cos2Alpha));
      lambdaP = lambda;
      lambda = L + (1 - C) * f * sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
      if (Math.abs(lambda) > Math.PI * 1.5) return null;
    } while (Math.abs(lambda - lambdaP) > 1e-12 && ++iter < 200);
    if (iter >= 200) return null;
    var uSq = cos2Alpha * (a * a - b * b) / (b * b);
    var A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    var B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    var dSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
      B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    var s = b * A * (sigma - dSigma);
    var a1 = Math.atan2(cosU2 * sinLambda, cosU1 * sinU2 - sinU1 * cosU2 * cosLambda);
    var a2 = Math.atan2(cosU1 * sinLambda, -sinU1 * cosU2 + cosU1 * sinU2 * cosLambda);
    return { distanceM: s, initialBearing: norm360(toDeg(a1)), finalBearing: norm360(toDeg(a2)) };
  }

  /** Full great-circle summary used by the Distance, Port-to-Port and Course tools. */
  function greatCircle(lat1, lon1, lat2, lon2) {
    var d = haversine(lat1, lon1, lat2, lon2);
    var coincident = d < 1e-6;
    var v = vincenty(lat1, lon1, lat2, lon2);
    return {
      distanceM: d,
      distanceKm: d / 1000,
      distanceNM: d / NM,
      initialBearing: coincident ? null : initialBearing(lat1, lon1, lat2, lon2),
      finalBearing: coincident ? null : finalBearing(lat1, lon1, lat2, lon2),
      ellipsoidal: v ? { distanceM: v.distanceM, distanceNM: v.distanceM / NM, distanceKm: v.distanceM / 1000 } : null,
      coincident: coincident
    };
  }

  var POINTS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  /** 16-point compass name for a bearing. */
  function compassPoint(bearing) {
    return POINTS16[Math.round(norm360(bearing) / 22.5) % 16];
  }

  return {
    R: R, NM: NM, WGS84: WGS84,
    toRad: toRad, toDeg: toDeg, norm360: norm360, norm180: norm180,
    validate: validate, haversine: haversine, initialBearing: initialBearing, finalBearing: finalBearing,
    rhumb: rhumb, vincenty: vincenty, greatCircle: greatCircle, compassPoint: compassPoint
  };
});
