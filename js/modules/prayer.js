/*
 * MEIKO — Prayer tools UI: Maghrib time. (Qibla is in qibla.js)
 * Maths: js/core/prayer.js + js/core/solar.js
 */
(function () {
  'use strict';
  var C = window.MeikoCore, ui = MEIKO.ui, icon = ui.icon, A = MEIKO.astroUI;
  var METHODS = C.prayer.METHODS;

  MEIKO.features.register({
    id: 'maghrib', cat: 'prayer', icon: 'i-moon', title: 'Maghrib Time',
    desc: 'Maghrib prayer time for any position and date', keywords: 'sholat salat shalat magrib prayer sunset kemenag jadwal',
    lead: 'Astronomically computed Maghrib time with a configurable calculation method.',
    render: function (view) {
      var methodOpts = Object.keys(METHODS).map(function (k) { return '<option value="' + k + '">' + ui.esc(METHODS[k].name) + '</option>'; }).join('');
      view.innerHTML = ui.pageHead(this) + '<div class="tool-grid"><form class="card card-pad form-gap" novalidate>' +
        A.placeDateBlock(
          '<label class="field"><span>Calculation method</span><select name="method">' + methodOpts + '</select><small class="hint" data-mnote></small></label>' +
          '<div class="row" data-custom hidden><label class="field"><span>Sun below horizon (°)</span><input name="cAngle" inputmode="decimal" placeholder="0 = standard sunset"></label>' +
          '<label class="field"><span>Offset / ihtiyat (min)</span><input name="cOff" inputmode="decimal" placeholder="0"></label></div>' +
          '<label class="field"><span>Elevation above surroundings (m, optional)</span><input name="h" inputmode="decimal" placeholder="0"></label>') +
        '<div class="actions"><button class="btn btn-primary" type="submit">' + icon('i-check') + 'Calculate</button><button class="btn btn-ghost" type="button" data-reset>' + icon('i-reset') + 'Reset</button></div></form>' +
        '<div class="results-col" data-out>' + ui.empty('i-moon', 'No result yet', 'Enter a position (or use GPS), date and time zone.') + '</div></div>' +
        ui.help('About the methods', '<p>Maghrib begins when the Sun has fully set. Most methods use standard sunset (Sun\'s upper limb on the horizon). Some add a precautionary <i>ihtiyat</i>; Shia methods wait until the Sun is 4°–4.5° below the horizon.</p>' +
          '<p><b>Kementerian Agama RI:</b> MEIKO uses parameters commonly cited for Indonesia (Maghrib = sunset + 2 minutes ihtiyat). <b>These have not yet been verified against an official Kemenag publication</b>, so results must not be presented as the official schedule.</p>' +
          '<p>Times are rounded <b>up</b> to the next whole minute, as is conventional for published prayer schedules. Always follow your local mosque or official schedule.</p>') +
        ui.disclaimer('Prayer times are astronomical estimates for guidance. They are not an official schedule. Verify with your local religious authority.');
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var pd = A.bindPlaceDate(form, 'maghrib', function () { calc(true); });
      A.prefillFromGps(pd);
      var methodEl = ui.$('[name=method]', form), custom = ui.$('[data-custom]', form), mnote = ui.$('[data-mnote]', form);
      function syncMethod() {
        var m = METHODS[methodEl.value] || METHODS.kemenag;
        custom.hidden = methodEl.value !== 'custom';
        mnote.textContent = m.note;
      }
      methodEl.addEventListener('change', syncMethod); syncMethod();
      function calc(silent) {
        var r = pd.read(); if (!r.ok) { if (!silent) ui.showError(out, r.error); return; }
        var hRaw = ui.$('[name=h]', form).value.trim(), h = hRaw ? Number(hRaw.replace(',', '.')) : 0;
        if (!isFinite(h) || h < 0 || h > 9000) { ui.showError(out, 'Elevation must be between 0 and 9 000 m.'); return; }
        var opts = { method: methodEl.value, customAngle: ui.$('[name=cAngle]', form).value.replace(',', '.'), customOffsetMin: ui.$('[name=cOff]', form).value.replace(',', '.'), heightM: h };
        var res; try { res = C.prayer.maghrib(r.date, r.lat, r.lon, r.tz, opts); } catch (e) { ui.showError(out, e.message); return; }
        if (!res.ok) { ui.showResult(out, ui.resultCard('Maghrib', '<div style="padding:16px 18px">' + ui.notice('warn', ui.esc(res.reason)) + '</div>', { icon: 'i-moon' })); return; }
        var t = C.prayer.ceilMinute(res.utcMs);
        // Next 7 days table
        var rows = '';
        for (var i = 0; i < 7; i++) {
          var dd = new Date(Date.UTC(r.date.y, r.date.m - 1, r.date.d + i));
          var dt = { y: dd.getUTCFullYear(), m: dd.getUTCMonth() + 1, d: dd.getUTCDate() };
          var x; try { x = C.prayer.maghrib(dt, r.lat, r.lon, r.tz, opts); } catch (e) { x = { ok: false }; }
          rows += '<tr' + (i === 0 ? ' class="today"' : '') + '><td>' + ui.dateYMD(dt) + '</td><td>' + (x.ok ? ui.time(C.prayer.ceilMinute(x.utcMs), r.tz) : '—') + '</td></tr>';
        }
        var badge = res.method.verified ? '<span class="badge ok">verified</span>' : '<span class="badge warn">unverified method</span>';
        var html = ui.resultCard('Maghrib', ui.big('Maghrib', ui.time(t, r.tz), ui.tzLabel(r.tz), ui.dateYMD(r.date)) +
          ui.kv([
            ['Location', '<small>' + ui.esc(ui.coordPair(r.lat, r.lon)) + '</small>'],
            ['Method', ui.esc(res.method.name)],
            ['Sunset (computed)', ui.time(res.sunset, r.tz, { seconds: true })],
            ['Sun altitude used', ui.num(res.altitudeUsed, 3) + '°'],
            ['Ihtiyat / offset', (res.offsetMin >= 0 ? '+' : '') + res.offsetMin + ' min']
          ]) + '<div style="padding:0 18px 14px"><div class="section-title" style="margin-top:4px">Next 7 days</div><table class="table">' + rows + '</table></div>',
          { copy: true, icon: 'i-moon', badge: badge, foot: ui.esc(res.method.note) + ' Not an official schedule.' });
        ui.showResult(out, html, 'MEIKO · Maghrib ' + ui.dateYMD(r.date) + '\n' + ui.coordPair(r.lat, r.lon) + '\nMaghrib: ' + ui.time(t, r.tz) + ' ' + ui.tzLabel(r.tz) + '\nMethod: ' + res.method.name + (res.method.verified ? '' : ' (parameters unverified)') + '\nAstronomical estimate, not an official schedule.');
      }
      form.addEventListener('change', function () { calc(true); });
      form.addEventListener('input', function (e) { if (/^(h|cAngle|cOff)$/.test(e.target.name)) calc(true); });
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-reset]', form).addEventListener('click', function () { pd.reset(); methodEl.value = 'kemenag'; syncMethod(); out.innerHTML = ui.empty('i-moon', 'No result yet', 'Enter a position, date and time zone.'); });
      calc(true);
    }
  });
})();
