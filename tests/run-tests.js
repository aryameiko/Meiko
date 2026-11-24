/*
 * MEIKO calculation tests — run with:  node tests/run-tests.js
 * No dependencies. Reference values are cited next to each test.
 */
'use strict';
var assert = require('assert');
var path = require('path');
var core = function (n) { return require(path.join(__dirname, '..', 'js', 'core', n + '.js')); };
var geo = core('geo'), coords = core('coords'), units = core('units'), nav = core('navcalc');
var solar = core('solar'), prayer = core('prayer'), qibla = core('qibla'), calc = core('calc');
var nmea = core('nmea');
var ports = require(path.join(__dirname, '..', 'js', 'data', 'ports-data.js'));

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function near(actual, expected, tol, label) {
  assert.ok(Math.abs(actual - expected) <= tol,
    (label || '') + ' expected ' + expected + ' ± ' + tol + ', got ' + actual);
}
function dms(d, m, s) { return d + m / 60 + s / 3600; }
function utcHM(ms) { var d = new Date(ms); return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600; }

console.log('\nGeodesy');
test('1° of longitude on the equator = R·π/180 (60.04 NM)', function () {
  var d = geo.haversine(0, 0, 0, 1);
  near(d, 6371008.8 * Math.PI / 180, 1e-6);
  near(d / 1852, 60.0405, 1e-3);
});
test('Equator to pole = quarter circumference (10 007.5 km)', function () {
  near(geo.haversine(0, 0, 90, 0) / 1000, 10007.557, 1e-3); // π/2 · 6371.0088 km
});
test('Cardinal bearings: due N, E, S, W', function () {
  near(geo.initialBearing(0, 0, 1, 0), 0, 1e-9);
  near(geo.initialBearing(0, 0, 0, 1), 90, 1e-9);
  near(geo.initialBearing(1, 0, 0, 0), 180, 1e-9);
  near(geo.initialBearing(0, 1, 0, 0), 270, 1e-9);
});
test('Final bearing differs from initial on a non-meridian great circle', function () {
  var i = geo.initialBearing(-6.2, 106.8, 21.4225, 39.8262), f = geo.finalBearing(-6.2, 106.8, 21.4225, 39.8262);
  assert.ok(Math.abs(i - f) > 5, 'initial ' + i + ' final ' + f);
});
test('Vincenty (WGS-84): Flinders Peak → Buninyong (Vincenty 1975 worked example)', function () {
  // Geoscience Australia example: s = 54 972.271 m, α1 = 306°52′05.37″, reverse α21 = 127°10′25.07″
  var r = geo.vincenty(-dms(37, 57, 3.72030), dms(144, 25, 29.52440), -dms(37, 39, 10.15610), dms(143, 55, 35.38390));
  near(r.distanceM, 54972.271, 0.001, 'distance');
  near(r.initialBearing, dms(306, 52, 5.37), 0.5 / 3600, 'initial');
  near(r.finalBearing, dms(127, 10, 25.07) + 180, 0.5 / 3600, 'final (= reverse + 180)');
});
test('Spherical vs ellipsoidal distance agree within 0.5 % (Jakarta → Makkah)', function () {
  var g = geo.greatCircle(-6.2088, 106.8456, 21.4225, 39.8262);
  assert.ok(Math.abs(g.distanceM - g.ellipsoidal.distanceM) / g.distanceM < 0.005);
});
test('Coincident points → zero distance, no bearing', function () {
  var g = geo.greatCircle(-6.1, 106.8, -6.1, 106.8);
  assert.strictEqual(g.distanceM, 0); assert.strictEqual(g.initialBearing, null);
});
test('Invalid latitude/longitude rejected', function () {
  assert.throws(function () { geo.haversine(91, 0, 0, 0); }, /Latitude/);
  assert.throws(function () { geo.haversine(0, 181, 0, 0); }, /Longitude/);
  assert.throws(function () { geo.haversine(NaN, 0, 0, 0); });
});
test('Rhumb line: along meridian and equator equals great circle', function () {
  near(geo.rhumb(0, 0, 10, 0).distanceM, geo.haversine(0, 0, 10, 0), 1e-6);
  near(geo.rhumb(0, 0, 0, 10).distanceM, geo.haversine(0, 0, 0, 10), 1e-6);
  near(geo.rhumb(0, 0, 0, 10).bearing, 90, 1e-9);
});
test('Rhumb line is never shorter than great circle', function () {
  var cases = [[-6.1, 106.88, 21.42, 39.83], [51.5, -0.1, 40.7, -74], [-33.9, 18.4, -31.9, 115.9]];
  cases.forEach(function (c) {
    assert.ok(geo.rhumb(c[0], c[1], c[2], c[3]).distanceM >= geo.haversine(c[0], c[1], c[2], c[3]) - 1e-6);
  });
});
test('Rhumb line takes the short way across the antimeridian', function () {
  var r = geo.rhumb(0, 179, 0, -179);
  near(r.distanceM, geo.haversine(0, 179, 0, -179), 1e-6);
  near(r.bearing, 90, 1e-9);
});
test('Rhumb bearing on a parallel at 60° N is due east', function () {
  near(geo.rhumb(60, 0, 60, 10).bearing, 90, 1e-9);
  near(geo.rhumb(60, 0, 60, 10).distanceM / 1852, 10 * 60.0405 * 0.5, 1e-3); // 10° × 60.04 NM/° × cos60°
});
test('16-point compass names', function () {
  assert.strictEqual(geo.compassPoint(0), 'N'); assert.strictEqual(geo.compassPoint(295), 'WNW');
  assert.strictEqual(geo.compassPoint(359), 'N'); assert.strictEqual(geo.compassPoint(135), 'SE');
});

