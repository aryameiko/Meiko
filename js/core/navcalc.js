/*
 * MEIKO core — speed / distance / time and ETA
 *   Distance = Speed × Time,  Speed = Distance / Time,  Time = Distance / Speed
 * Internally: distance in NM, speed in knots, time in hours (1 kn = 1 NM/h, so no hidden factors).
 */
(function (root, factory) {
  var units = (typeof module === 'object' && module.exports) ? require('./units.js') : root.MeikoCore.units;
  var mod = factory(units);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.navcalc = mod; }
})(typeof self !== 'undefined' ? self : this, function (units) {
  'use strict';

  var TIME_TO_H = { h: 1, min: 1 / 60, s: 1 / 3600, d: 24 };

  function req(v, name, opts) {
    opts = opts || {};
    if (typeof v !== 'number' || !isFinite(v)) throw new RangeError(name + ' must be a number.');
    if (v < 0) throw new RangeError(name + ' cannot be negative.');
    if (opts.positive && v === 0) throw new RangeError(name + ' must be greater than zero.');
    return v;
  }

  function toHours(v, unit) { if (!(unit in TIME_TO_H)) throw new Error('Unknown time unit'); return v * TIME_TO_H[unit]; }
  function fromHours(v, unit) { if (!(unit in TIME_TO_H)) throw new Error('Unknown time unit'); return v / TIME_TO_H[unit]; }

  /** Distance = Speed × Time */
  function distance(speed, speedUnit, time, timeUnit, outUnit) {
    req(speed, 'Speed'); req(time, 'Time');
    var nm = units.speed.toKn(speed, speedUnit) * toHours(time, timeUnit);
    return units.distance.fromNM(nm, outUnit || 'nm');
  }

  /** Speed = Distance / Time */
  function speed(dist, distUnit, time, timeUnit, outUnit) {
    req(dist, 'Distance'); req(time, 'Time', { positive: true });
    var kn = units.distance.toNM(dist, distUnit) / toHours(time, timeUnit);
    return units.speed.fromKn(kn, outUnit || 'kn');
  }

  /** Time = Distance / Speed */
  function time(dist, distUnit, spd, speedUnit, outUnit) {
    req(dist, 'Distance'); req(spd, 'Speed', { positive: true });
    var h = units.distance.toNM(dist, distUnit) / units.speed.toKn(spd, speedUnit);
    return fromHours(h, outUnit || 'h');
  }

  /** Break hours into d/h/m/s (rounded to the nearest second). */
  function splitDuration(hours) {
    var totalSec = Math.round(hours * 3600);
    var d = Math.floor(totalSec / 86400); totalSec -= d * 86400;
    var h = Math.floor(totalSec / 3600); totalSec -= h * 3600;
    var m = Math.floor(totalSec / 60); var s = totalSec - m * 60;
    return { days: d, hours: h, minutes: m, seconds: s };
  }

  function formatDuration(hours) {
    var p = splitDuration(hours);
    var out = [];
    if (p.days) out.push(p.days + ' d');
    if (p.hours || p.days) out.push(p.hours + ' h');
    out.push(p.minutes + ' min');
    if (!p.days && !p.hours && p.seconds) out.push(p.seconds + ' s');
    return out.join(' ');
  }

  /**
   * ETA.
   * @param departureUtcMs  departure instant (epoch ms, UTC)
   * @param distNM          distance in NM (> 0 allowed 0)
   * @param speedKn         speed in knots (> 0)
   * @returns { hours, arrivalUtcMs }
   */
  function eta(departureUtcMs, distNM, speedKn) {
    if (typeof departureUtcMs !== 'number' || !isFinite(departureUtcMs)) throw new RangeError('Enter a valid departure date and time.');
    req(distNM, 'Distance'); req(speedKn, 'Speed', { positive: true });
    var hours = distNM / speedKn;
    if (hours > 24 * 365 * 5) throw new RangeError('Passage longer than 5 years — check distance and speed.');
    return { hours: hours, arrivalUtcMs: departureUtcMs + hours * 3600000 };
  }

  return {
    distance: distance, speed: speed, time: time, eta: eta,
    toHours: toHours, fromHours: fromHours, splitDuration: splitDuration, formatDuration: formatDuration
  };
});
