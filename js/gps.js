/*
 * MEIKO — position sources.
 *
 *  1. Phone / tablet GPS  — browser Geolocation API. Also covers external receivers that the operating
 *     system itself uses (e.g. receivers made for iOS location services, or an Android "mock location"
 *     app fed by a Bluetooth GPS): the browser then reports their position automatically.
 *  2. External GPS receiver, connected directly to MEIKO and read as NMEA 0183:
 *       - USB / serial       → Web Serial API   (Chrome / Edge, mainly desktop & Chromebook)
 *       - Bluetooth LE UART  → Web Bluetooth    (Chrome / Edge on Android, desktop) — Nordic UART Service
 *       - Network (Wi-Fi)    → WebSocket: Signal K delta stream or raw NMEA lines. Works in ALL browsers,
 *                              including Safari on iPhone/iPad (the only direct route there).
 *       - Test input          → pasted NMEA text, replayed every second (for checking without hardware)
 *     Safari (iPhone/iPad) supports neither Web Serial nor Web Bluetooth (Apple does not implement them).
 *
 * Source preference (Settings → GPS source):
 *   auto      external receiver when it is connected and has a fresh fix, otherwise phone GPS
 *   device    phone / tablet GPS only
 *   external  external receiver only
 *
 * Location permission is requested only when the user taps a GPS button. No position is ever invented.
 */