console.log('\nCoordinates');
test('Parse DD, DDM, DMS and hemisphere letters', function () {
  near(coords.parse('-6.104170', 'lat').value, -6.10417, 1e-9);
  near(coords.parse("06° 06.250' S", 'lat').value, -(6 + 6.25 / 60), 1e-9);
  near(coords.parse('106 52 48 E', 'lon').value, 106.88, 1e-9);
  near(coords.parse('6°6\'15"S', 'lat').value, -(6 + 6 / 60 + 15 / 3600), 1e-9);
  near(coords.parse('6,5 LS', 'lat').value, -6.5, 1e-9);     // Indonesian: Lintang Selatan, decimal comma
  near(coords.parse('106 BT', 'lon').value, 106, 1e-9);      // Bujur Timur
  near(coords.parse('10 BB', 'lon').value, -10, 1e-9);       // Bujur Barat
});
test('Reject out-of-range and malformed coordinates', function () {
  assert.ok(!coords.parse('91', 'lat').ok);
  assert.ok(!coords.parse('181', 'lon').ok);
  assert.ok(!coords.parse('10 61', 'lat').ok);              // minutes ≥ 60
  assert.ok(!coords.parse('10 E', 'lat').ok);               // wrong hemisphere for axis
  assert.ok(!coords.parse('-10 S', 'lat').ok);              // double negative
  assert.ok(!coords.parse('abc', 'lat').ok);
  assert.ok(!coords.parse('', 'lat').ok);
});
test('Format DDM and DMS with correct rounding carry', function () {
  assert.strictEqual(coords.formatDDM(-6.104166667, 'lat'), "06° 06.250′ S");
  assert.strictEqual(coords.formatDMS(106.88, 'lon'), '106° 52′ 48.0″ E');
  assert.strictEqual(coords.formatDMS(10.9999999, 'lat'), '11° 00′ 00.0″ N'); // 59.99996″ rounds up
  assert.strictEqual(coords.formatDDM(10.99999999, 'lat'), '11° 00.000′ N');
});
test('DD → DMS → DD round trip', function () {
  [-6.1234567, 0, 45.5, -179.99, 89.999].forEach(function (v) {
    var s = coords.formatDMS(v, 'lon', 4);
    near(coords.parse(s, 'lon').value, v, 1e-7, s);
  });
});

