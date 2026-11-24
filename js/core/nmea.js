/*
 * MEIKO core — NMEA 0183 parser for external GPS receivers.
 *
 * Supported sentences (any talker: GP, GN, GL, GA, GB, BD, GQ, GI):
 *   GGA  fix data: position, fix quality, satellites, HDOP, altitude
 *   RMC  recommended minimum: status, position, speed & course over ground, UTC date/time
 *   GLL  geographic position + status
 *   VTG  course & speed over ground
 * Checksums (*hh) are verified; a sentence with a wrong checksum is rejected. Sentences without a
 * checksum are accepted but flagged (some older devices omit it).
 *
 * NMEA does not report an accuracy in metres. MEIKO estimates one as HDOP × 5 m (typical
 * consumer-receiver range error) and labels it as an estimate.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.nmea = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var UERE_M = 5; // metres per unit of HDOP (estimate)
  var FIX_QUALITY = { 0: 'No fix', 1: 'GPS fix', 2: 'DGPS fix', 3: 'PPS fix', 4: 'RTK fixed', 5: 'RTK float', 6: 'Dead reckoning', 7: 'Manual input', 8: 'Simulation' };

  function checksum(body) {
    var c = 0;
    for (var i = 0; i < body.length; i++) c ^= body.charCodeAt(i);
    var h = c.toString(16).toUpperCase();
    return h.length < 2 ? '0' + h : h;
  }

  /** "4807.038","N" → 48.1173. Returns null for empty/invalid. */
  function parseLatLon(value, hemi, axis) {
    if (!value || !hemi) return null;
    var dot = value.indexOf('.');
    if (dot === -1) dot = value.length;
    var degDigits = dot - 2;
    if (degDigits < 1) return null;
    var deg = parseInt(value.slice(0, degDigits), 10), min = parseFloat(value.slice(degDigits));
    if (!isFinite(deg) || !isFinite(min) || min >= 60) return null;
    var v = deg + min / 60;
    if (axis === 'lat' && (v > 90 || (hemi !== 'N' && hemi !== 'S'))) return null;
    if (axis === 'lon' && (v > 180 || (hemi !== 'E' && hemi !== 'W'))) return null;
    if (hemi === 'S' || hemi === 'W') v = -v;
    return v;
  }
  function num(s) { if (s == null || s === '') return null; var v = Number(s); return isFinite(v) ? v : null; }
  /** "123519.00" → seconds of day */
  function parseTime(s) {
    if (!s || s.length < 6) return null;
    var h = +s.slice(0, 2), m = +s.slice(2, 4), sec = parseFloat(s.slice(4));
    if (!(h < 24 && m < 60 && sec < 61)) return null;
    return h * 3600 + m * 60 + sec;
  }
  /** "230394" → {y,m,d}  (two-digit year: 80–99 → 19xx, else 20xx) */
  function parseDate(s) {
    if (!s || s.length !== 6) return null;
    var d = +s.slice(0, 2), m = +s.slice(2, 4), y = +s.slice(4, 6);
    if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12)) return null;
    return { y: y >= 80 ? 1900 + y : 2000 + y, m: m, d: d };
  }

  /** Parse one sentence. Returns { ok, type, talker, checksum: 'valid'|'missing', data } or { ok:false, error }. */
  function parseSentence(line) {
    var s = String(line || '').trim();
    if (!s) return { ok: false, error: 'empty' };
    if (s.charAt(0) !== '$') return { ok: false, error: 'not an NMEA sentence' };
    var star = s.indexOf('*'), body, cs = 'missing';
    if (star !== -1) {
      body = s.slice(1, star);
      var given = s.slice(star + 1, star + 3).toUpperCase();
      if (given.length !== 2 || checksum(body) !== given) return { ok: false, error: 'checksum mismatch' };
      cs = 'valid';
    } else body = s.slice(1);
    var f = body.split(',');
    var id = f[0];
    if (id.charAt(0) === 'P') return { ok: false, error: 'proprietary sentence ignored' };
    if (id.length !== 5) return { ok: false, error: 'unknown sentence' };
    var talker = id.slice(0, 2), type = id.slice(2);
    var d;
    switch (type) {
      case 'GGA':
        d = { time: parseTime(f[1]), lat: parseLatLon(f[2], f[3], 'lat'), lon: parseLatLon(f[4], f[5], 'lon'),
          quality: num(f[6]) || 0, satellites: num(f[7]), hdop: num(f[8]), altitude: num(f[9]), geoidSep: num(f[11]) };
        d.valid = d.quality > 0 && d.lat != null && d.lon != null;
        break;
      case 'RMC':
        d = { time: parseTime(f[1]), status: f[2], lat: parseLatLon(f[3], f[4], 'lat'), lon: parseLatLon(f[5], f[6], 'lon'),
          sogKn: num(f[7]), cogT: num(f[8]), date: parseDate(f[9]), magVar: num(f[10]) != null ? num(f[10]) * (f[11] === 'W' ? -1 : 1) : null,
          mode: f[12] || null };
        d.valid = d.status === 'A' && d.lat != null && d.lon != null && d.mode !== 'N';
        break;
      case 'GLL':
        d = { lat: parseLatLon(f[1], f[2], 'lat'), lon: parseLatLon(f[3], f[4], 'lon'), time: parseTime(f[5]), status: f[6], mode: f[7] || null };
        d.valid = d.status === 'A' && d.lat != null && d.lon != null && d.mode !== 'N';
        break;
      case 'VTG':
        // NMEA 2.3+: $--VTG,cogT,T,cogM,M,sogN,N,sogK,K,mode ; older: $--VTG,cogT,cogM,sogN,sogK
        if (f[2] === 'T') d = { cogT: num(f[1]), sogKn: num(f[5]), sogKmh: num(f[7]) };
        else d = { cogT: num(f[1]), sogKn: num(f[3]), sogKmh: num(f[4]) };
        d.valid = true;
        break;
      default:
        return { ok: false, error: 'unsupported sentence ' + type, type: type };
    }
    return { ok: true, type: type, talker: talker, checksum: cs, data: d };
  }

  /**
   * Stateful receiver: feed it raw text chunks (as they arrive from serial/Bluetooth), it splits lines,
   * parses them and maintains the latest fix.
   */
  function createReceiver(opts) {
    opts = opts || {};
    var buf = '', state = { lat: null, lon: null, valid: false }, stats = { sentences: 0, rejected: 0 };
    var now = opts.now || function () { return Date.now(); };

    function apply(p) {
      var d = p.data, t = now();
      if (p.type === 'GGA') {
        state.quality = d.quality; state.satellites = d.satellites; state.hdop = d.hdop; state.altitude = d.altitude;
        if (d.valid) { state.lat = d.lat; state.lon = d.lon; state.valid = true; state.receivedAt = t; }
        else if (d.quality === 0) { state.valid = false; }
      } else if (p.type === 'RMC') {
        if (d.sogKn != null) state.sogKn = d.sogKn;
        if (d.cogT != null) state.cogT = d.cogT;
        if (d.magVar != null) state.magVar = d.magVar;
        if (d.date && d.time != null) state.gpsTime = Date.UTC(d.date.y, d.date.m - 1, d.date.d) + Math.round(d.time * 1000);
        if (d.valid) { state.lat = d.lat; state.lon = d.lon; state.valid = true; state.receivedAt = t; }
        else if (d.status === 'V') state.valid = false;
      } else if (p.type === 'GLL') {
        if (d.valid) { state.lat = d.lat; state.lon = d.lon; state.valid = true; state.receivedAt = t; }
      } else if (p.type === 'VTG') {
        if (d.sogKn != null) state.sogKn = d.sogKn;
        if (d.cogT != null) state.cogT = d.cogT;
      }
    }

    return {
      /** Push text; returns array of parse results for complete lines. */
      push: function (text) {
        buf += String(text);
        if (buf.length > 8192) buf = buf.slice(-2048); // garbage guard
        var lines = buf.split(/\r?\n|\r/);
        buf = lines.pop();
        var out = [];
        lines.forEach(function (line) {
          if (!line.trim()) return;
          var p = parseSentence(line);
          p.raw = line.trim();
          if (p.ok) { stats.sentences++; apply(p); } else stats.rejected++;
          out.push(p);
        });
        return out;
      },
      /** Latest valid fix in MEIKO's fix format, or null. */
      fix: function () {
        if (!state.valid || state.lat == null) return null;
        return {
          lat: state.lat, lon: state.lon,
          accuracy: state.hdop != null ? state.hdop * UERE_M : null, accuracyEstimated: true,
          altitude: state.altitude != null ? state.altitude : null, altitudeAccuracy: null,
          speed: state.sogKn != null ? state.sogKn * 1852 / 3600 : null, // m/s, same as Geolocation API
          heading: state.cogT != null ? state.cogT : null,
          timestamp: state.receivedAt, gpsTime: state.gpsTime || null,
          satellites: state.satellites != null ? state.satellites : null, hdop: state.hdop != null ? state.hdop : null,
          quality: state.quality != null ? state.quality : null, qualityLabel: FIX_QUALITY[state.quality] || null,
          magVar: state.magVar != null ? state.magVar : null
        };
      },
      state: function () { return Object.assign({}, state); },
      stats: function () { return Object.assign({}, stats); },
      reset: function () { buf = ''; state = { lat: null, lon: null, valid: false }; stats = { sentences: 0, rejected: 0 }; }
    };
  }

  /**
   * Signal K delta (JSON over WebSocket, e.g. wss://server:3443/signalk/v1/stream?subscribe=self).
   * Merges navigation values into `state` (object kept by the caller). Returns true if position changed.
   * Units per Signal K spec: lat/lon degrees, speed m/s, angles radians.
   */
  function applySignalK(msg, state, nowMs) {
    if (!msg || !Array.isArray(msg.updates)) return false;
    var changed = false;
    msg.updates.forEach(function (u) {
      (u.values || []).forEach(function (v) {
        var val = v.value;
        switch (v.path) {
          case 'navigation.position':
            if (val && typeof val.latitude === 'number' && typeof val.longitude === 'number' &&
                Math.abs(val.latitude) <= 90 && Math.abs(val.longitude) <= 180) {
              state.lat = val.latitude; state.lon = val.longitude; state.receivedAt = nowMs;
              if (typeof val.altitude === 'number') state.altitude = val.altitude;
              if (u.timestamp) { var t = Date.parse(u.timestamp); if (isFinite(t)) state.gpsTime = t; }
              changed = true;
            }
            break;
          case 'navigation.speedOverGround': if (typeof val === 'number') state.speed = val; break;
          case 'navigation.courseOverGroundTrue': if (typeof val === 'number') state.heading = ((val * 180 / Math.PI) % 360 + 360) % 360; break;
          case 'navigation.magneticVariation': if (typeof val === 'number') state.magVar = val * 180 / Math.PI; break;
          case 'navigation.gnss.satellites': if (typeof val === 'number') state.satellites = val; break;
          case 'navigation.gnss.horizontalDilution': if (typeof val === 'number') state.hdop = val; break;
          case 'navigation.gnss.methodQuality': if (typeof val === 'string') state.qualityLabel = val; break;
        }
      });
    });
    return changed;
  }

  function signalKFix(state) {
    if (state.lat == null || state.lon == null) return null;
    return {
      lat: state.lat, lon: state.lon, accuracy: state.hdop != null ? state.hdop * UERE_M : null, accuracyEstimated: true,
      altitude: state.altitude != null ? state.altitude : null, altitudeAccuracy: null,
      speed: state.speed != null ? state.speed : null, heading: state.heading != null ? state.heading : null,
      timestamp: state.receivedAt, gpsTime: state.gpsTime || null, satellites: state.satellites != null ? state.satellites : null,
      hdop: state.hdop != null ? state.hdop : null, quality: null, qualityLabel: state.qualityLabel || 'Signal K',
      magVar: state.magVar != null ? state.magVar : null
    };
  }

  return { applySignalK: applySignalK, signalKFix: signalKFix, parseSentence: parseSentence, createReceiver: createReceiver, checksum: checksum, parseLatLon: parseLatLon, FIX_QUALITY: FIX_QUALITY, UERE_M: UERE_M };
});
