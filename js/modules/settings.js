/*
 * MEIKO — Settings & About UI.
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, icon = ui.icon, set = MEIKO.settings;

  function seg(name, opts, value) {
    return '<div class="seg" data-setting="' + name + '">' + opts.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '"' + (String(value) === String(o[0]) ? ' class="on"' : '') + '>' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  MEIKO.features.register({
    id: 'settings', cat: 'settings', icon: 'i-settings', title: 'Settings',
    desc: 'Theme, units, time format, coordinates, time zone, saved places', keywords: 'pengaturan preferences dark mode theme about bahasa language idioma',
    render: function (view) {
      var s = set.get();
      view.innerHTML = ui.pageHead({ cat: 'settings', title: 'Settings', lead: 'Preferences are stored only on this device.' }) +
        '<div class="tool-grid"><div class="stack">' +
        '<div class="card card-pad form-gap"><div class="card-title">' + icon('i-sun') + 'Appearance</div>' +
        '<label class="field"><span>' + icon('i-globe') + ' Language</span><select data-langsel>' + MEIKO.region.langOptions(MEIKO.i18n.lang()) + '</select><small class="hint" translate="no">Bahasa · Language · Ngôn ngữ · ภาษา · 语言</small></label>' +
        '<div class="field"><span>Theme</span>' + seg('theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], s.theme) + '</div></div>' +
        '<div class="card card-pad form-gap"><div class="card-title">' + icon('i-ruler') + 'Units & formats</div>' +
        '<div class="field"><span>Default distance unit</span>' + seg('distUnit', [['nm', 'Nautical miles'], ['km', 'Kilometres']], s.distUnit) + '</div>' +
        '<div class="field"><span>Default speed unit</span>' + seg('speedUnit', [['kn', 'Knots'], ['kmh', 'km/h'], ['ms', 'm/s'], ['mph', 'mph']], s.speedUnit) + '</div>' +
        '<div class="field"><span>Time format</span>' + seg('timeFormat', [['24', '24-hour'], ['12', '12-hour']], s.timeFormat) + '</div>' +
        '<div class="field"><span>Coordinate format</span>' + seg('coordFormat', [['DD', 'DD'], ['DDM', 'DDM'], ['DMS', 'DMS']], s.coordFormat) + '<small class="hint" data-coord-ex></small></div>' +
        '<div class="field"><span>GPS source</span>' + seg('gpsSource', [['auto', 'Auto'], ['device', 'Phone / tablet'], ['external', 'External receiver']], s.gpsSource || 'auto') + '<small class="hint">Auto uses a connected external receiver when it has a fix, otherwise the phone/tablet GPS. Connect a receiver on <a href="#/t/gps">Position &amp; GPS</a>.</small></div>' +
        '<label class="field"><span>Preferred time zone</span><select data-tz>' + ui.tzOptions(s.tz) + '</select><small class="hint">Used for the dashboard clock and as the default in all tools. Device offset: ' + ui.tzLabel(-new Date().getTimezoneOffset() / 60) + '</small></label></div>' +
        '<div class="card card-pad"><div class="card-title">' + icon('i-star') + 'Saved locations<span class="spacer"></span><button class="btn btn-ghost btn-sm" data-add>' + icon('i-plus') + 'Add</button></div><div data-saved></div></div>' +
        '</div><div class="results-col stack">' +
        '<div class="card card-pad" data-perm-s></div>' +
        '<div class="card card-pad"><div class="card-title">' + icon('i-info') + 'App</div>' +
        '<div class="form-gap"><button class="btn btn-gold" data-install hidden style="width:100%">' + icon('i-plus') + 'Install MEIKO on this device</button>' +
        '<div data-install-help class="small muted"></div>' +
        '<div class="flex"><button class="btn btn-ghost btn-sm" data-update>' + icon('i-reset') + 'Check for updates</button><button class="btn btn-danger btn-sm" data-wipe>' + icon('i-trash') + 'Clear all local data</button></div>' +
        '<div class="small muted" data-sw></div></div></div>' +
        '<div class="card card-pad"><div class="flex" style="gap:14px"><svg class="logo" style="width:52px;height:52px"><use href="#logo"/></svg><div><div style="font-weight:800;letter-spacing:.28em;font-size:20px">MEIKO</div><div class="small muted" style="letter-spacing:.14em;text-transform:uppercase">Navigate • Calculate • Explore</div></div></div>' +
        '<p class="mt-12 small" style="color:var(--text-2)">Maritime navigation and everyday utility tools. Version ' + MEIKO.VERSION + '. Works offline after the first visit. No ads, no analytics trackers, no paid services. Your account is kept by Firebase (Google); Fleet &amp; Chat is end-to-end encrypted over public relays; everything else stays on this device.</p>' +
        '<p class="small"><a href="#/t/privacy">Privacy Policy</a> · <a href="#/t/terms">Terms of Use</a> · <a href="#/t/licenses">Licences &amp; Attribution</a></p>' +
        '<div class="section-title">Data status</div>' +
        '<ul class="list small">' +
        '<li><div class="grow"><b>Port coordinates</b><small>Sample harbour positions, not yet verified against official sources.</small></div><span class="badge warn">unverified</span></li>' +
        '<li><div class="grow"><b>Kemenag RI prayer parameters</b><small>Commonly cited values, not yet verified against an official publication.</small></div><span class="badge warn">unverified</span></li>' +
        '<li><div class="grow"><b>Kaaba position</b><small>21.4225° N, 39.8262° E (approximate).</small></div><span class="badge info">approx.</span></li>' +
        '<li><div class="grow"><b>Solar algorithm</b><small>NOAA / Meeus. Sunrise/sunset ±1 min; merpass within seconds.</small></div><span class="badge info">estimate</span></li>' +
        '<li><div class="grow"><b>Geodesy</b><small>Haversine (sphere R = 6 371.0088 km), Vincenty WGS-84, Mercator rhumb line.</small></div><span class="badge ok">tested</span></li>' +
        '</ul>' +
        '<p class="mt-12 small muted">' + ui.esc(ui.NAV_DISCLAIMER) + '</p></div>' +
        '</div></div>';

      ui.$$('[data-setting]', view).forEach(function (g) {
        g.addEventListener('click', function (e) {
          var b = e.target.closest('[data-v]'); if (!b) return;
          ui.$$('button', g).forEach(function (x) { x.classList.toggle('on', x === b); });
          set.set(g.dataset.setting, b.dataset.v);
          if (g.dataset.setting === 'coordFormat') ex();
          ui.toast('Saved');
        });
      });
      function ex() { ui.$('[data-coord-ex]', view).textContent = 'Example: ' + ui.coordPair(-6.10417, 106.88); }
      ex();
      MEIKO.app.mountPermission(ui.$('[data-perm-s]', view));
      ui.$('[data-langsel]', view).addEventListener('change', function (e) {
        set.set('lang', e.target.value);
        if (MEIKO.auth.profile() && MEIKO.auth.profile().country) MEIKO.auth.setRegion(MEIKO.auth.profile().country, e.target.value);
        MEIKO.i18n.onReady(function () { ui.toast('Saved'); });
      });
      ui.$('[data-tz]', view).addEventListener('change', function (e) { set.set('tz', +e.target.value); ui.toast('Time zone saved'); });

      var savedEl = ui.$('[data-saved]', view);
      function renderSaved() {
        var list = MEIKO.storage.locations.all();
        savedEl.innerHTML = !list.length ? '<p class="small muted">No saved locations yet.</p>' : '<ul class="list">' + list.map(function (l) {
          return '<li><div class="grow"><b>' + ui.esc(l.name) + '</b><small>' + ui.esc(ui.coordPair(l.lat, l.lon)) + '</small></div>' +
            '<button class="icon-btn" data-ren="' + l.id + '" aria-label="Rename">' + icon('i-settings') + '</button><button class="icon-btn" data-del="' + l.id + '" aria-label="Delete">' + icon('i-trash') + '</button></li>';
        }).join('') + '</ul>';
      }
      savedEl.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.del) { MEIKO.storage.locations.remove(b.dataset.del); renderSaved(); ui.toast('Deleted'); }
        if (b.dataset.ren) {
          var l = MEIKO.storage.locations.all().filter(function (x) { return x.id === b.dataset.ren; })[0];
          ui.sheet({ title: 'Rename', html: '<label class="field"><span>Name</span><input data-n maxlength="60" value="' + ui.esc(l.name) + '"></label><div class="actions"><button class="btn btn-primary" data-ok>Save</button></div>', onMount: function (body, close) {
            ui.$('[data-ok]', body).addEventListener('click', function () { var n = ui.$('[data-n]', body).value.trim(); if (n) { MEIKO.storage.locations.rename(l.id, n); renderSaved(); } close(); });
          } });
        }
      });
      ui.$('[data-add]', view).addEventListener('click', function () { MEIKO.app.addLocationManually(renderSaved); });
      renderSaved();

      // Install & service worker
      var inst = ui.$('[data-install]', view), help = ui.$('[data-install-help]', view);
      function syncInstall() {
        var standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone;
        inst.hidden = !MEIKO.app.canInstall();
        help.textContent = standalone ? 'MEIKO is running as an installed app.' : MEIKO.app.canInstall() ? '' :
          'To install: on iPad/iPhone use Safari → Share → “Add to Home Screen”. On Android use the browser menu → “Install app” / “Add to Home screen”.';
      }
      inst.addEventListener('click', function () { MEIKO.app.install().then(syncInstall); });
      syncInstall();
      var swEl = ui.$('[data-sw]', view);
      swEl.textContent = ('serviceWorker' in navigator) ? (navigator.serviceWorker.controller ? 'Offline mode: ready — app files are cached on this device.' : 'Offline mode: preparing (reload once to finish caching).') : 'Offline mode is not supported in this browser.';
      ui.$('[data-update]', view).addEventListener('click', function () {
        if (!('serviceWorker' in navigator)) return ui.toast('Not supported');
        navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update().then(function () { ui.toast('Checked for updates'); }); else ui.toast('No offline cache registered'); });
      });
      ui.$('[data-wipe]', view).addEventListener('click', function () {
        ui.sheet({ title: 'Clear all local data?', html: '<p>This deletes your settings, saved locations, tracks, vessel, calculator history and remembered form values on this device, and signs you out. It cannot be undone.</p><div class="actions"><button class="btn btn-danger" data-yes>' + icon('i-trash') + 'Delete everything</button><button class="btn btn-ghost" data-close>Cancel</button></div>', onMount: function (body, close) {
          ui.$('[data-yes]', body).addEventListener('click', function () { if (MEIKO.fleet && MEIKO.fleet.state.client) MEIKO.fleet.leave(true);
            MEIKO.storage.clearAll(); set.reset(); close();
            // The registration was deleted too: sign out and start again from the welcome screen.
            if (MEIKO.onboarding && MEIKO.onboarding.required()) { Promise.resolve(MEIKO.auth.signOut()).then(function () { location.hash = '#/welcome'; MEIKO.app.rerender(); }); return; }
            ui.toast('Local data cleared'); MEIKO.app.rerender(); });
        } });
      });
    }
  });
})();