(function () {
  'use strict';
  var NMEA = window.MeikoCore.nmea;
  var last = MEIKO.storage.get('lastFix', null);
  var listeners = [];
  var watchId = null, extWatch = null;
  var FRESH_MS = 10000;

  function pref() { return MEIKO.settings.get('gpsSource') || 'auto'; }

  /* ---------------- Phone / tablet GPS (Geolocation API) ---------------- */
  function explain(err) {
    var e = explainMsg(err); if (err && err.code) e.code = err.code; return e;
  }
  function explainMsg(err) {
    if (!window.isSecureContext) return new Error('Location needs a secure (https) connection. Open MEIKO over https or from localhost, or enter coordinates manually.');
    if (!('geolocation' in navigator)) return new Error('This device or browser does not support GPS location. Enter coordinates manually or connect an external GPS receiver.');
    switch (err && err.code) {
      case 1: return new Error('Location permission was denied. Allow location for this site in your browser settings, or enter coordinates manually.');
      case 2: return new Error('Position unavailable. The device could not get a GPS fix — move to open sky (away from steel structures) and try again.');
      case 3: return new Error('Timed out waiting for a GPS fix. Try again outdoors or enter coordinates manually.');
      default: return new Error((err && err.message) || 'Could not determine your position.');
    }
  }
  function toFix(pos) {
    var c = pos.coords;
    return { lat: c.latitude, lon: c.longitude, accuracy: c.accuracy, altitude: c.altitude, altitudeAccuracy: c.altitudeAccuracy,
      speed: c.speed, heading: c.heading, timestamp: pos.timestamp || Date.now(), source: 'device', sourceLabel: 'Phone / tablet GPS' };
  }
  var lastSaved = 0;
  function store(fix) {
    last = fix;
    if (fix.source !== 'external' || Date.now() - lastSaved > 5000) { MEIKO.storage.set('lastFix', fix); lastSaved = Date.now(); }
    listeners.forEach(function (fn) { try { fn(fix); } catch (e) {} });
  }
  function deviceGet(opts) {
    return new Promise(function (resolve, reject) {
      if (!window.isSecureContext || !('geolocation' in navigator)) return reject(explain());
      navigator.geolocation.getCurrentPosition(function (pos) { var f = toFix(pos); store(f); resolve(f); },
        function (err) { reject(explain(err)); }, Object.assign({ enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }, opts || {}));
    });
  }

  /* ---------------- External receiver (NMEA 0183) ---------------- */
  var NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  var NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // device → app notifications
  var ext = { connected: false, kind: null, label: '', error: null, baud: null };
  var rx = NMEA.createReceiver();
  var sk = {}, skUpdates = 0; // Signal K state
  var rawLog = [], statusListeners = [], conn = {};
  var notifyTimer = null;

  function emitStatus() {
    if (notifyTimer) return;
    notifyTimer = setTimeout(function () { notifyTimer = null; statusListeners.forEach(function (fn) { try { fn(status()); } catch (e) {} }); }, 250);
  }
  function feed(text) {
    var res = rx.push(text);
    res.forEach(function (r) {
      rawLog.push({ t: Date.now(), line: r.raw, ok: r.ok, err: r.ok ? null : r.error });
      if (rawLog.length > 40) rawLog.shift();
    });
    var f = extFix();
    if (f) store(f);
    if (res.length) emitStatus();
  }
  function extFix() {
    var f = rx.fix();
    var g = NMEA.signalKFix(sk);
    if (g && (!f || g.timestamp > f.timestamp)) f = g;
    if (!f || !ext.connected || Date.now() - f.timestamp > FRESH_MS) return null;
    f.source = 'external'; f.sourceLabel = ext.label;
    return f;
  }
  function status() {
    var f = rx.fix() || NMEA.signalKFix(sk), st = Object.assign({}, rx.state()), stats = rx.stats();
    if (sk.lat != null) { st.satellites = sk.satellites; st.hdop = sk.hdop; }
    return { connected: ext.connected, kind: ext.kind, label: ext.label, baud: ext.baud, error: ext.error,
      fix: extFix(), hasFixEver: !!f, satellites: st.satellites, hdop: st.hdop, quality: st.quality,
      sentences: stats.sentences, rejected: stats.rejected, skUpdates: skUpdates, log: rawLog.slice() };
  }
  function setConnected(kind, label, extra) {
    rx.reset(); rawLog = []; sk = {}; skUpdates = 0;
    ext = Object.assign({ connected: true, kind: kind, label: label, error: null, baud: null }, extra || {});
    if (kind !== 'test') MEIKO.storage.set('extGps', { kind: kind, baud: ext.baud });
    emitStatus();
  }
  function setDisconnected(err) {
    ext.connected = false; ext.error = err || null;
    if (extWatch) { var w = extWatch; stop(); w.onErr(new Error(err || 'External GPS disconnected.')); }
    emitStatus();
  }
  function support() {
    return {
      serial: !!(navigator.serial && window.isSecureContext),
      bluetooth: !!(navigator.bluetooth && window.isSecureContext),
      network: typeof WebSocket !== 'undefined',
      secure: !!window.isSecureContext
    };
  }

  /* USB / serial via Web Serial */
  function openSerial(port, baud) {
    return port.open({ baudRate: baud }).then(function () {
      conn = { port: port, reading: true };
      setConnected('serial', 'USB / serial GPS', { baud: baud });
      var decoder = new TextDecoder();
      if (!port.readable) { setDisconnected('The receiver is not sending data.'); return; }
      var reader = port.readable.getReader(); conn.reader = reader;
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          feed(decoder.decode(r.value, { stream: true }));
          return pump();
        });
      }
      pump().catch(function (e) { if (conn.reading) setDisconnected('Serial read error: ' + e.message); })
        .then(function () { try { reader.releaseLock(); } catch (e) {} });
    });
  }
  function connectSerial(baud) {
    if (!support().serial) return Promise.reject(new Error('USB/serial GPS needs Chrome or Edge with Web Serial (not available in Safari or Firefox), over https.'));
    baud = +baud || 4800;
    return disconnect().then(function () { return navigator.serial.requestPort(); }).then(function (port) { return openSerial(port, baud); })
      .catch(function (e) { throw friendly(e, 'serial'); });
  }
  /** Re-open a previously authorised serial port without a prompt (called at start-up). */
  function autoReconnect() {
    var saved = MEIKO.storage.get('extGps', null);
    if (!saved || saved.kind !== 'serial' || pref() === 'device' || !support().serial || !navigator.serial.getPorts) return;
    navigator.serial.getPorts().then(function (ports) { if (ports.length && !ext.connected) return openSerial(ports[0], saved.baud || 4800); }).catch(function () {});
  }

  /* Bluetooth LE UART via Web Bluetooth */
  function connectBluetooth() {
    if (!support().bluetooth) return Promise.reject(new Error('Bluetooth GPS needs Chrome or Edge with Web Bluetooth (Android or desktop — not available in Safari/iOS or Firefox), over https.'));
    var decoder = new TextDecoder(), device;
    return disconnect().then(function () {
      return navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [NUS_SERVICE] });
    }).then(function (d) {
      device = d;
      device.addEventListener('gattserverdisconnected', function () { if (conn.device === device) setDisconnected('Bluetooth GPS disconnected.'); });
      return device.gatt.connect();
    }).then(function (server) { return server.getPrimaryService(NUS_SERVICE); })
      .then(function (svc) { return svc.getCharacteristic(NUS_TX); })
      .then(function (ch) {
        conn = { device: device, ch: ch };
        ch.addEventListener('characteristicvaluechanged', function (e) { feed(decoder.decode(e.target.value, { stream: true })); });
        return ch.startNotifications();
      }).then(function () { setConnected('bluetooth', 'Bluetooth GPS' + (device.name ? ' · ' + device.name : '')); })
      .catch(function (e) { if (device && device.gatt && device.gatt.connected) device.gatt.disconnect(); throw friendly(e, 'bluetooth'); });
  }

  /* Network (Wi-Fi) via WebSocket: Signal K JSON or raw NMEA lines */
  function connectNetwork(url) {
    url = String(url || '').trim();
    if (!/^wss?:\/\/[^\s]+$/i.test(url)) return Promise.reject(new Error('Enter a WebSocket address starting with ws:// or wss://, e.g. wss://192.168.1.10:3443/signalk/v1/stream?subscribe=self'));
    if (location.protocol === 'https:' && /^ws:/i.test(url)) return Promise.reject(new Error('This page is loaded over https, so the browser (including Safari) blocks an unencrypted ws:// connection. Use a wss:// address (enable SSL/TLS on your Signal K or gateway server), or open MEIKO from the boat\'s own http server.'));
    return disconnect().then(function () {
      return new Promise(function (resolve, reject) {
        var ws, opened = false, decoder = new TextDecoder();
        try { ws = new WebSocket(url); } catch (e) { return reject(new Error('Invalid address: ' + e.message)); }
        ws.binaryType = 'arraybuffer';
        var to = setTimeout(function () { if (!opened) { try { ws.close(); } catch (e) {} reject(new Error('No answer from ' + url + '. Check that the tablet is on the boat\'s Wi-Fi, the address/port is right and the server is running.')); } }, 8000);
        ws.onopen = function () {
          opened = true; clearTimeout(to);
          conn = { ws: ws };
          setConnected('network', 'Network GPS · ' + url.replace(/^wss?:\/\//i, '').split('/')[0]);
          MEIKO.storage.set('netGpsUrl', url);
          resolve();
        };
        ws.onmessage = function (ev) {
          var text = typeof ev.data === 'string' ? ev.data : decoder.decode(ev.data);
          var t = text.trim();
          if (t.charAt(0) === '{') {
            var msg; try { msg = JSON.parse(t); } catch (e) { return; }
            rawLog.push({ t: Date.now(), line: t.length > 160 ? t.slice(0, 160) + '…' : t, ok: true, err: null });
            if (rawLog.length > 40) rawLog.shift();
            if (NMEA.applySignalK(msg, sk, Date.now())) { skUpdates++; var f = extFix(); if (f) store(f); }
            emitStatus();
          } else feed(text.indexOf('\n') === -1 ? text + '\r\n' : text);
        };
        ws.onerror = function () { if (!opened) { clearTimeout(to); reject(new Error('Could not connect to ' + url + '. If it is wss://, the server\'s certificate must be trusted by this device.')); } };
        ws.onclose = function () { if (opened && conn.ws === ws) setDisconnected('Network GPS connection closed.'); };
      });
    });
  }

  /* Test input: replay pasted NMEA once a second */
  function connectTest(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return Promise.reject(new Error('Paste at least one NMEA sentence (e.g. $GPGGA… or $GPRMC…).'));
    return disconnect().then(function () {
      setConnected('test', 'NMEA test input');
      feed(lines.join('\r\n') + '\r\n');
      conn = { timer: setInterval(function () { feed(lines.join('\r\n') + '\r\n'); }, 1000) };
      if (!rx.fix()) ext.error = 'The pasted sentences contain no valid position fix.';
    });
  }

  function disconnect() {
    var c = conn; conn = {};
    var wasConnected = ext.connected;
    ext.connected = false;
    var jobs = [];
    if (c.timer) clearInterval(c.timer);
    if (c.ws) { try { c.ws.onclose = null; c.ws.close(); } catch (e) {} }
    if (c.port) {
      c.reading = false;
      jobs.push(Promise.resolve(c.reader && c.reader.cancel().catch(function () {})).then(function () { return c.port.close(); }).catch(function () {}));
    }
    if (c.device && c.device.gatt && c.device.gatt.connected) { try { c.device.gatt.disconnect(); } catch (e) {} }
    if (wasConnected) MEIKO.storage.remove('extGps');
    return Promise.all(jobs).then(function () { if (wasConnected) setDisconnected(null); });
  }

  function friendly(e, kind) {
    var n = e && e.name, m = (e && e.message) || String(e);
    if (n === 'NotFoundError' && kind === 'bluetooth' && /service|UUID/i.test(m)) return new Error('This Bluetooth device does not offer a Bluetooth LE UART (NUS) data service, so MEIKO cannot read it directly. See “Which receivers work?”.');
    if (n === 'NotFoundError') return new Error('No device was selected.');
    if (n === 'SecurityError' || n === 'NotAllowedError') return new Error('The browser blocked access to the device (' + m + ').');
    if (n === 'InvalidStateError') return new Error('The port is already open in another tab or app. Close it there and try again.');
    if (n === 'NetworkError') return new Error('Could not connect to the device. Make sure it is switched on, in range and not connected to another app.');
    return new Error(m);
  }

  function waitForExternalFix(timeoutMs) {
    return new Promise(function (resolve, reject) {
      var f = extFix(); if (f) return resolve(f);
      var t0 = Date.now();
      var iv = setInterval(function () {
        var g = extFix();
        if (g) { clearInterval(iv); resolve(g); }
        else if (!ext.connected || Date.now() - t0 > timeoutMs) { clearInterval(iv); reject(new Error(ext.connected ? 'The external GPS is connected but has no valid position fix yet (no satellites or status “V”). Give it clear sky and a minute to acquire.' : 'The external GPS is not connected. Connect it on the Position & GPS page, or set GPS source to Auto or Phone.')); }
      }, 250);
    });
  }

  /* ---------------- Location permission ---------------- */
  function platform() {
    var ua = navigator.userAgent || '';
    var ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var android = /Android/.test(ua);
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    return { ios: ios, android: android, standalone: !!standalone, safari: /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium|Edg\//.test(ua) };
  }
  /** Resolves to 'granted' | 'denied' | 'prompt' | 'unsupported' | 'insecure' | 'unknown'. */
  function permissionState() {
    if (!window.isSecureContext) return Promise.resolve('insecure');
    if (!('geolocation' in navigator)) return Promise.resolve('unsupported');
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve(MEIKO.storage.get('geoPerm', 'unknown'));
    return navigator.permissions.query({ name: 'geolocation' }).then(function (r) {
      MEIKO.storage.set('geoPerm', r.state);
      return r.state;
    }, function () { return MEIKO.storage.get('geoPerm', 'unknown'); });
  }
  function watchPermission(fn) {
    if (!navigator.permissions || !navigator.permissions.query || !window.isSecureContext) return;
    navigator.permissions.query({ name: 'geolocation' }).then(function (r) { r.onchange = function () { MEIKO.storage.set('geoPerm', r.state); fn(r.state); }; }, function () {});
  }
  /** Ask for permission now (must be called from a tap). Resolves with the fix or rejects with an explained error. */
  function requestPermission() {
    return deviceGet({ maximumAge: 0 }).then(function (f) { MEIKO.storage.set('geoPerm', 'granted'); return f; },
      function (e) { if (/denied/i.test(e.message)) MEIKO.storage.set('geoPerm', 'denied'); throw e; });
  }

  /* ---------------- Public API (used by all tools) ---------------- */
  function getPosition(opts) {
    var p = pref();
    if (p === 'external') return waitForExternalFix(8000);
    if (p === 'auto' && ext.connected) return waitForExternalFix(4000).catch(function () { return deviceGet(opts); });
    return deviceGet(opts);
  }
  function watch(onFix, onErr) {
    stop();
    var p = pref();
    if (p === 'external' || (p === 'auto' && ext.connected)) {
      if (!ext.connected) { onErr(new Error('The external GPS is not connected. Connect it below, or switch the GPS source to Auto or Phone.')); return; }
      var fn = function (f) { if (f.source === 'external') onFix(f); };
      listeners.push(fn); extWatch = { fn: fn, onErr: onErr };
      var f0 = extFix(); if (f0) onFix(f0);
      return;
    }
    if (!window.isSecureContext || !('geolocation' in navigator)) { onErr(explain()); return; }
    watchId = navigator.geolocation.watchPosition(function (pos) { var f = toFix(pos); store(f); onFix(f); },
      function (err) { onErr(explain(err)); }, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
  }
  function stop() {
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (extWatch) { var fn = extWatch.fn; listeners = listeners.filter(function (x) { return x !== fn; }); extWatch = null; }
  }
  function quality(acc) {
    if (acc == null) return { level: 'unknown', label: 'Accuracy unknown' };
    if (acc <= 20) return { level: 'good', label: 'Good' };
    if (acc <= 100) return { level: 'fair', label: 'Fair' };
    return { level: 'poor', label: 'Poor — position may be off by ' + Math.round(acc) + ' m or more' };
  }

  MEIKO.gps = {
    getPosition: getPosition, watch: watch, stop: stop, quality: quality,
    last: function () { return last; }, isWatching: function () { return watchId != null || !!extWatch; },
    onFix: function (fn) { listeners.push(fn); },
    source: pref, platform: platform, permissionState: permissionState, requestPermission: requestPermission, watchPermission: watchPermission,
    external: {
      support: support, status: status, connectSerial: connectSerial, connectBluetooth: connectBluetooth,
      connectTest: connectTest, connectNetwork: connectNetwork, disconnect: disconnect,
      onStatus: function (fn) { statusListeners.push(fn); return function () { statusListeners = statusListeners.filter(function (x) { return x !== fn; }); }; },
      NUS_SERVICE: NUS_SERVICE
    }
  };
  autoReconnect();
})();
