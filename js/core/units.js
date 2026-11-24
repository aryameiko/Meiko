/*
 * MEIKO core — unit conversion
 * Every linear quantity is converted through an SI base unit using exact defined factors where they exist.
 *   1 nautical mile (international, 1929)   = 1852 m              (exact)
 *   1 cable                                  = 0.1 NM = 185.2 m    (international cable; the old
 *                                              British Admiralty cable was 608 ft = 185.3184 m)
 *   1 fathom                                 = 6 ft = 1.8288 m     (exact)
 *   1 international foot                     = 0.3048 m            (exact)
 *   1 inch                                   = 0.0254 m            (exact)
 *   1 knot                                   = 1 NM/h = 1852/3600 m/s
 *   1 mile per hour                          = 1609.344/3600 m/s = 0.44704 m/s (exact)
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.units = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIES = {
    maritime: {
      label: 'Maritime distance', base: 'm',
      units: {
        nm: { label: 'Nautical mile', symbol: 'NM', factor: 1852 },
        km: { label: 'Kilometre', symbol: 'km', factor: 1000 },
        m: { label: 'Metre', symbol: 'm', factor: 1 },
        cable: { label: 'Cable (0.1 NM)', symbol: 'cbl', factor: 185.2 },
        fathom: { label: 'Fathom', symbol: 'fm', factor: 1.8288 },
        ft: { label: 'Foot', symbol: 'ft', factor: 0.3048 }
      },
      defaults: ['nm', 'km']
    },
    speed: {
      label: 'Speed', base: 'm/s',
      units: {
        kn: { label: 'Knot', symbol: 'kn', factor: 1852 / 3600 },
        kmh: { label: 'Kilometre per hour', symbol: 'km/h', factor: 1000 / 3600 },
        ms: { label: 'Metre per second', symbol: 'm/s', factor: 1 },
        mph: { label: 'Mile per hour', symbol: 'mph', factor: 0.44704 }
      },
      defaults: ['kn', 'kmh']
    },
    length: {
      label: 'Length', base: 'm',
      units: {
        m: { label: 'Metre', symbol: 'm', factor: 1 },
        km: { label: 'Kilometre', symbol: 'km', factor: 1000 },
        cm: { label: 'Centimetre', symbol: 'cm', factor: 0.01 },
        mm: { label: 'Millimetre', symbol: 'mm', factor: 0.001 },
        ft: { label: 'Foot', symbol: 'ft', factor: 0.3048 },
        in: { label: 'Inch', symbol: 'in', factor: 0.0254 }
      },
      defaults: ['m', 'ft']
    },
    time: {
      label: 'Time', base: 's',
      units: {
        s: { label: 'Second', symbol: 's', factor: 1 },
        min: { label: 'Minute', symbol: 'min', factor: 60 },
        h: { label: 'Hour', symbol: 'h', factor: 3600 },
        d: { label: 'Day', symbol: 'd', factor: 86400 }
      },
      defaults: ['h', 'min']
    },
    angle: {
      label: 'Angle', base: 'deg',
      units: {
        deg: { label: 'Degree', symbol: '°', factor: 1 },
        arcmin: { label: 'Minute of arc', symbol: '′', factor: 1 / 60 },
        arcsec: { label: 'Second of arc', symbol: '″', factor: 1 / 3600 },
        rad: { label: 'Radian', symbol: 'rad', factor: 180 / Math.PI }
      },
      defaults: ['deg', 'rad']
    },
    temperature: {
      label: 'Temperature', base: 'K',
      units: {
        c: { label: 'Celsius', symbol: '°C', toBase: function (v) { return v + 273.15; }, fromBase: function (v) { return v - 273.15; } },
        f: { label: 'Fahrenheit', symbol: '°F', toBase: function (v) { return (v - 32) * 5 / 9 + 273.15; }, fromBase: function (v) { return (v - 273.15) * 9 / 5 + 32; } },
        k: { label: 'Kelvin', symbol: 'K', toBase: function (v) { return v; }, fromBase: function (v) { return v; } }
      },
      defaults: ['c', 'f'],
      minBase: 0 // absolute zero
    }
  };

  function convert(value, category, from, to) {
    var cat = CATEGORIES[category];
    if (!cat) throw new Error('Unknown category ' + category);
    var u1 = cat.units[from], u2 = cat.units[to];
    if (!u1 || !u2) throw new Error('Unknown unit');
    if (typeof value !== 'number' || !isFinite(value)) throw new RangeError('Enter a valid number.');
    var base = u1.toBase ? u1.toBase(value) : value * u1.factor;
    if (cat.minBase != null && base < cat.minBase - 1e-9) throw new RangeError('Below absolute zero (0 K).');
    return u2.fromBase ? u2.fromBase(base) : base / u2.factor;
  }

  /** Shortcuts used across the app. */
  var distance = {
    toNM: function (v, unit) { return convert(v, 'maritime', unit, 'nm'); },
    fromNM: function (v, unit) { return convert(v, 'maritime', 'nm', unit); }
  };
  var speed = {
    toKn: function (v, unit) { return convert(v, 'speed', unit, 'kn'); },
    fromKn: function (v, unit) { return convert(v, 'speed', 'kn', unit); }
  };

  /** Format a number with sensible significant figures for display. */
  function smartRound(v, sig) {
    sig = sig || 10;
    if (v === 0 || !isFinite(v)) return v;
    return parseFloat(v.toPrecision(sig));
  }

  return { CATEGORIES: CATEGORIES, convert: convert, distance: distance, speed: speed, smartRound: smartRound };
});
