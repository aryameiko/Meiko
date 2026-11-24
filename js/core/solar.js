/*
 * MEIKO core — solar ephemeris, meridian passage, sunrise / sunset
 *
 * Algorithm: NOAA Solar Calculator equations (after Jean Meeus, "Astronomical Algorithms", 2nd ed.).
 *  - Sun's apparent longitude, obliquity (with nutation term), declination
 *  - Equation of time (EoT)
 * Events are solved iteratively: the Sun's position is recomputed at the event instant itself,
 * so declination and EoT changes during the day are accounted for.
 *
 * Accuracy (as published by NOAA for these equations): about ±1 minute for sunrise/sunset
 * for latitudes between ±72°, and better (seconds) for meridian passage. Atmospheric refraction
 * near the horizon varies with weather, so real sunrise/sunset can differ by a minute or more.
 * For celestial navigation use the official Nautical Almanac.
 *
 * Time handling: a "local date" (y, m, d) plus a fixed UTC offset in hours (e.g. +7 for WIB).
 * All instants are returned as epoch milliseconds (UTC).
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.solar = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var MIN = 60000, DAY_MIN = 1440;

  /** Standard altitude of the Sun's centre at sunrise/sunset: −50′ (34′ refraction + 16′ semi-diameter). */
  var SUNRISE_ALT = -0.833;

  function julianDay(utcMs) { return utcMs / 86400000 + 2440587.5; }

  /** Sun position quantities at an instant. */
  function sunPosition(utcMs) {
    var T = (julianDay(utcMs) - 2451545.0) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360; if (L0 < 0) L0 += 360;
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var Mr = M * D2R;
    var C = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
            Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
            Math.sin(3 * Mr) * 0.000289;
    var trueLong = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    var appLong = trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * Math.cos(omega * D2R);
    var decl = Math.asin(Math.sin(eps * D2R) * Math.sin(appLong * D2R)) * R2D;
    var y = Math.tan(eps * D2R / 2); y *= y;
    var L0r = L0 * D2R;
    var eot = 4 * R2D * (y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) -
      0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr));
    return { declination: decl, eotMinutes: eot, julianDay: julianDay(utcMs), obliquity: eps };
  }

  /** Apparent solar time at longitude, minutes in [0, 1440). */
  function apparentSolarMinutes(utcMs, lon, eot) {
    var d = new Date(utcMs);
    var utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + d.getUTCMilliseconds() / 60000;
    var ast = (utcMin + 4 * lon + eot) % DAY_MIN; if (ast < 0) ast += DAY_MIN;
    return ast;
  }

  function wrapMinutes(m) { // into [-720, 720)
    var x = ((m + 720) % DAY_MIN + DAY_MIN) % DAY_MIN - 720; return x;
  }

  function localNoonUtc(date, tz) { return Date.UTC(date.y, date.m - 1, date.d, 12, 0, 0) - tz * 3600000; }

  function checkInputs(date, lat, lon, tz) {
    if (!date || !date.y || !date.m || !date.d) throw new RangeError('Enter a valid date.');
    if (typeof lat !== 'number' || !isFinite(lat) || lat < -90 || lat > 90) throw new RangeError('Latitude must be between 90° S and 90° N.');
    if (typeof lon !== 'number' || !isFinite(lon) || lon < -180 || lon > 180) throw new RangeError('Longitude must be between 180° W and 180° E.');
    if (typeof tz !== 'number' || !isFinite(tz) || tz < -12 || tz > 14) throw new RangeError('UTC offset must be between −12 and +14 hours.');
  }

  /** Upper meridian transit of the Sun (apparent noon) nearest to local clock noon of the given date. */
  function transit(date, lon, tz) {
    var t = localNoonUtc(date, tz);
    for (var i = 0; i < 5; i++) {
      var p = sunPosition(t);
      var delta = wrapMinutes(720 - apparentSolarMinutes(t, lon, p.eotMinutes));
      t += delta * MIN;
      if (Math.abs(delta) < 1e-4) break;
    }
    return t;
  }

  /** cos of hour angle for a given altitude; returns raw value (may be outside [-1,1]). */
  function cosHourAngle(lat, decl, alt) {
    var phi = lat * D2R, d = decl * D2R;
    return (Math.sin(alt * D2R) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d));
  }

  /**
   * Time when the Sun's centre reaches `alt` degrees, before (side=-1, morning) or after (side=+1, evening)
   * the transit. Returns { utcMs } or { never: 'above' | 'below' }.
   */
  function altitudeEvent(date, lat, lon, tz, alt, side) {
    checkInputs(date, lat, lon, tz);
    var tN = transit(date, lon, tz);
    var t = tN;
    for (var i = 0; i < 6; i++) {
      var p = sunPosition(t);
      var c = cosHourAngle(lat, p.declination, alt);
      if (c > 1) return { never: 'below' };   // Sun never gets that high/low: stays below alt
      if (c < -1) return { never: 'above' };  // stays above alt all day
      var H = Math.acos(c) * R2D;             // degrees
      var targetAst = 720 + side * 4 * H;     // minutes of apparent solar time
      var delta = wrapMinutes(targetAst - apparentSolarMinutes(t, lon, p.eotMinutes));
      // keep the event on the correct side of this transit
      var next = t + delta * MIN;
      if (side < 0 && next > tN) next -= DAY_MIN * MIN;
      if (side > 0 && next < tN) next += DAY_MIN * MIN;
      if (Math.abs(next - t) < 50) { t = next; break; }
      t = next;
    }
    return { utcMs: t };
  }

  /** Observer height correction for the horizon (dip), metres above sea level → degrees. */
  function dipCorrection(heightM) {
    if (!heightM || heightM <= 0) return 0;
    return 0.0347 * Math.sqrt(heightM); // standard approx. (≈ 2.08′·√h)
  }

  /**
   * Sunrise, sunset, solar noon and daylight for a local date.
   * opts.heightM: observer height above the horizon in metres (optional).
   */
  function sunTimes(date, lat, lon, tz, opts) {
    opts = opts || {};
    checkInputs(date, lat, lon, tz);
    var alt = SUNRISE_ALT - dipCorrection(opts.heightM);
    var noon = transit(date, lon, tz);
    var pNoon = sunPosition(noon);
    var rise = altitudeEvent(date, lat, lon, tz, alt, -1);
    var set = altitudeEvent(date, lat, lon, tz, alt, +1);
    var status = 'normal';
    if (rise.never === 'below' || set.never === 'below') status = 'polar-night';
    else if (rise.never === 'above' || set.never === 'above') status = 'midnight-sun';
    var dayLengthH = status === 'normal' ? (set.utcMs - rise.utcMs) / 3600000 : (status === 'midnight-sun' ? 24 : 0);
    return {
      status: status,
      solarNoon: noon,
      sunrise: rise.utcMs || null,
      sunset: set.utcMs || null,
      dayLengthHours: dayLengthH,
      declination: pNoon.declination,
      eotMinutes: pNoon.eotMinutes,
      horizonAltitude: alt
    };
  }

  /**
   * Meridian passage (Merpass) / Local Apparent Noon.
   * Returns transit instant plus the quantities a navigator uses for a noon sight.
   */
  function merpass(date, lat, lon, tz) {
    checkInputs(date, lat, lon, tz);
    var t = transit(date, lon, tz);
    var p = sunPosition(t);
    var zd = lat - p.declination;                 // zenith distance (signed)
    var altitude = 90 - Math.abs(zd);
    var bearing = Math.abs(zd) < 1e-6 ? null : (zd > 0 ? 180 : 0); // sun bears S if observer north of the sun
    // Local Mean Time of merpass at the observer = 12:00 − EoT
    var lmtMinutes = 720 - p.eotMinutes;
    // Arc to time of longitude, minutes (east positive)
    var lonTimeMinutes = lon * 4;
    return {
      utcMs: t,
      eotMinutes: p.eotMinutes,
      declination: p.declination,
      altitude: altitude,
      sunBearing: bearing,
      lmtMinutes: lmtMinutes,
      longitudeTimeMinutes: lonTimeMinutes,
      zoneMeridian: tz * 15
    };
  }

  return {
    SUNRISE_ALT: SUNRISE_ALT,
    julianDay: julianDay, sunPosition: sunPosition, transit: transit,
    altitudeEvent: altitudeEvent, sunTimes: sunTimes, merpass: merpass, dipCorrection: dipCorrection
  };
});