console.log('\nUnits');
test('Maritime: 1 NM = 1.852 km = 10 cables; 1 fathom = 6 ft', function () {
  near(units.convert(1, 'maritime', 'nm', 'km'), 1.852, 1e-12);
  near(units.convert(1, 'maritime', 'nm', 'cable'), 10, 1e-12);
  near(units.convert(1, 'maritime', 'fathom', 'ft'), 6, 1e-12);
});
test('Speed: 10 kn = 18.52 km/h; 1 m/s = 3.6 km/h; 60 mph = 96.56064 km/h', function () {
  near(units.convert(10, 'speed', 'kn', 'kmh'), 18.52, 1e-12);
  near(units.convert(1, 'speed', 'ms', 'kmh'), 3.6, 1e-12);
  near(units.convert(60, 'speed', 'mph', 'kmh'), 96.56064, 1e-9);
});
test('Length, time, angle', function () {
  near(units.convert(1, 'length', 'ft', 'in'), 12, 1e-12);
  near(units.convert(1, 'length', 'km', 'mm'), 1e6, 1e-6);
  near(units.convert(1, 'time', 'd', 'min'), 1440, 1e-12);
  near(units.convert(Math.PI, 'angle', 'rad', 'deg'), 180, 1e-12);
  near(units.convert(1, 'angle', 'deg', 'arcsec'), 3600, 1e-9);
});
test('Temperature: 100 °C = 212 °F = 373.15 K; −40 °C = −40 °F; below 0 K rejected', function () {
  near(units.convert(100, 'temperature', 'c', 'f'), 212, 1e-12);
  near(units.convert(100, 'temperature', 'c', 'k'), 373.15, 1e-12);
  near(units.convert(-40, 'temperature', 'c', 'f'), -40, 1e-12);
  assert.throws(function () { units.convert(-300, 'temperature', 'c', 'k'); });
});

console.log('\nSpeed / Distance / Time & ETA');
test('Time = Distance / Speed: 120 NM at 12 kn = 10 h', function () {
  near(nav.time(120, 'nm', 12, 'kn', 'h'), 10, 1e-12);
});
test('Distance = Speed × Time: 15 kn for 90 min = 22.5 NM', function () {
  near(nav.distance(15, 'kn', 90, 'min', 'nm'), 22.5, 1e-12);
});
test('Speed = Distance / Time: 100 km in 2 h = 26.998 kn', function () {
  near(nav.speed(100, 'km', 2, 'h', 'kn'), 100 / 1.852 / 2, 1e-12);
});
test('Zero / negative speed and time rejected', function () {
  assert.throws(function () { nav.time(100, 'nm', 0, 'kn'); }, /greater than zero/);
  assert.throws(function () { nav.speed(100, 'nm', 0, 'h'); }, /greater than zero/);
  assert.throws(function () { nav.time(-1, 'nm', 10, 'kn'); }, /negative/);
});
test('ETA: depart 2026-11-23 08:00 (UTC+7), 525 NM at 14 kn → 37.5 h → 2026-11-24 21:30', function () {
  var dep = Date.UTC(2026, 10, 23, 8, 0) - 7 * 3600000;
  var r = nav.eta(dep, 525, 14);
  near(r.hours, 37.5, 1e-12);
  var arrLocal = new Date(r.arrivalUtcMs + 7 * 3600000);
  assert.strictEqual(arrLocal.toISOString().slice(0, 16), '2026-11-24T21:30');
  assert.strictEqual(nav.formatDuration(37.5), '1 d 13 h 30 min');
});

