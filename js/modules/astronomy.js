/*
 * MEIKO — Astronomy UI: Meridian passage (Merpass) and Sunrise / Sunset.
 * Algorithms: js/core/solar.js (NOAA / Meeus).
 */
(function () {
  'use strict';
  var C = window.MeikoCore, ui = MEIKO.ui, icon = ui.icon;
  var S = function (k) { return MEIKO.settings.get(k); };

  /** Shared form block: position + date + time zone. */
  function placeDateBlock(extra) {
    var tz = S('tz');
    return ui.coordField('p', 'Position') +
      '<div class="row"><label class="field"><span>Date</span><input type="date" name="date"></label>' +
      '<label class="field"><span>Time zone (UTC offset)</span><select name="tz">' + ui.tzOptions(tz) + '</select></label></div>' +
      '<div class="flex"><button type="button" class="chip" data-today>' + icon('i-clock') + 'Today</button><button type="button" class="chip" data-tz-lon>' + icon('i-nav') + 'Zone from longitude</button></div>' + (extra || '');
  }
  function bindPlaceDate(form, key, onChange) {
    var ready = false;
    var p = ui.bindCoord(form, 'p', { onChange: function () { if (ready) onChange(); } });
    var store = ui.persist(form, key);
    var dateEl = ui.$('[name=date]', form), tzEl = ui.$('[name=tz]', form);
    if (!dateEl.value) dateEl.value = ui.todayISO(+tzEl.value);
    ui.$('[data-today]', form).addEventListener('click', function () { dateEl.value = ui.todayISO(+tzEl.value); onChange(); });
    ui.$('[data-tz-lon]', form).addEventListener('click', function () {
      var r = p.get(); if (!r.ok) { ui.toast('Enter a longitude first'); return; }
      var z = Math.round(r.lon / 15); tzEl.value = String(z);
      if (tzEl.value !== String(z)) { tzEl.insertAdjacentHTML('beforeend', '<option value="' + z + '">' + ui.tzLabel(z) + '</option>'); tzEl.value = String(z); }
      ui.toast('Nautical zone time ' + ui.tzLabel(z) + ' (zone description ' + (z > 0 ? '−' : z < 0 ? '+' : '') + Math.abs(z) + ')');
      onChange();
    });
    ready = true;
    return {
      coord: p, store: store,
      read: function () {
        var c = p.get(); if (!c.ok) return { ok: false, error: c.error };
        var d = ui.parseISODate(dateEl.value); if (!d) return { ok: false, error: 'Enter a valid date (1900–2200).' };
        return { ok: true, lat: c.lat, lon: c.lon, date: d, tz: +tzEl.value };
      },
      reset: function () { p.clear(); store.clear(); dateEl.value = ui.todayISO(S('tz')); tzEl.value = String(S('tz')); }
    };
  }
  function prefillFromGps(pd) {
    var f = MEIKO.gps.last();
    if (pd.coord.isEmpty() && f && Date.now() - f.timestamp < 6 * 3600000) pd.coord.set(f.lat, f.lon);
  }
  var DISC_ASTRO = 'Astronomical results are computed estimates (NOAA/Meeus algorithm). For celestial navigation, use the official Nautical Almanac.';

  /* ======================= Merpass ======================= */
  MEIKO.features.register({
    id: 'merpass', cat: 'astronomy', icon: 'i-noon', title: 'Merpass · Local Apparent Noon',
    desc: 'Time of the Sun\'s meridian passage for a noon sight', keywords: 'meridian passage lan noon sight equation of time declination',
    lead: 'When the Sun crosses your meridian — the moment of Local Apparent Noon — with the equation of time and declination.',
    render: function (view) {
      view.innerHTML = ui.pageHead(this) + '<div class="tool-grid"><form class="card card-pad form-gap" novalidate>' + placeDateBlock() +
        '<div class="actions"><button class="btn btn-primary" type="submit">' + icon('i-check') + 'Calculate</button><button class="btn btn-ghost" type="button" data-reset>' + icon('i-reset') + 'Reset</button></div></form>' +
        '<div class="results-col" data-out>' + ui.empty('i-noon', 'No result yet', 'Enter your position, the date and your time zone.') + '</div></div>' +
        ui.help('Method & accuracy', '<p>MEIKO solves for the instant the Sun\'s <b>local hour angle is zero</b> (upper transit), using the NOAA solar equations (after Meeus, <i>Astronomical Algorithms</i>). The Sun\'s position — including the <b>equation of time</b> — is recomputed at the transit instant itself.</p>' +
          '<span class="formula">Merpass (UTC) = 12:00 − EoT − Longitude (in time, E +)\nLocal (zone) time = UTC + zone offset\nNoon altitude = 90° − |Latitude − Declination|</span>' +
          '<p>This is <b>not</b> the simple "12:00 − longitude" approximation: it includes the equation of time (up to ±16 min). Expected accuracy is within a few seconds of almanac values; treat it as a planning estimate and use the Nautical Almanac for sight reduction.</p>') +
        ui.disclaimer(DISC_ASTRO);
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var pd = bindPlaceDate(form, 'merpass', function () { calc(true); });
      prefillFromGps(pd);
      function calc(silent) {
        var r = pd.read(); if (!r.ok) { if (!silent) ui.showError(out, r.error); return; }
        var m;
        try { m = C.solar.merpass(r.date, r.lat, r.lon, r.tz); } catch (e) { ui.showError(out, e.message); return; }
        var bearingTxt = m.sunBearing == null ? 'Overhead (zenith)' : (m.sunBearing === 180 ? 'Due South (180° T)' : 'Due North (000° T)');
        var html = ui.resultCard('Meridian passage', ui.big('Merpass · zone time', ui.time(m.utcMs, r.tz, { seconds: true }), ui.tzLabel(r.tz), ui.dateYMD(r.date) + ' · ' + ui.esc(ui.coordPair(r.lat, r.lon))) +
          ui.kv([
            ['Merpass UTC', ui.time(m.utcMs, 0, { seconds: true, format: '24' }) + ' <small>UTC</small>'],
            ['Local Mean Time of merpass', ui.time(Date.UTC(2000, 0, 1) + m.lmtMinutes * 60000, 0, { seconds: true, format: '24' }) + ' <small>LMT</small>'],
            ['Equation of time', ui.minutesToHMS(m.eotMinutes, true) + ' <small>(apparent − mean)</small>'],
            ['Longitude in time', ui.minutesToHMS(m.longitudeTimeMinutes, true)],
            ['Sun\'s declination', ui.esc(ui.decl(m.declination))],
            ['Sun\'s altitude at noon', ui.num(m.altitude, 2) + '°'],
            ['Sun bears at noon', bearingTxt]
          ]), { copy: true, icon: 'i-noon', badge: '<span class="badge info">estimate</span>', foot: 'Calculation: upper transit solved iteratively with NOAA/Meeus solar position; equation of time and declination evaluated at the transit instant. Accuracy: a few seconds vs almanac.' });
        ui.showResult(out, html, 'MEIKO · Merpass ' + ui.dateYMD(r.date) + '\nPosition ' + ui.coordPair(r.lat, r.lon) + '\nMerpass: ' + ui.time(m.utcMs, r.tz, { seconds: true }) + ' ' + ui.tzLabel(r.tz) + ' / ' + ui.time(m.utcMs, 0, { seconds: true, format: '24' }) + ' UTC\nEoT ' + ui.minutesToHMS(m.eotMinutes, true) + ', Dec ' + ui.decl(m.declination) + ', Alt ' + ui.num(m.altitude, 2) + '°');
      }
      form.addEventListener('change', function () { calc(true); });
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-reset]', form).addEventListener('click', function () { pd.reset(); out.innerHTML = ui.empty('i-noon', 'No result yet', 'Enter your position, the date and your time zone.'); });
      calc(true);
    }
  });

  /* ======================= Sunrise / sunset ======================= */
  MEIKO.features.register({
    id: 'sun', cat: 'astronomy', icon: 'i-sunset', title: 'Sunrise & Sunset',
    desc: 'Sunrise, sunset, solar noon, daylight and twilight', keywords: 'matahari terbit terbenam twilight daylight solar noon',
    lead: 'Sunrise, sunset, solar noon and daylight length — plus civil and nautical twilight.',
    render: function (view) {
      view.innerHTML = ui.pageHead(this) + '<div class="tool-grid"><form class="card card-pad form-gap" novalidate>' +
        placeDateBlock('<label class="field"><span>Height of eye above sea level (m, optional)</span><input name="h" inputmode="decimal" placeholder="0"><small class="hint">Adds horizon dip: a higher observer sees the Sun rise earlier and set later.</small></label>') +
        '<div class="actions"><button class="btn btn-primary" type="submit">' + icon('i-check') + 'Calculate</button><button class="btn btn-ghost" type="button" data-reset>' + icon('i-reset') + 'Reset</button></div></form>' +
        '<div class="results-col" data-out>' + ui.empty('i-sunset', 'No result yet', 'Enter a position (or use GPS), a date and time zone.') + '</div></div>' +
        ui.help('Method', '<p>Sunrise/sunset = upper limb of the Sun on the horizon, i.e. Sun\'s centre at −0.833° (34′ refraction + 16′ semi-diameter), solved iteratively with the NOAA solar equations. Civil twilight: −6°. Nautical twilight: −12°.</p><p>Accuracy is about ±1 minute between latitudes 72° N and 72° S; actual refraction depends on weather. Near the poles the Sun may not rise or set — MEIKO reports polar night or midnight sun instead of a time.</p>') +
        ui.disclaimer(DISC_ASTRO);
      var form = ui.$('form', view), out = ui.$('[data-out]', view);
      var pd = bindPlaceDate(form, 'sun', function () { calc(true); });
      prefillFromGps(pd);
      function ev(r, alt, side) { var e = C.solar.altitudeEvent(r.date, r.lat, r.lon, r.tz, alt, side); return e.utcMs ? ui.time(e.utcMs, r.tz) : '—'; }
      function calc(silent) {
        var r = pd.read(); if (!r.ok) { if (!silent) ui.showError(out, r.error); return; }
        var hRaw = ui.$('[name=h]', form).value.trim(), h = hRaw ? Number(hRaw.replace(',', '.')) : 0;
        if (!isFinite(h) || h < 0 || h > 9000) { ui.showError(out, 'Height must be between 0 and 9 000 m.'); return; }
        var s; try { s = C.solar.sunTimes(r.date, r.lat, r.lon, r.tz, { heightM: h }); } catch (e) { ui.showError(out, e.message); return; }
        var top;
        if (s.status === 'polar-night') top = ui.notice('warn', '<b>Polar night.</b> The Sun does not rise at this position on this date.');
        else if (s.status === 'midnight-sun') top = ui.notice('warn', '<b>Midnight sun.</b> The Sun does not set at this position on this date.');
        var dlMin = Math.round(s.dayLengthHours * 60), dlTxt = Math.floor(dlMin / 60) + ' h ' + String(dlMin % 60).padStart(2, '0') + ' min';
        var body = (top ? '<div style="padding:14px 18px 0">' + top + '</div>' : '') +
          '<div class="row" style="padding:18px 18px 4px;gap:8px">' +
          '<div><div class="small muted">' + icon('i-sun') + ' Sunrise</div><div style="font-size:30px;font-weight:700" class="num">' + ui.time(s.sunrise, r.tz) + '</div></div>' +
          '<div style="text-align:right"><div class="small muted">Sunset</div><div style="font-size:30px;font-weight:700" class="num">' + ui.time(s.sunset, r.tz) + '</div></div></div>' +
          ui.kv([
            ['Solar noon', ui.time(s.solarNoon, r.tz, { seconds: true })],
            ['Daylight', s.status === 'normal' ? dlTxt : (s.status === 'midnight-sun' ? '24 h' : '0 h')],
            ['Civil twilight begins / ends', ev(r, -6, -1) + ' / ' + ev(r, -6, +1)],
            ['Nautical twilight begins / ends', ev(r, -12, -1) + ' / ' + ev(r, -12, +1)],
            ['Sun\'s declination (noon)', ui.esc(ui.decl(s.declination))],
            ['Time zone', ui.tzLabel(r.tz)]
          ]);
        var html = ui.resultCard(ui.dateYMD(r.date), body, { copy: true, icon: 'i-sunset', badge: '<span class="badge info">estimate</span>', foot: ui.esc(ui.coordPair(r.lat, r.lon)) + (h ? ' · height of eye ' + h + ' m' : '') + '. NOAA/Meeus algorithm, ±1 min typical.' });
        ui.showResult(out, html, 'MEIKO · Sun ' + ui.dateYMD(r.date) + ' ' + ui.tzLabel(r.tz) + '\n' + ui.coordPair(r.lat, r.lon) + '\nSunrise ' + ui.time(s.sunrise, r.tz) + '\nSolar noon ' + ui.time(s.solarNoon, r.tz) + '\nSunset ' + ui.time(s.sunset, r.tz) + '\nDaylight ' + dlTxt);
      }
      form.addEventListener('change', function () { calc(true); });
      form.addEventListener('input', function (e) { if (e.target.name === 'h') calc(true); });
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(false); });
      ui.$('[data-reset]', form).addEventListener('click', function () { pd.reset(); ui.$('[name=h]', form).value = ''; out.innerHTML = ui.empty('i-sunset', 'No result yet', 'Enter a position, a date and time zone.'); });
      calc(true);
    }
  });

  MEIKO.astroUI = { placeDateBlock: placeDateBlock, bindPlaceDate: bindPlaceDate, prefillFromGps: prefillFromGps };
})();
