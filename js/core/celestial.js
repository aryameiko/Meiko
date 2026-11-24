/*
 * MEIKO core — stars: sidereal time, precession, horizontal coordinates and celestial navigation.
 *
 *  - GMST: IAU 1982 (Meeus 12.4). Equation of the equinoxes (≤ 1.2 s) is ignored.
 *  - Precession J2000 → date: IAU 1976 (Lieske), rigorous ζ, z, θ (Meeus ch. 21).
 *    Nutation (≤ 17″), annual aberration (≤ 20″) and proper motion (≤ ~1.5′ for the fastest
 *    navigational stars over 25 years) are NOT applied, so computed star positions are good to
 *    roughly 1′ — fine for a sight-reduction training/backup tool, not a substitute for the almanac.
 *  - Sight reduction: Hc/Zn from the spherical triangle; fix = least squares over all sights
 *    (Gauss–Newton from an assumed position). Ho = Hs + IC − dip − refraction (stars: no SD/parallax).
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.celestial = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var rad = Math.PI / 180, deg = 180 / Math.PI;
  function norm360(x) { x %= 360; return x < 0 ? x + 360 : x; }
  function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }
  function jd(ms) { return ms / 86400000 + 2440587.5; }

  /** Greenwich mean sidereal time in degrees (IAU 1982). */
  function gmst(J) {
    var T = (J - 2451545.0) / 36525;
    return norm360(280.46061837 + 360.98564736629 * (J - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
  }

  /** Precess J2000 RA/Dec (degrees) to the mean equinox of date J. */
  function precess(ra, dec, J) {
    var T = (J - 2451545.0) / 36525;
    var zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600 * rad;
    var z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600 * rad;
    var th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600 * rad;
    var a = ra * rad, d = dec * rad;
    var A = Math.cos(d) * Math.sin(a + zeta);
    var B = Math.cos(th) * Math.cos(d) * Math.cos(a + zeta) - Math.sin(th) * Math.sin(d);
    var Cc = Math.sin(th) * Math.cos(d) * Math.cos(a + zeta) + Math.cos(th) * Math.sin(d);
    var raD = norm360((Math.atan2(A, B) + z) * deg);
    var decD = Math.abs(Cc) > 0.99 ? Math.acos(Math.sqrt(A * A + B * B)) * deg * (Cc < 0 ? -1 : 1) : Math.asin(Cc) * deg;
    return { ra: raD, dec: decD };
  }

  /** Greenwich hour angle (degrees) of an object with RA (of date) at JD. */
  function gha(raDate, J) { return norm360(gmst(J) - raDate); }

  /** Altitude and azimuth (true, from north) of an object for an observer. lon east positive. */
  function hz(lat, lon, decD, ghaD) {
    var lha = norm360(ghaD + lon) * rad, p = lat * rad, d = decD * rad;
    var sh = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(lha);
    var h = Math.asin(Math.max(-1, Math.min(1, sh)));
    var az = Math.atan2(-Math.cos(d) * Math.sin(lha), Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.sin(p) * Math.cos(lha));
    return { alt: h * deg, az: norm360(az * deg) };
  }
  /** Convenience: J2000 RA/Dec → alt/az at time ms for observer. */
  function altaz(ra2000, dec2000, lat, lon, ms) {
    var J = jd(ms), p = precess(ra2000, dec2000, J);
    var r = hz(lat, lon, p.dec, gha(p.ra, J));
    r.ra = p.ra; r.dec = p.dec; r.gha = gha(p.ra, J);
    return r;
  }

  /** Refraction (arcminutes) for an apparent altitude (degrees), Bennett 1982, with T/P correction. */
  function refraction(hApp, tempC, pressHpa) {
    if (hApp < -1) return 0;
    var R = 1 / Math.tan((hApp + 7.31 / (hApp + 4.4)) * rad);
    var t = tempC == null ? 10 : tempC, P = pressHpa == null ? 1010 : pressHpa;
    return R * (P / 1010) * (283 / (273 + t));
  }
  /** Dip of the sea horizon (arcminutes) for height of eye in metres. */
  function dip(heightM) { return heightM > 0 ? 1.76 * Math.sqrt(heightM) : 0; }
  /** Observed altitude from sextant altitude (degrees). opts: { ic (′, + if on the arc → subtract), heightM, tempC, pressHpa, artificialHorizon } */
  function observed(hs, opts) {
    opts = opts || {};
    var ha = hs - (opts.ic || 0) / 60 - (opts.artificialHorizon ? 0 : dip(opts.heightM || 0) / 60);
    return ha - refraction(ha, opts.tempC, opts.pressHpa) / 60;
  }

  /**
   * Fix from sights by least squares. sights: [{ ra, dec (J2000°), ms (UTC), ho (°) }], ap: { lat, lon }.
   * Returns { lat, lon, rmsNM, iterations, lops:[{ name, hc, zn, interceptNM }] } — with 1 sight only the LOP is returned.
   */
  function fix(sights, ap) {
    var S = sights.map(function (s) { var J = jd(s.ms), p = precess(s.ra, s.dec, J); return { dec: p.dec, gha: gha(p.ra, J), ho: s.ho, name: s.name }; });
    function lops(lat, lon) {
      return S.map(function (s) { var h = hz(lat, lon, s.dec, s.gha); return { name: s.name, hc: h.alt, zn: h.az, interceptNM: (s.ho - h.alt) * 60 }; });
    }
    var lat = ap.lat, lon = ap.lon, it = 0;
    if (S.length >= 2) {
      for (; it < 30; it++) {
        // Linearised: ho − hc ≈ cos(Zn)·Δlat + sin(Zn)·cos(lat)·Δlon (all in degrees)
        var a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
        lops(lat, lon).forEach(function (l) {
          var x = Math.cos(l.zn * rad), y = Math.sin(l.zn * rad) * Math.cos(lat * rad), r = l.interceptNM / 60;
          a11 += x * x; a12 += x * y; a22 += y * y; b1 += x * r; b2 += y * r;
        });
        var det = a11 * a22 - a12 * a12;
        if (Math.abs(det) < 1e-9) return { error: 'The sights are too close in azimuth to give a fix (need stars at least ~30° apart in bearing).', lops: lops(lat, lon) };
        var dlat = (a22 * b1 - a12 * b2) / det, dlon = (a11 * b2 - a12 * b1) / det;
        lat = Math.max(-89.9, Math.min(89.9, lat + dlat)); lon = norm180(lon + dlon);
        if (Math.abs(dlat) < 1e-7 && Math.abs(dlon) < 1e-7) break;
      }
    }
    var L = lops(lat, lon);
    var rms = Math.sqrt(L.reduce(function (s, l) { return s + l.interceptNM * l.interceptNM; }, 0) / L.length);
    return { lat: lat, lon: lon, rmsNM: S.length >= 2 ? rms : null, iterations: it, lops: L, single: S.length < 2 };
  }

  return { jd: jd, gmst: gmst, precess: precess, gha: gha, hz: hz, altaz: altaz, refraction: refraction, dip: dip, observed: observed, fix: fix, norm360: norm360, norm180: norm180 };
});
