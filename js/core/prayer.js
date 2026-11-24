/*
 * MEIKO core — prayer time (Maghrib)
 *
 * Maghrib begins at sunset. Methods differ in (a) the Sun altitude used for "sunset" and
 * (b) a precautionary offset (ihtiyat) added afterwards.
 *
 * VERIFICATION STATUS — read before relying on these values:
 *  - The Kemenag RI entry uses parameters that are widely cited for Indonesia
 *    (Maghrib = sunset + 2 min ihtiyat; Subuh −20°, Isya −18°), but they have NOT yet been
 *    checked against an official Kementerian Agama publication. `verified: false` until they are.
 *  - Times are computed astronomically (see solar.js). Official schedules may also apply
 *    rounding, elevation and local corrections. Always follow your local official schedule.
 */
(function (root, factory) {
  var solar = (typeof module === 'object' && module.exports) ? require('./solar.js') : root.MeikoCore.solar;
  var mod = factory(solar);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.prayer = mod; }
})(typeof self !== 'undefined' ? self : this, function (solar) {
  'use strict';

  var METHODS = {
    kemenag: {
      name: 'Kementerian Agama RI (Indonesia)',
      maghribAngle: null, // null = standard sunset (Sun's upper limb on the horizon, −0.833°)
      ihtiyatMin: 2,
      verified: false,
      note: 'Sunset + 2 min ihtiyat. Commonly cited Kemenag parameters — not yet verified against an official Kemenag publication.'
    },
    mwl: { name: 'Muslim World League', maghribAngle: null, ihtiyatMin: 0, verified: false, note: 'Maghrib at standard sunset.' },
    ummalqura: { name: 'Umm al-Qura (Makkah)', maghribAngle: null, ihtiyatMin: 0, verified: false, note: 'Maghrib at standard sunset.' },
    isna: { name: 'ISNA (North America)', maghribAngle: null, ihtiyatMin: 0, verified: false, note: 'Maghrib at standard sunset.' },
    egypt: { name: 'Egyptian General Authority of Survey', maghribAngle: null, ihtiyatMin: 0, verified: false, note: 'Maghrib at standard sunset.' },
    jafari: { name: 'Shia Ithna-Ashari (Leva Institute, Qum)', maghribAngle: 4, ihtiyatMin: 0, verified: false, note: 'Maghrib when the Sun is 4° below the horizon.' },
    tehran: { name: 'Institute of Geophysics, Tehran', maghribAngle: 4.5, ihtiyatMin: 0, verified: false, note: 'Maghrib when the Sun is 4.5° below the horizon.' },
    custom: { name: 'Custom', maghribAngle: null, ihtiyatMin: 0, verified: false, note: 'Your own depression angle and offset.' }
  };

  /**
   * @param date {y,m,d} local date
   * @param opts { method, customAngle (deg below horizon, 0/blank = standard sunset), customOffsetMin, heightM }
   */
  function maghrib(date, lat, lon, tz, opts) {
    opts = opts || {};
    var key = opts.method || 'kemenag';
    var m = METHODS[key];
    if (!m) throw new Error('Unknown calculation method');
    var angle = m.maghribAngle, offset = m.ihtiyatMin;
    if (key === 'custom') {
      var ca = Number(opts.customAngle);
      angle = (opts.customAngle === '' || opts.customAngle == null || ca === 0) ? null : ca;
      offset = Number(opts.customOffsetMin) || 0;
      if (angle != null && (!isFinite(angle) || angle < 0 || angle > 20)) throw new RangeError('Depression angle must be between 0° and 20°.');
      if (!isFinite(offset) || Math.abs(offset) > 30) throw new RangeError('Offset must be between −30 and +30 minutes.');
    }
    var sun = solar.sunTimes(date, lat, lon, tz, { heightM: opts.heightM });
    var alt = angle == null ? sun.horizonAltitude : -angle - solar.dipCorrection(opts.heightM);
    var ev = solar.altitudeEvent(date, lat, lon, tz, alt, +1);
    if (!ev.utcMs) {
      return { ok: false, reason: ev.never === 'above' ? 'The Sun does not go below the required altitude on this date (high latitude).' : 'The Sun stays below the horizon all day on this date (polar night).', sunset: sun.sunset, method: m, methodKey: key };
    }
    return {
      ok: true,
      utcMs: ev.utcMs + offset * 60000,
      sunset: sun.sunset,
      altitudeUsed: alt,
      offsetMin: offset,
      method: m,
      methodKey: key
    };
  }

  /** Round an instant UP to the next whole minute (conventional for published prayer times). */
  function ceilMinute(utcMs) { return Math.ceil(utcMs / 60000) * 60000; }

  return { METHODS: METHODS, maghrib: maghrib, ceilMinute: ceilMinute };
});
