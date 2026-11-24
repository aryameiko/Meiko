/*
 * MEIKO core — Qibla direction
 * Qibla = initial great-circle bearing from the observer to the Kaaba, degrees clockwise from TRUE north.
 * Kaaba position (approximate, as specified for MEIKO): 21.4225° N, 39.8262° E.
 *
 * A phone compass measures MAGNETIC heading. Magnetic bearing = true bearing − magnetic variation
 * (variation east positive). MEIKO does not ship a geomagnetic model, so the user may enter the
 * variation from a chart; otherwise the bearing shown is TRUE.
 */
(function (root, factory) {
  var geo = (typeof module === 'object' && module.exports) ? require('./geo.js') : root.MeikoCore.geo;
  var mod = factory(geo);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.qibla = mod; }
})(typeof self !== 'undefined' ? self : this, function (geo) {
  'use strict';
  var KAABA = { lat: 21.4225, lon: 39.8262 };

  function qibla(lat, lon) {
    var err = geo.validate(lat, lon);
    if (err) throw new RangeError(err);
    var d = geo.haversine(lat, lon, KAABA.lat, KAABA.lon);
    if (d < 50) return { atKaaba: true, bearing: null, distanceM: d, distanceKm: d / 1000, distanceNM: d / geo.NM };
    return {
      atKaaba: false,
      bearing: geo.initialBearing(lat, lon, KAABA.lat, KAABA.lon),
      distanceM: d, distanceKm: d / 1000, distanceNM: d / geo.NM
    };
  }

  /** Convert a true bearing to magnetic using variation (east +, west −). */
  function trueToMagnetic(trueBearing, variationDeg) {
    return geo.norm360(trueBearing - (variationDeg || 0));
  }

  /** Angle to turn (−180..180, + = turn right/clockwise) from current heading to target bearing. */
  function relativeTurn(heading, target) { return geo.norm180(target - heading); }

  return { KAABA: KAABA, qibla: qibla, trueToMagnetic: trueToMagnetic, relativeTurn: relativeTurn };
});
