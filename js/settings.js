/*
 * MEIKO — user preferences (stored locally).
 */
(function () {
  'use strict';
  var deviceTz = -new Date().getTimezoneOffset() / 60;
  var DEFAULTS = {
    theme: 'system',          // system | light | dark
    distUnit: 'nm',           // nm | km
    speedUnit: 'kn',          // kn | kmh | ms | mph
    timeFormat: '24',         // 24 | 12
    coordFormat: 'DDM',       // DD | DDM | DMS
    tz: deviceTz,             // preferred UTC offset in hours
    gpsSource: 'auto',        // auto | device | external
    lang: 'en'
  };
  var listeners = [];
  var state = Object.assign({}, DEFAULTS, MEIKO.storage.get('settings', {}));

  function applyTheme() {
    var root = document.documentElement;
    if (state.theme === 'light' || state.theme === 'dark') root.setAttribute('data-theme', state.theme);
    else root.removeAttribute('data-theme');
    var dark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#07111F' : '#0B1F3A');
  }

  MEIKO.settings = {
    DEFAULTS: DEFAULTS,
    get: function (k) { return k ? state[k] : Object.assign({}, state); },
    set: function (k, v) {
      state[k] = v; MEIKO.storage.set('settings', state);
      if (k === 'theme') applyTheme();
      if (k === 'lang') MEIKO.i18n.setLang(v);
      listeners.forEach(function (fn) { fn(k, v); });
    },
    reset: function () { state = Object.assign({}, DEFAULTS); MEIKO.storage.set('settings', state); applyTheme(); },
    onChange: function (fn) { listeners.push(fn); },
    applyTheme: applyTheme
  };
  MEIKO.i18n.setLang(state.lang);
  applyTheme();
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(applyTheme);
  }
})();
