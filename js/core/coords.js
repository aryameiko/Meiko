/*
 * MEIKO core — coordinate formats
 *  DD  : Decimal Degrees              -6.104170
 *  DDM : Degrees Decimal Minutes      06° 06.250′ S
 *  DMS : Degrees Minutes Seconds      06° 06′ 15.0″ S
 *
 * parse() accepts all three, signed or with hemisphere letters, in English (N/S/E/W)
 * or Indonesian (LU/LS = Lintang Utara/Selatan, BT/BB = Bujur Timur/Barat).
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.coords = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LIMIT = { lat: 90, lon: 180 };

  function hemi(value, axis) {
    if (axis === 'lat') return value < 0 ? 'S' : 'N';
    return value < 0 ? 'W' : 'E';
  }

  function pad(n, width) { var s = String(n); while (s.length < width) s = '0' + s; return s; }

  /** Split |value| into degrees + minutes with rounding carry handled. */
  function toDDMParts(value, minDecimals) {
    var abs = Math.abs(value);
    var factor = Math.pow(10, minDecimals);
    var totalMin = Math.round(abs * 60 * factor) / factor; // round once, at the end precision
    var deg = Math.floor(totalMin / 60 + 1e-12);
    var min = totalMin - deg * 60;
    if (min < 0) min = 0;
    return { deg: deg, min: min };
  }

  function toDMSParts(value, secDecimals) {
    var abs = Math.abs(value);
    var factor = Math.pow(10, secDecimals);
    var totalSec = Math.round(abs * 3600 * factor) / factor;
    var deg = Math.floor(totalSec / 3600 + 1e-12);
    var rem = totalSec - deg * 3600;
    var min = Math.floor(rem / 60 + 1e-12);
    var sec = rem - min * 60;
    if (sec < 0) sec = 0;
    return { deg: deg, min: min, sec: sec };
  }

  function formatDD(value, axis, decimals) {
    decimals = decimals == null ? 6 : decimals;
    return value.toFixed(decimals);
  }

  function formatDDM(value, axis, decimals) {
    decimals = decimals == null ? 3 : decimals;
    var p = toDDMParts(value, decimals);
    var dw = axis === 'lat' ? 2 : 3;
    var minStr = p.min.toFixed(decimals);
    if (p.min < 10) minStr = '0' + minStr;
    return pad(p.deg, dw) + '° ' + minStr + '′ ' + hemi(value, axis);
  }

  function formatDMS(value, axis, decimals) {
    decimals = decimals == null ? 1 : decimals;
    var p = toDMSParts(value, decimals);
    var dw = axis === 'lat' ? 2 : 3;
    var secStr = p.sec.toFixed(decimals);
    if (p.sec < 10) secStr = '0' + secStr;
    return pad(p.deg, dw) + '° ' + pad(p.min, 2) + '′ ' + secStr + '″ ' + hemi(value, axis);
  }

  function format(value, axis, fmt) {
    if (fmt === 'DDM') return formatDDM(value, axis);
    if (fmt === 'DMS') return formatDMS(value, axis);
    return formatDD(value, axis);
  }

  function formatPair(lat, lon, fmt) {
    return format(lat, 'lat', fmt) + ', ' + format(lon, 'lon', fmt);
  }

  /**
   * Parse a coordinate string for one axis.
   * Returns { ok: true, value } or { ok: false, error }.
   */
  function parse(input, axis) {
    if (typeof input === 'number') input = String(input);
    if (input == null) return { ok: false, error: 'Enter a value.' };
    var s = String(input).trim().toUpperCase();
    if (!s) return { ok: false, error: 'Enter a value.' };
    s = s.replace(/,/g, '.'); // allow decimal comma (common in Indonesia)

    var sign = 1, hem = null;
    // Indonesian hemisphere words / abbreviations first (two letters), then single letters.
    var hemMatch = s.match(/\b(LU|LS|BT|BB)\b|(LINTANG UTARA|LINTANG SELATAN|BUJUR TIMUR|BUJUR BARAT)/);
    if (hemMatch) {
      var h = hemMatch[0];
      if (/LU|UTARA/.test(h)) hem = 'N';
      else if (/LS|SELATAN/.test(h)) hem = 'S';
      else if (/BT|TIMUR/.test(h)) hem = 'E';
      else hem = 'W';
      s = s.replace(hemMatch[0], ' ');
    } else {
      var m = s.match(/[NSEW]/g);
      if (m && m.length > 1) return { ok: false, error: 'Use only one hemisphere letter.' };
      if (m) { hem = m[0]; s = s.replace(/[NSEW]/, ' '); }
    }
    if (/[A-Z]/.test(s)) return { ok: false, error: 'Unrecognised characters in coordinate.' };

    s = s.trim();
    if (s.charAt(0) === '-') { sign = -1; s = s.slice(1); }
    else if (s.charAt(0) === '+') { s = s.slice(1); }
    if (/-/.test(s)) return { ok: false, error: 'Misplaced minus sign.' };

    var parts = s.split(/[^0-9.]+/).filter(function (p) { return p.length > 0; });
    if (parts.length === 0 || parts.length > 3) return { ok: false, error: 'Use DD, DDM or DMS format.' };
    for (var i = 0; i < parts.length; i++) {
      if (!/^\d+(\.\d+)?$|^\.\d+$/.test(parts[i])) return { ok: false, error: 'Invalid number “' + parts[i] + '”.' };
    }
    var nums = parts.map(Number);
    // Only the last component may carry decimals
    for (var j = 0; j < nums.length - 1; j++) {
      if (parts[j].indexOf('.') !== -1) return { ok: false, error: 'Only the last component may have decimals.' };
    }
    if (nums.length >= 2 && nums[1] >= 60) return { ok: false, error: 'Minutes must be less than 60.' };
    if (nums.length === 3 && nums[2] >= 60) return { ok: false, error: 'Seconds must be less than 60.' };

    var value = nums[0] + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600;

    if (hem) {
      if (axis === 'lat' && (hem === 'E' || hem === 'W')) return { ok: false, error: 'Latitude takes N or S.' };
      if (axis === 'lon' && (hem === 'N' || hem === 'S')) return { ok: false, error: 'Longitude takes E or W.' };
      if (sign === -1) return { ok: false, error: 'Use either a minus sign or a hemisphere letter, not both.' };
      if (hem === 'S' || hem === 'W') sign = -1;
    }
    value *= sign;
    var lim = LIMIT[axis] || 180;
    if (Math.abs(value) > lim) {
      return { ok: false, error: axis === 'lat' ? 'Latitude must be within 0–90° N/S.' : 'Longitude must be within 0–180° E/W.' };
    }
    if (value === 0) value = 0; // normalise -0
    return { ok: true, value: value };
  }

  return {
    parse: parse, format: format, formatPair: formatPair,
    formatDD: formatDD, formatDDM: formatDDM, formatDMS: formatDMS,
    toDDMParts: toDDMParts, toDMSParts: toDMSParts
  };
});