console.log('\nSolar / astronomy');
test('Equation of time extremes: ≈ +16.4 min (3 Nov), ≈ −14.2 min (11 Feb)', function () {
  near(solar.sunPosition(Date.UTC(2024, 10, 3, 12)).eotMinutes, 16.4, 0.15);
  near(solar.sunPosition(Date.UTC(2024, 1, 11, 12)).eotMinutes, -14.2, 0.15);
});
test('Declination at June solstice 2024 (20 Jun 20:51 UTC) ≈ +23.44°', function () {
  near(solar.sunPosition(Date.UTC(2024, 5, 20, 20, 51)).declination, 23.44, 0.01);
});
test('Declination at March equinox 2024 (20 Mar 03:06 UTC) ≈ 0°', function () {
  near(solar.sunPosition(Date.UTC(2024, 2, 20, 3, 6)).declination, 0, 0.01);
});
test('Merpass at Greenwich, 3 Nov 2024 ≈ 11:43:36 UTC (12:00 − EoT 16m24s)', function () {
  var m = solar.merpass({ y: 2024, m: 11, d: 3 }, 51.4779, 0, 0);
  near(utcHM(m.utcMs), 11 + 43 / 60 + 36 / 3600, 20 / 3600);
  assert.strictEqual(m.sunBearing, 180);
});
test('Merpass shifts 4 min per degree of longitude (Jakarta 106.8456° E ≈ 04:51 UTC on 3 Nov)', function () {
  var m = solar.merpass({ y: 2024, m: 11, d: 3 }, -6.2088, 106.8456, 7);
  var expected = 12 - 16.4 / 60 - 106.8456 * 4 / 60; // ≈ 4.60 h
  near(utcHM(m.utcMs), expected, 1 / 60);
});
test('Noon altitude = 90° − |lat − dec|', function () {
  var m = solar.merpass({ y: 2024, m: 6, d: 21 }, 23.44, 0, 0);
  near(m.altitude, 90, 0.05);
});
test('London 21 Jun 2024: sunrise ≈ 03:43 UTC, sunset ≈ 20:21 UTC (published 04:43 / 21:21 BST)', function () {
  var s = solar.sunTimes({ y: 2024, m: 6, d: 21 }, 51.5074, -0.1278, 1);
  near(utcHM(s.sunrise), 3 + 43 / 60, 2 / 60, 'sunrise');
  near(utcHM(s.sunset), 20 + 21 / 60, 2 / 60, 'sunset');
  near(s.dayLengthHours, 16 + 38 / 60, 3 / 60, 'day length');
});
test('Equator at equinox: day length ≈ 12 h 7 min (refraction + semi-diameter)', function () {
  var s = solar.sunTimes({ y: 2024, m: 3, d: 20 }, 0, 0, 0);
  near(s.dayLengthHours, 12 + 7 / 60, 2 / 60);
});
test('Polar night and midnight sun handled (Tromsø 69.65° N)', function () {
  assert.strictEqual(solar.sunTimes({ y: 2024, m: 12, d: 21 }, 69.65, 18.96, 1).status, 'polar-night');
  assert.strictEqual(solar.sunTimes({ y: 2024, m: 6, d: 21 }, 69.65, 18.96, 2).status, 'midnight-sun');
});
test('Sunrise < solar noon < sunset, all on the requested local date (Jakarta, UTC+7)', function () {
  var s = solar.sunTimes({ y: 2026, m: 11, d: 23 }, -6.2088, 106.8456, 7);
  assert.ok(s.sunrise < s.solarNoon && s.solarNoon < s.sunset);
  [s.sunrise, s.solarNoon, s.sunset].forEach(function (t) {
    assert.strictEqual(new Date(t + 7 * 3600000).toISOString().slice(0, 10), '2026-11-23');
  });
});
test('Date line: Samoa-like offset +13 at 171.8° W still returns the local date', function () {
  var s = solar.sunTimes({ y: 2026, m: 1, d: 15 }, -13.83, -171.76, 13);
  assert.strictEqual(new Date(s.solarNoon + 13 * 3600000).toISOString().slice(0, 10), '2026-01-15');
});

console.log('\nPrayer (Maghrib)');
test('Kemenag method = sunset + 2 min ihtiyat; flagged unverified', function () {
  var r = prayer.maghrib({ y: 2026, m: 11, d: 23 }, -6.2088, 106.8456, 7, { method: 'kemenag' });
  near((r.utcMs - r.sunset) / 60000, 2, 1e-6);
  assert.strictEqual(r.method.verified, false);
});
test('Jafari (4°) Maghrib is later than sunset', function () {
  var r = prayer.maghrib({ y: 2026, m: 11, d: 23 }, -6.2088, 106.8456, 7, { method: 'jafari' });
  assert.ok(r.utcMs - r.sunset > 10 * 60000);
});
test('Custom method validates angle range', function () {
  assert.throws(function () { prayer.maghrib({ y: 2026, m: 1, d: 1 }, 0, 0, 0, { method: 'custom', customAngle: 45 }); });
});

console.log('\nQibla');
test('Qibla from Jakarta ≈ 295.1° true', function () {
  near(qibla.qibla(-6.2088, 106.8456).bearing, 295.15, 0.3);
});
test('Qibla from London ≈ 119.0°, New York ≈ 58.5°', function () {
  near(qibla.qibla(51.5074, -0.1278).bearing, 119.0, 0.3);
  near(qibla.qibla(40.7128, -74.0060).bearing, 58.5, 0.3);
});
test('Distance Jakarta → Kaaba ≈ 7 900 km', function () {
  near(qibla.qibla(-6.2088, 106.8456).distanceKm, 7900, 60);
});
test('True → magnetic with variation; relative turn', function () {
  near(qibla.trueToMagnetic(295, 1), 294, 1e-12);   // 1° E variation
  near(qibla.trueToMagnetic(5, -10), 15, 1e-12);    // 10° W variation
  near(qibla.relativeTurn(350, 10), 20, 1e-12);
  near(qibla.relativeTurn(10, 350), -20, 1e-12);
});
test('At the Kaaba there is no bearing', function () {
  assert.strictEqual(qibla.qibla(21.4225, 39.8262).atKaaba, true);
});

