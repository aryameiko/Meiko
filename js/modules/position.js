/*
 * MEIKO — Position & GPS UI.
 * Shows only real fixes from the device. Never displays placeholder or fake coordinates.
 */
(function () {
  'use strict';
  var C = window.MeikoCore, ui = MEIKO.ui, icon = ui.icon;

  MEIKO.features.register({
    id: 'gps', cat: 'position', icon: 'i-gps', title: 'My Position',
    desc: 'Phone GPS or an external receiver, accuracy, altitude and saved places', keywords: 'gps location lokasi posisi koordinat latitude longitude save nmea external receiver bluetooth usb serial perangkat',
    lead: 'Position from your phone/tablet GPS or an external GPS receiver (NMEA 0183), in DD, DDM and DMS. Location is requested only when you tap a button.',
    render: function (view) {
      view.innerHTML = ui.pageHead(this) +
        '<div class="tool-grid"><div class="stack">' +
        '<div class="card card-pad" data-perm></div>' +
        '<div class="card card-pad"><div class="flex"><button class="btn btn-primary grow" data-get>' + icon('i-gps') + 'Get current position</button>' +
        '<button class="btn btn-ghost" data-watch>' + icon('i-route') + 'Track</button></div>' +
        '<div data-status class="mt-12"></div></div>' +
        '<div class="card card-pad form-gap"><div class="card-title">' + icon('i-gps') + 'GPS source<span class="spacer"></span><span data-ext-badge></span></div>' +
        '<div class="seg" data-src><button type="button" data-v="auto">Auto</button><button type="button" data-v="device">Phone / tablet</button><button type="button" data-v="external">External receiver</button></div>' +
        '<small class="hint" data-src-hint></small>' +
        '<div class="form-gap" data-ext-panel>' +
        '<div class="flex"><button class="btn btn-ghost btn-sm" data-con-serial>' + icon('i-plus') + 'USB / serial</button>' +
        '<label class="field" style="flex-direction:row;align-items:center;gap:6px"><span class="small">Baud</span><select data-baud style="min-height:36px;width:auto;padding:4px 30px 4px 10px;font-size:14px"><option>4800</option><option>9600</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></label>' +
        '<button class="btn btn-ghost btn-sm" data-con-ble>' + icon('i-plus') + 'Bluetooth LE</button>' +
        '</div><div data-ios-note></div>' +
        '<div class="flex" style="flex-wrap:nowrap"><input class="input" data-net-url placeholder="wss://192.168.1.10:3443/signalk/v1/stream?subscribe=self" autocomplete="off" autocapitalize="off" spellcheck="false" style="min-height:36px;font-size:14px;flex:1;min-width:0">' +
        '<button class="btn btn-ghost btn-sm" data-con-net>' + icon('i-plus') + 'Network (Wi-Fi)</button></div>' +
        '<div class="flex"><button class="btn btn-danger btn-sm" data-discon hidden>' + icon('i-x') + 'Disconnect</button></div>' +
        '<div data-ext-err></div><div data-ext-status></div>' +
        '<details class="help" style="margin-top:0"><summary>' + icon('i-info') + 'Which receivers work?</summary><div class="body">' +
          '<p><b>Phone / tablet GPS</b> works in every browser. Many external receivers can also be used this way: receivers that pair with iPhone/iPad and supply iOS Location Services, or on Android a Bluetooth GPS shared through a “mock location” app. The browser then reports their position as the phone\'s own — keep the source on <b>Auto</b> or <b>Phone / tablet</b>.</p>' +
          '<p><b>Direct connection</b> (MEIKO reads NMEA 0183 itself: GGA, RMC, GLL, VTG):</p><ul>' +
          '<li><b>USB / serial</b> — USB GPS dongles, or a USB-to-serial (RS-232/RS-422) adapter on the ship\'s NMEA output. Needs Chrome or Edge with Web Serial (desktop, Chromebook; Android support depends on the Chrome version). NMEA 0183 standard speed is 4800 baud; many modern receivers use 9600 or higher.</li>' +
          '<li><b>Bluetooth LE</b> — receivers or bridges (e.g. ESP32-based) that send NMEA over the Bluetooth LE UART service (Nordic UART, NUS). Needs Chrome/Edge on Android or desktop. Classic Bluetooth (SPP) receivers cannot be opened directly by a browser — use the phone-GPS route above for those.</li>' +
          '<li><b>Network (Wi-Fi)</b> — a Signal K server or Wi-Fi NMEA gateway that offers a WebSocket. Signal K JSON and raw NMEA lines are both understood. <b>Works in every browser, including Safari on iPhone/iPad.</b> Because MEIKO runs on https, the address must be <b>wss://</b> (secure); plain ws:// is blocked by the browser.</li>' +
          '<li>Safari on iPhone/iPad and Firefox do not support Web Serial or Web Bluetooth. On iPad/iPhone use an iOS-compatible receiver through Location Services, or the Network option.</li></ul>' +
          '<p>Accuracy for external receivers is <b>estimated</b> as HDOP × 5 m because NMEA does not report it directly. Never connect an RS-422 ship bus without the correct isolated adapter.</p></div></details>' +
        '<details class="help" style="margin-top:0" data-monitor><summary>' + icon('i-book') + 'NMEA monitor</summary><div class="body"><div class="mono small" data-log style="max-height:220px;overflow:auto;white-space:pre-wrap;word-break:break-all">No data yet.</div></div></details>' +
        '<details class="help" style="margin-top:0"><summary>' + icon('i-grid') + 'Test with NMEA text</summary><div class="body form-gap"><p>Paste sentences from your receiver\'s log to check them without hardware. They are replayed every second and labelled “NMEA test input”.</p>' +
          '<textarea data-test rows="4" class="input mono" style="font-size:13px" spellcheck="false" placeholder="$GPGGA,...*hh&#10;$GPRMC,...*hh"></textarea>' +
          '<div class="flex"><button class="btn btn-ghost btn-sm" data-test-go>' + icon('i-check') + 'Start test input</button></div></div></details>' +
        '</div></div>' +
        '<div class="result" data-fix></div>' +
        '</div><div class="results-col"><div class="card card-pad"><div class="card-title">' + icon('i-star') + 'Saved positions<span class="spacer"></span><button class="btn btn-ghost btn-sm" data-add>' + icon('i-plus') + 'Add manually</button></div><div data-saved></div></div></div></div>' +
        ui.help('About GPS accuracy', '<ul><li>Accuracy is the device\'s own estimate (68 % confidence radius). Good: ≤ 20 m, fair: ≤ 100 m, poor: > 100 m.</li><li>Indoors, inside a steel hull or under a bridge deck the fix may be poor or unavailable. Tablets without a GPS chip estimate position from Wi-Fi, which can be off by hundreds of metres or more.</li><li>Altitude from phone GPS is approximate and referenced to the WGS-84 ellipsoid or mean sea level depending on the device.</li><li>Whether GPS works offline depends on your device and operating system.</li></ul>') +
        ui.disclaimer();
      var statusEl = ui.$('[data-status]', view), fixEl = ui.$('[data-fix]', view), savedEl = ui.$('[data-saved]', view);
      var getBtn = ui.$('[data-get]', view), watchBtn = ui.$('[data-watch]', view);

      function renderFix(f) {
        if (!f) {
          fixEl.innerHTML = ui.empty('i-gps', 'No position yet', 'Tap “Get current position”. Your browser will ask for permission the first time.');
          return;
        }
        var q = MEIKO.gps.quality(f.accuracy), age = Math.round((Date.now() - f.timestamp) / 1000);
        var ageTxt = age < 60 ? 'just now' : age < 3600 ? Math.round(age / 60) + ' min ago' : Math.round(age / 3600) + ' h ago';
        var fmt = MEIKO.settings.get('coordFormat');
        var spd = f.speed != null && isFinite(f.speed) ? ui.num(C.units.convert(f.speed, 'speed', 'ms', 'kn'), 1) + ' <small>kn</small>' : null;
        var ext = f.source === 'external';
        var html = '<div class="result-head">' + icon('i-pin') + '<h3>Position fix</h3><span class="badge info">' + ui.esc(f.sourceLabel || 'Phone / tablet GPS') + '</span><span class="badge ' + (q.level === 'good' ? 'ok' : q.level === 'fair' ? 'info' : 'warn') + '">' + q.label.split(' —')[0] + '</span></div>' +
          '<div class="result-big"><div class="k">Latitude</div><div class="v" style="font-size:28px">' + ui.esc(C.coords.format(f.lat, 'lat', fmt)) + '</div>' +
          '<div class="k" style="margin-top:10px">Longitude</div><div class="v" style="font-size:28px">' + ui.esc(C.coords.format(f.lon, 'lon', fmt)) + '</div></div>' +
          ui.kv([
            ['DD', '<span class="mono">' + C.coords.formatPair(f.lat, f.lon, 'DD') + '</span>'],
            ['DDM', '<span class="mono">' + C.coords.formatPair(f.lat, f.lon, 'DDM') + '</span>'],
            ['DMS', '<span class="mono">' + C.coords.formatPair(f.lat, f.lon, 'DMS') + '</span>'],
            ['Accuracy', f.accuracy != null ? '±' + ui.num(f.accuracy, 0) + ' <small>m' + (f.accuracyEstimated ? ' (est. from HDOP)' : '') + '</small>' : '<small>not reported</small>'],
            ext ? ['Fix type · satellites', ui.esc(f.qualityLabel || '—') + ' · ' + (f.satellites != null ? f.satellites : '—') + ' <small>sats</small>'] : null,
            ext && f.hdop != null ? ['HDOP', ui.num(f.hdop, 1)] : null,
            ext && f.magVar != null ? ['Magnetic variation (receiver)', ui.num(Math.abs(f.magVar), 1) + '° ' + (f.magVar >= 0 ? 'E' : 'W')] : null,
            ext && f.gpsTime ? ['GPS time (UTC)', ui.time(f.gpsTime, 0, { seconds: true, format: '24' }) + ' <small>UTC</small>'] : null,
            ['Altitude', f.altitude != null ? ui.num(f.altitude, 0) + ' <small>m' + (f.altitudeAccuracy ? ' ±' + Math.round(f.altitudeAccuracy) : '') + '</small>' : '<small>not available</small>'],
            spd ? ['Speed (GPS)', spd] : null,
            f.heading != null && isFinite(f.heading) ? ['Course (GPS)', ui.bearing(f.heading, 0) + ' <small>T</small>'] : null,
            ['Fix time', ui.date(f.timestamp) + ' ' + ui.time(f.timestamp, null, { seconds: true }) + ' <small>' + ageTxt + '</small>']
          ]) +
          (q.level === 'poor' ? '<div style="padding:0 18px 12px">' + ui.notice('warn', '<b>Poor accuracy.</b> ' + ui.esc(q.label.split('— ')[1] || '') + '. Move to open sky and try again.') + '</div>' : '') +
          '<div style="padding:0 18px 16px" class="flex"><button class="btn btn-ghost btn-sm" data-cp="DD">' + icon('i-copy') + 'Copy DD</button><button class="btn btn-ghost btn-sm" data-cp="DDM">' + icon('i-copy') + 'Copy DDM</button><button class="btn btn-ghost btn-sm" data-cp="DMS">' + icon('i-copy') + 'Copy DMS</button><button class="btn btn-gold btn-sm" data-savefix>' + icon('i-star') + 'Save</button></div>';
        fixEl.innerHTML = html;
        ui.$$('[data-cp]', fixEl).forEach(function (b) { b.addEventListener('click', function () { ui.copy(C.coords.formatPair(f.lat, f.lon, b.dataset.cp), 'Coordinates copied'); }); });
        ui.$('[data-savefix]', fixEl).addEventListener('click', function () { MEIKO.app.promptSave(f.lat, f.lon, renderSaved); });
      }
      function renderSaved() {
        var list = MEIKO.storage.locations.all();
        if (!list.length) { savedEl.innerHTML = '<p class="small muted">No saved positions. Save your current fix or add one manually — saved positions are available in every tool via the “Saved” button.</p>'; return; }
        savedEl.innerHTML = '<ul class="list">' + list.map(function (l) {
          return '<li><div class="grow"><b>' + ui.esc(l.name) + '</b><small>' + ui.esc(ui.coordPair(l.lat, l.lon)) + '</small></div>' +
            '<button class="icon-btn" data-cps="' + l.id + '" aria-label="Copy">' + icon('i-copy') + '</button><button class="icon-btn" data-del="' + l.id + '" aria-label="Delete">' + icon('i-trash') + '</button></li>';
        }).join('') + '</ul>';
      }
      savedEl.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var l = MEIKO.storage.locations.all().filter(function (x) { return x.id === (b.dataset.cps || b.dataset.del); })[0];
        if (!l) return;
        if (b.dataset.cps) ui.copy(ui.coordPair(l.lat, l.lon), 'Coordinates copied');
        if (b.dataset.del) { MEIKO.storage.locations.remove(l.id); renderSaved(); ui.toast('Deleted “' + l.name + '”'); }
      });
      ui.$('[data-add]', view).addEventListener('click', function () { MEIKO.app.addLocationManually(renderSaved); });

      function setStatus(kind, msg) { statusEl.innerHTML = msg ? ui.notice(kind, msg) : ''; }
      getBtn.addEventListener('click', function () {
        getBtn.disabled = true; setStatus('', 'Requesting position… allow location access if your browser asks.');
        MEIKO.gps.getPosition({ maximumAge: 0 }).then(function (f) { setStatus('', ''); renderFix(f); }, function (err) { setStatus('err', ui.esc(err.message)); })
          .then(function () { getBtn.disabled = false; });
      });
      var gw = null;
      function gpsOff() { if (gw) MEIKO.gps.stop(gw); gw = null; }
      watchBtn.addEventListener('click', function () {
        if (gw) { gpsOff(); watchBtn.classList.remove('btn-gold'); watchBtn.innerHTML = icon('i-route') + 'Track'; setStatus('', ''); return; }
        watchBtn.classList.add('btn-gold'); watchBtn.innerHTML = icon('i-x') + 'Stop'; setStatus('', 'Tracking — position updates continuously.');
        gw = MEIKO.gps.watch(function (f) { renderFix(f); }, function (err) { setStatus('err', ui.esc(err.message)); gpsOff(); watchBtn.classList.remove('btn-gold'); watchBtn.innerHTML = icon('i-route') + 'Track'; });
      });
      /* ---- GPS source & external receiver ---- */
      var X = MEIKO.gps.external, sup = X.support();
      var srcSeg = ui.$('[data-src]', view), srcHint = ui.$('[data-src-hint]', view), extStatus = ui.$('[data-ext-status]', view);
      var btnSerial = ui.$('[data-con-serial]', view), btnBle = ui.$('[data-con-ble]', view), btnDis = ui.$('[data-discon]', view);
      var baudSel = ui.$('[data-baud]', view), logEl = ui.$('[data-log]', view), badgeEl = ui.$('[data-ext-badge]', view);
      var HINTS = { auto: 'Uses the external receiver when it is connected and has a fix; otherwise the phone/tablet GPS.', device: 'Uses only the phone/tablet location (including receivers the operating system already uses).', external: 'Uses only the external receiver connected below.' };
      baudSel.value = String((MEIKO.storage.get('extGps', {}) || {}).baud || 4800);
      function syncSrc() {
        var v = MEIKO.settings.get('gpsSource') || 'auto';
        ui.$$('button', srcSeg).forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
        srcHint.textContent = HINTS[v];
      }
      srcSeg.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; MEIKO.settings.set('gpsSource', b.dataset.v); syncSrc(); });
      if (!sup.serial) { btnSerial.disabled = true; btnSerial.title = 'Web Serial is not available in this browser'; baudSel.disabled = true; }
      if (!sup.bluetooth) { btnBle.disabled = true; btnBle.title = 'Web Bluetooth is not available in this browser'; }
      var pf = MEIKO.gps.platform(), netUrl = ui.$('[data-net-url]', view), btnNet = ui.$('[data-con-net]', view);
      netUrl.value = MEIKO.storage.get('netGpsUrl', '') || '';
      if (pf.ios && !sup.serial && !sup.bluetooth) btnSerial.parentNode.hidden = true;
      if (pf.ios || (!sup.serial && !sup.bluetooth)) {
        ui.$('[data-ios-note]', view).innerHTML = ui.notice('', (pf.ios ? '<b>iPhone / iPad:</b> Safari cannot connect USB or Bluetooth devices directly (Apple does not support Web Serial / Web Bluetooth). ' : '<b>This browser</b> cannot connect USB or Bluetooth devices directly. ') +
          'Use an <b>iOS-compatible GPS receiver</b> through Location Services (keep source on Auto or Phone), or a <b>Network (Wi-Fi)</b> GPS below. <a href="#" data-lh>Show me how</a>');
        ui.$('[data-lh]', view).addEventListener('click', function (e) { e.preventDefault(); MEIKO.app.showLocationHelp(); });
      }
      MEIKO.app.mountPermission(ui.$('[data-perm]', view), function (f) { renderFix(f); });
      function renderExt(st) {
        st = st || X.status();
        btnDis.hidden = !st.connected;
        badgeEl.innerHTML = st.connected ? '<span class="badge ' + (st.fix ? 'ok' : 'warn') + '">' + (st.fix ? 'external · fix' : 'external · no fix') + '</span>' : '';
        var html = '';
        if (st.connected) {
          var info = ui.esc(st.label) + (st.baud ? ' · ' + st.baud + ' baud' : '') + ' · ' + (st.skUpdates ? st.skUpdates + ' Signal K updates' : st.sentences + ' sentences') + (st.rejected ? ', ' + st.rejected + ' rejected' : '');
          if (st.fix) html = ui.notice('ok', '<b>Connected.</b> ' + info + '<br>' + ui.esc(st.fix.qualityLabel || 'Fix') + ' · ' + (st.satellites != null ? st.satellites + ' satellites' : 'satellites n/a') + (st.hdop != null ? ' · HDOP ' + st.hdop : ''));
          else html = ui.notice('warn', '<b>Connected, no position fix yet.</b> ' + info + '<br>' + (st.sentences ? 'The receiver is sending data but has no valid fix (status V / quality 0). Give it clear sky.' : 'Waiting for NMEA data… check the baud rate if nothing arrives.'));
        } else {
          html = st.error ? ui.notice('err', ui.esc(st.error)) : '<p class="small muted">No external receiver connected.' + (!sup.serial && !sup.bluetooth ? ' This browser cannot connect receivers directly (Web Serial / Web Bluetooth unavailable) — use the phone-GPS route explained below.' : '') + '</p>';
        }
        extStatus.innerHTML = html;
        if (ui.$('[data-monitor]', view).open) logEl.textContent = st.log.length ? st.log.map(function (l) { return (l.ok ? '✓ ' : '✗ ') + l.line + (l.ok ? '' : '   ← ' + l.err); }).join('\n') : 'No data yet.';
        if (st.fix && (MEIKO.settings.get('gpsSource') || 'auto') !== 'device' && !gw) renderFix(st.fix);
      }
      function busy(btn, p) {
        ui.$('[data-ext-err]', view).innerHTML = '';
        var old = btn.innerHTML; btn.disabled = true; btn.innerHTML = icon('i-gps') + 'Connecting…';
        return p.then(function () { btn.disabled = false; btn.innerHTML = old; renderExt(); ui.toast('External GPS connected'); },
          function (err) { btn.disabled = false; btn.innerHTML = old; renderExt(); ui.$('[data-ext-err]', view).innerHTML = ui.notice('err', ui.esc(err.message)); });
      }
      btnSerial.addEventListener('click', function () { busy(btnSerial, X.connectSerial(+baudSel.value)); });
      btnBle.addEventListener('click', function () { busy(btnBle, X.connectBluetooth()); });
      btnNet.addEventListener('click', function () { busy(btnNet, X.connectNetwork(netUrl.value)); });
      btnDis.addEventListener('click', function () { X.disconnect().then(function () { ui.toast('External GPS disconnected'); renderExt(); }); });
      ui.$('[data-test-go]', view).addEventListener('click', function (e) { busy(e.currentTarget, X.connectTest(ui.$('[data-test]', view).value)); });
      ui.$('[data-monitor]', view).addEventListener('toggle', function () { renderExt(); });
      var offStatus = X.onStatus(renderExt);
      syncSrc(); renderExt();

      var last = MEIKO.gps.last();
      renderFix(last);
      if (last) setStatus('', 'Showing your last fix from ' + ui.date(last.timestamp) + ' ' + ui.time(last.timestamp) + '. Tap “Get current position” to refresh.');
      renderSaved();
      return function () { gpsOff(); offStatus(); };
    }
  });
})();
