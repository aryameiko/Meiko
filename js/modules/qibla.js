/*
 * MEIKO — Qibla finder UI.
 * Bearing maths: js/core/qibla.js (initial great-circle bearing to the Kaaba, true north).
 *
 * Compass sensor notes:
 *  - iOS Safari exposes `webkitCompassHeading` (magnetic, relative to device top) after
 *    DeviceOrientationEvent.requestPermission() is granted from a user gesture.
 *  - Chrome/Android exposes `deviceorientationabsolute` (alpha relative to magnetic north via the magnetometer).
 *  - A plain `deviceorientation` event with absolute=false is NOT referenced to north and is ignored.
 * Phone compasses read MAGNETIC north and are disturbed by steel and electronics. MEIKO never claims
 * the sensor is calibrated; the bearing is always shown relative to TRUE north as the primary result.
 */
(function () {
  'use strict';
  var C = window.MeikoCore, ui = MEIKO.ui, icon = ui.icon;

  function compassSVG() {
    var t = '';
    for (var a = 0; a < 360; a += 5) {
      var major = a % 30 === 0, mid = a % 10 === 0, r1 = major ? 80 : mid ? 84 : 86.5, rad = (a - 90) * Math.PI / 180;
      t += '<line x1="' + (100 + r1 * Math.cos(rad)).toFixed(2) + '" y1="' + (100 + r1 * Math.sin(rad)).toFixed(2) + '" x2="' + (100 + 90 * Math.cos(rad)).toFixed(2) + '" y2="' + (100 + 90 * Math.sin(rad)).toFixed(2) + '" stroke="currentColor" stroke-opacity="' + (major ? .7 : .3) + '" stroke-width="' + (major ? 1.4 : .8) + '"/>';
      if (major && a % 90 !== 0) {
        var rl = 70, x = 100 + rl * Math.cos(rad), y = 100 + rl * Math.sin(rad) + 2.6;
        t += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" font-size="7.5" fill="currentColor" fill-opacity=".55" transform="rotate(' + a + ' ' + x.toFixed(1) + ' ' + (y - 2.6).toFixed(1) + ')">' + a + '</text>';
      }
    }
    var cards = [['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(function (c) {
      var rad = (c[1] - 90) * Math.PI / 180, x = 100 + 68 * Math.cos(rad), y = 100 + 68 * Math.sin(rad) + 4.5;
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" font-size="13" font-weight="800" fill="' + (c[0] === 'N' ? '#D23B32' : 'currentColor') + '" transform="rotate(' + c[1] + ' ' + x.toFixed(1) + ' ' + (y - 4.5).toFixed(1) + ')">' + c[0] + '</text>';
    }).join('');
    return '<svg viewBox="0 0 200 200" role="img" aria-label="Qibla compass">' +
      '<circle class="ring-glow" cx="100" cy="100" r="97" fill="none" stroke="var(--ok)" stroke-width="5" stroke-opacity=".55"/>' +
      '<circle cx="100" cy="100" r="94" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="1"/>' +
      '<g class="dial" data-dial>' + t + cards +
        '<circle cx="100" cy="100" r="56" fill="none" stroke="currentColor" stroke-opacity=".08"/>' +
        '<g data-qarrow><line x1="100" y1="100" x2="100" y2="34" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M100 22 109 38H91z" fill="var(--accent)"/>' +
        '<g transform="translate(91 4)"><rect x="1" y="3" width="16" height="14" rx="1.5" fill="#111"/><rect x="1" y="6" width="16" height="2.4" fill="#C9A227"/></g></g>' +
      '</g>' +
      '<path d="M100 1 106 12H94z" fill="var(--text)" data-lubber/>' +
      '<circle cx="100" cy="100" r="6" fill="var(--primary)"/><circle cx="100" cy="100" r="2.4" fill="var(--surface)"/>' +
      '</svg>';
  }

  MEIKO.features.register({
    id: 'qibla', cat: 'prayer', icon: 'i-kaaba', title: 'Qibla Finder',
    desc: 'Direction to the Kaaba from any position', keywords: 'kiblat kaaba mecca makkah direction compass arah',
    lead: 'Qibla direction measured clockwise from <b>true north</b>, from your GPS position or coordinates you enter.',
    render: function (view) {
      view.innerHTML = ui.pageHead(this) +
        '<div class="tool-grid qibla-grid"><div class="stack">' +
        '<div class="card card-pad form-gap"><button class="btn btn-primary" style="width:100%" type="button" data-locate>' + icon('i-gps') + 'Use my current location</button>' +
        '<div class="small muted" style="text-align:center">or enter coordinates manually</div>' +
        '<form class="form-gap" novalidate>' + ui.coordField('p', 'Your position', { noGps: true }) +
        '<label class="field"><span>Magnetic variation (optional, ° — east positive, west negative)</span><input name="var" inputmode="decimal" placeholder="Auto (WMM2025)"><small class="hint">Leave empty to use the World Magnetic Model 2025 (works offline), or enter the value from your chart\'s compass rose. Used only for the live compass.</small></label>' +
        '<div class="actions" style="margin-top:4px"><button class="btn btn-ghost" type="submit">' + icon('i-check') + 'Calculate</button><button class="btn btn-ghost" type="button" data-save>' + icon('i-star') + 'Save position</button><button class="btn btn-ghost" type="button" data-reset>' + icon('i-reset') + 'Reset</button></div></form></div>' +
        '</div>' +
        '<div class="results-col"><div class="result"><div class="result-head">' + icon('i-kaaba') + '<h3>Qibla direction</h3><span class="badge info" data-mode-badge>true north up</span></div>' +
        '<div style="padding:16px 18px 6px">' +
        '<div class="compass" data-compass>' + compassSVG() + '</div>' +
        '<div class="compass-readout"><div class="big" data-bearing>—</div><div class="muted small" data-sub>Set a position to calculate</div><div class="turn" data-turn></div></div>' +
        '</div>' +
        '<div data-kv></div>' +
        '<div style="padding:0 18px 16px" class="form-gap"><button class="btn btn-gold" style="width:100%" type="button" data-sensor>' + icon('i-nav') + 'Start live compass</button><div data-sensor-msg></div></div>' +
        '<div class="result-foot" data-foot>Bearing is relative to <b>true north</b>. A phone compass points to <b>magnetic north</b> and may differ by the local variation plus any sensor error.</div></div></div></div>' +
        ui.help('Compass calibration & accuracy', '<ul>' +
          '<li><b>True vs magnetic:</b> the Qibla bearing shown is from true (geographic) north. A magnetic compass differs by the local magnetic variation. The live compass corrects for it with the World Magnetic Model 2025, or with the value you enter above.</li>' +
          '<li><b>Calibrate:</b> move the phone slowly in a figure-8 pattern several times, then hold it flat (screen up), away from your body.</li>' +
          '<li><b>Interference:</b> metal objects, magnets, phone cases with magnets, speakers, vehicles and especially <b>ship steel structures and electrical equipment</b> can deflect the sensor by many degrees. On board, prefer the ship\'s gyro/true heading: steer or face the true bearing shown.</li>' +
          '<li>MEIKO cannot tell whether your sensor is calibrated. Treat the live compass as approximate; the calculated bearing is the reliable figure.</li>' +
          '<li>Without a compass sensor you can still use the bearing: e.g. with the Sun\'s azimuth, a known landmark, or a properly corrected compass.</li></ul>' +
          '<p>Method: initial great-circle bearing from your position to the Kaaba (21.4225° N, 39.8262° E, approximate).</p>') +
        ui.disclaimer('Qibla direction is calculated mathematically. Device compass readings are approximate and may be affected by magnetic interference.');

      var form = ui.$('form', view), compass = ui.$('[data-compass]', view);
      var dialEl = ui.$('[data-dial]', view), arrow = ui.$('[data-qarrow]', view);
      var bearingEl = ui.$('[data-bearing]', view), subEl = ui.$('[data-sub]', view), turnEl = ui.$('[data-turn]', view), kvEl = ui.$('[data-kv]', view);
      var sensorBtn = ui.$('[data-sensor]', view), sensorMsg = ui.$('[data-sensor-msg]', view), modeBadge = ui.$('[data-mode-badge]', view);
      var p = ui.bindCoord(form, 'p', { onChange: function () { calc(true); } });
      var store = ui.persist(form, 'qibla');
      var current = null, heading = null, live = false, gotEvent = false, smooth = null, handler = null, evName = null, noSensorTimer = null;

      /** Variation typed by the user, or (field empty) the World Magnetic Model value for the position. */
      function variation() {
        var raw = String(ui.$('[name=var]', form).value).trim().replace(',', '.');
        if (raw !== '') { var v = Number(raw); return isFinite(v) && Math.abs(v) <= 60 ? v : 0; }
        if (current && C.wmm) { try { var d = C.wmm.declination(current.lat, current.lon); return isFinite(d) ? Math.round(d * 10) / 10 : 0; } catch (e) {} }
        return 0;
      }
      function varIsAuto() { return String(ui.$('[name=var]', form).value).trim() === '' && !!C.wmm; }
      function draw() {
        if (!current || current.atKaaba) { arrow.style.display = 'none'; return; }
        arrow.style.display = '';
        var target = live ? C.qibla.trueToMagnetic(current.bearing, variation()) : current.bearing;
        arrow.setAttribute('transform', 'rotate(' + target.toFixed(2) + ' 100 100)');
        var rot = live && heading != null ? -heading : 0;
        dialEl.style.transform = 'rotate(' + rot.toFixed(2) + 'deg)';
        if (live && heading != null) {
          var turn = C.qibla.relativeTurn(heading, target), abs = Math.abs(turn);
          var aligned = abs <= 3;
          compass.classList.toggle('aligned', aligned);
          turnEl.className = 'turn' + (aligned ? ' ok' : '');
          turnEl.textContent = aligned ? 'Facing the Qibla (±3°)' : 'Turn ' + Math.round(abs) + '° ' + (turn > 0 ? 'right' : 'left') + ' · heading ' + ui.bearing(heading, 0) + (variation() ? ' M' : ' (magnetic)');
        } else { compass.classList.remove('aligned'); turnEl.textContent = ''; }
      }
      function calc(silent) {
        var c = p.get();
        if (!c.ok) { if (!silent) ui.showError(kvEl, c.error); current = null; bearingEl.textContent = '—'; subEl.textContent = 'Set a position to calculate'; draw(); return; }
        try { current = C.qibla.qibla(c.lat, c.lon); } catch (e) { ui.showError(kvEl, e.message); return; }
        current.lat = c.lat; current.lon = c.lon;
        if (current.atKaaba) {
          bearingEl.innerHTML = '—'; subEl.textContent = 'You are at the Kaaba.'; kvEl.innerHTML = ''; draw(); return;
        }
        bearingEl.innerHTML = ui.bearing(current.bearing) + '<small> T</small>';
        subEl.textContent = C.geo.compassPoint(current.bearing) + ' · clockwise from true north';
        var v = variation();
        kvEl.innerHTML = ui.kv([
          ['Qibla (true)', ui.bearing(current.bearing) + ' <small>T</small>'],
          v ? ['Qibla (magnetic, var ' + (v > 0 ? v + '° E' : Math.abs(v) + '° W') + (varIsAuto() ? ', WMM2025' : '') + ')', ui.bearing(C.qibla.trueToMagnetic(current.bearing, v)) + ' <small>M</small>'] : null,
          ['Distance to Kaaba', ui.num(current.distanceKm, 0) + ' <small>km · ' + ui.num(current.distanceNM, 0) + ' NM</small>'],
          ['Your position', '<small>' + ui.esc(ui.coordPair(c.lat, c.lon)) + '</small>']
        ]) + '<div style="padding:0 18px 12px"><button class="btn btn-ghost btn-sm" type="button" data-copy-q>' + icon('i-copy') + 'Copy</button></div>';
        ui.$('[data-copy-q]', kvEl).addEventListener('click', function () {
          ui.copy('MEIKO · Qibla\nPosition ' + ui.coordPair(c.lat, c.lon) + '\nQibla ' + ui.bearing(current.bearing) + ' True (' + C.geo.compassPoint(current.bearing) + ')\nDistance to Kaaba ' + ui.num(current.distanceKm, 0) + ' km', 'Qibla copied');
        });
        draw();
      }

      /* ---- GPS ---- */
      var locBtn = ui.$('[data-locate]', view);
      locBtn.addEventListener('click', function () {
        locBtn.disabled = true; locBtn.innerHTML = icon('i-gps') + 'Getting position…';
        MEIKO.gps.getPosition().then(function (f) {
          p.set(f.lat, f.lon); calc(true);
          var q = MEIKO.gps.quality(f.accuracy);
          ui.toast((f.source === 'external' ? 'External GPS' : 'Position') + (f.accuracy != null ? ' ±' + Math.round(f.accuracy) + ' m (' + q.label.split(' —')[0] + ')' : ''));
        }, function (err) {
          kvEl.innerHTML = '<div style="padding:12px 18px">' + ui.notice('err', ui.esc(err.message)) + '</div>';
        }).then(function () { locBtn.disabled = false; locBtn.innerHTML = icon('i-gps') + 'Use my current location'; });
      });

      /* ---- Compass sensor ---- */
      function screenAngle() {
        var a = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : 0);
        return a || 0;
      }
      function onOrient(e) {
        var h = null, acc = null;
        if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) { h = e.webkitCompassHeading; acc = e.webkitCompassAccuracy; }
        else if (e.absolute && typeof e.alpha === 'number') { h = 360 - e.alpha; }
        if (h == null) return;
        gotEvent = true;
        h = C.geo.norm360(h + screenAngle());
        // circular low-pass filter
        if (smooth == null) smooth = h; else smooth = C.geo.norm360(smooth + C.geo.norm180(h - smooth) * 0.25);
        heading = smooth;
        if (acc != null && acc >= 0) sensorMsg.innerHTML = '<p class="small muted">Sensor-reported accuracy ±' + Math.round(acc) + '°' + (acc > 20 ? ' — poor, calibrate with a figure-8 motion.' : '') + '</p>';
        else if (acc === -1) sensorMsg.innerHTML = ui.notice('warn', 'The sensor reports it is uncalibrated. Move the phone in a figure-8 pattern.');
        draw();
      }
      function stopSensor() {
        if (handler) window.removeEventListener(evName, handler, true);
        handler = null; live = false; heading = null; smooth = null; clearTimeout(noSensorTimer);
        sensorBtn.innerHTML = icon('i-nav') + 'Start live compass'; modeBadge.textContent = 'true north up'; draw();
      }
      function startListening() {
        evName = ('ondeviceorientationabsolute' in window) ? 'deviceorientationabsolute' : 'deviceorientation';
        handler = onOrient; window.addEventListener(evName, handler, true);
        live = true; gotEvent = false;
        sensorBtn.innerHTML = icon('i-x') + 'Stop live compass'; modeBadge.textContent = 'live · magnetic';
        sensorMsg.innerHTML = '<p class="small muted">Hold the device flat, screen up. Waiting for compass sensor…</p>';
        noSensorTimer = setTimeout(function () {
          if (!gotEvent) {
            stopSensor();
            sensorMsg.innerHTML = ui.notice('warn', '<b>No compass sensor available</b> on this device or browser. Use the true bearing above with another reference (ship\'s heading, landmark or a corrected compass).');
          }
        }, 3500);
      }
      sensorBtn.addEventListener('click', function () {
        if (live) { stopSensor(); sensorMsg.innerHTML = ''; return; }
        if (!current) { ui.toast('Set your position first'); return; }
        if (!window.isSecureContext) { sensorMsg.innerHTML = ui.notice('warn', 'The compass sensor needs a secure (https) connection.'); return; }
        if (typeof window.DeviceOrientationEvent === 'undefined') { sensorMsg.innerHTML = ui.notice('warn', '<b>No compass sensor support</b> in this browser. The calculated true bearing is still valid.'); return; }
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission().then(function (state) {
            if (state === 'granted') startListening();
            else sensorMsg.innerHTML = ui.notice('err', 'Compass (motion sensor) permission was denied. Allow it to use the live compass: on iPhone/iPad in Settings › Safari › Motion & Orientation Access, in Chrome under Site settings › Motion sensors.');
          }, function () { sensorMsg.innerHTML = ui.notice('err', 'Could not request compass permission.'); });
        } else startListening();
      });

      ui.$('[name=var]', form).addEventListener('input', function () { calc(true); });
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-save]', form).addEventListener('click', function () {
        var c = p.get(); if (!c.ok) { ui.toast('Enter a valid position first'); return; }
        MEIKO.app.promptSave(c.lat, c.lon);
      });
      ui.$('[data-reset]', form).addEventListener('click', function () { p.clear(); ui.$('[name=var]', form).value = ''; store.clear(); kvEl.innerHTML = ''; calc(true); });

      if (p.isEmpty()) { var f = MEIKO.gps.last(); if (f && Date.now() - f.timestamp < 6 * 3600000) p.set(f.lat, f.lon); }
      calc(true);
      return function () { stopSensor(); };
    }
  });
})();