console.log('\nCalculator');
test('Basic arithmetic and precedence', function () {
  assert.strictEqual(calc.evaluate('2+3×4'), 14);
  assert.strictEqual(calc.evaluate('(2+3)×4'), 20);
  assert.strictEqual(calc.evaluate('10÷4'), 2.5);
  assert.strictEqual(calc.evaluate('-5+2'), -3);
  assert.strictEqual(calc.evaluate('7−10'), -3);
});
test('Floating point noise removed: 0.1 + 0.2 = 0.3', function () {
  assert.strictEqual(calc.evaluate('0.1+0.2'), 0.3);
  assert.strictEqual(calc.evaluate('1.1×3'), 3.3);
});
test('Percent: 200×10% = 20; 200+10% = 220; 200−25% = 150; 50% = 0.5', function () {
  assert.strictEqual(calc.evaluate('200×10%'), 20);
  assert.strictEqual(calc.evaluate('200+10%'), 220);
  assert.strictEqual(calc.evaluate('200-25%'), 150);
  assert.strictEqual(calc.evaluate('50%'), 0.5);
});
test('Division by zero and malformed input raise errors', function () {
  assert.throws(function () { calc.evaluate('5÷0'); }, /divide by zero/);
  assert.throws(function () { calc.evaluate('5+'); });
  assert.throws(function () { calc.evaluate('(5+2'); });
  assert.throws(function () { calc.evaluate('1..2'); });
});

console.log('\nPort database');
test('All ports have valid coordinates, unique ids and are flagged unverified', function () {
  var ids = {};
  ports.all().forEach(function (p) {
    assert.strictEqual(geo.validate(p.lat, p.lon), null, p.name);
    assert.ok(!ids[p.id], 'duplicate ' + p.id); ids[p.id] = 1;
    assert.strictEqual(typeof p.verified, 'boolean');
  });
  assert.ok(ports.all().length >= 10);
});
test('Tanjung Priok → Tanjung Perak is a plausible straight-line distance (≈ 370 NM)', function () {
  var a = ports.byId('id-tpriok'), b = ports.byId('id-tperak');
  near(geo.greatCircle(a.lat, a.lon, b.lat, b.lon).distanceNM, 370, 15);
});
test('Port search matches name, city and alias', function () {
  assert.strictEqual(ports.search('surabaya')[0].id, 'id-tperak');
  assert.strictEqual(ports.search('bali')[0].id, 'id-benoa');
});

console.log('\nNMEA 0183 (external GPS)');
function withCs(body) { return '$' + body + '*' + nmea.checksum(body); }
test('Checksum of the classic GGA example is 47; RMC example is 6A', function () {
  assert.strictEqual(nmea.checksum('GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,'), '47');
  assert.strictEqual(nmea.checksum('GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W'), '6A');
});
test('GGA: position, quality, satellites, HDOP, altitude', function () {
  var r = nmea.parseSentence('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47');
  assert.ok(r.ok); assert.strictEqual(r.type, 'GGA'); assert.strictEqual(r.checksum, 'valid');
  near(r.data.lat, 48 + 7.038 / 60, 1e-9); near(r.data.lon, 11 + 31 / 60, 1e-9);
  assert.strictEqual(r.data.quality, 1); assert.strictEqual(r.data.satellites, 8);
  near(r.data.hdop, 0.9, 1e-12); near(r.data.altitude, 545.4, 1e-12);
});
test('RMC: status, speed, course, date/time, magnetic variation (W negative)', function () {
  var r = nmea.parseSentence('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A');
  assert.ok(r.data.valid); near(r.data.sogKn, 22.4, 1e-12); near(r.data.cogT, 84.4, 1e-12);
  assert.deepStrictEqual(r.data.date, { y: 1994, m: 3, d: 23 }); near(r.data.magVar, -3.1, 1e-12);
});
test('Southern / eastern hemisphere (Tanjung Priok area), GN talker', function () {
  var r = nmea.parseSentence(withCs('GNRMC,083000.00,A,0606.2400,S,10652.8000,E,0.05,,241126,,,A'));
  near(r.data.lat, -6.104, 1e-9); near(r.data.lon, 106.88, 1e-9); assert.strictEqual(r.talker, 'GN');
});
test('Wrong checksum rejected; missing checksum accepted but flagged', function () {
  assert.ok(!nmea.parseSentence('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*48').ok);
  var r = nmea.parseSentence('$GPGLL,4916.45,N,12311.12,W,225444,A');
  assert.ok(r.ok); assert.strictEqual(r.checksum, 'missing'); near(r.data.lon, -(123 + 11.12 / 60), 1e-9);
});
test('No-fix sentences are not treated as positions', function () {
  assert.strictEqual(nmea.parseSentence(withCs('GPGGA,123519,,,,,0,00,99.9,,M,,M,,')).data.valid, false);
  assert.strictEqual(nmea.parseSentence(withCs('GPRMC,123519,V,,,,,,,230394,,')).data.valid, false);
});
test('VTG in both old and NMEA 2.3 layouts', function () {
  near(nmea.parseSentence('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K').data.sogKn, 5.5, 1e-12);
  near(nmea.parseSentence(withCs('GPVTG,054.7,034.4,005.5,010.2')).data.cogT, 54.7, 1e-12);
});
test('Receiver: split chunks, merge GGA+RMC, estimate accuracy from HDOP, lose fix on V', function () {
  var rx = nmea.createReceiver({ now: function () { return 1000; } });
  var gga = withCs('GNGGA,083000.00,0606.2400,S,10652.8000,E,1,09,1.2,4.0,M,15.0,M,,');
  var rmc = withCs('GNRMC,083000.00,A,0606.2400,S,10652.8000,E,7.5,091.0,241126,,,A');
  var stream = gga + '\r\n' + rmc + '\r\n';
  rx.push(stream.slice(0, 20)); assert.strictEqual(rx.fix(), null);
  rx.push(stream.slice(20));
  var f = rx.fix();
  near(f.lat, -6.104, 1e-9); assert.strictEqual(f.satellites, 9); near(f.accuracy, 6, 1e-9); assert.strictEqual(f.accuracyEstimated, true);
  near(f.speed, 7.5 * 1852 / 3600, 1e-9); near(f.heading, 91, 1e-12);
  assert.strictEqual(new Date(f.gpsTime).toISOString(), '2026-11-24T08:30:00.000Z');
  rx.push(withCs('GNRMC,083001.00,V,,,,,,,241126,,,N') + '\n');
  assert.strictEqual(rx.fix(), null);
  assert.strictEqual(rx.stats().rejected, 0);
});
test('Garbage and proprietary lines are ignored without crashing', function () {
  var rx = nmea.createReceiver();
  var res = rx.push('\u0000ÿnoise\n$PUBX,00,foo*00\nhello\n');
  assert.strictEqual(res.filter(function (r) { return r.ok; }).length, 0);
  assert.strictEqual(rx.fix(), null);
});

test('Signal K delta: position, SOG (m/s), COG (rad → °), satellites, HDOP', function () {
  var st = {};
  var changed = nmea.applySignalK({ context: 'vessels.self', updates: [{ timestamp: '2026-11-24T08:30:00.000Z', values: [
    { path: 'navigation.position', value: { latitude: -6.104, longitude: 106.88 } },
    { path: 'navigation.speedOverGround', value: 3.858 },
    { path: 'navigation.courseOverGroundTrue', value: Math.PI / 2 },
    { path: 'navigation.gnss.satellites', value: 11 },
    { path: 'navigation.gnss.horizontalDilution', value: 0.8 }] }] }, st, 5000);
  assert.ok(changed);
  var f = nmea.signalKFix(st);
  near(f.lat, -6.104, 1e-12); near(f.heading, 90, 1e-9); near(f.speed, 3.858, 1e-12);
  assert.strictEqual(f.satellites, 11); near(f.accuracy, 4, 1e-9); assert.strictEqual(f.timestamp, 5000);
});
test('Signal K: hello message and out-of-range positions are ignored', function () {
  var st = {};
  assert.ok(!nmea.applySignalK({ name: 'signalk-server', version: '2.0.0', self: 'vessels.urn:mrn:x' }, st, 1));
  assert.ok(!nmea.applySignalK({ updates: [{ values: [{ path: 'navigation.position', value: { latitude: 123, longitude: 0 } }] }] }, st, 1));
  assert.strictEqual(nmea.signalKFix(st), null);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
