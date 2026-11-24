/*
 * MEIKO — local storage wrapper.
 * All keys are namespaced ("meiko:v1:") so a future schema change can migrate cleanly.
 * Every access is wrapped in try/catch: private browsing or blocked storage must never break the app.
 * Future cloud sync can hook in at set()/remove() via MEIKO.storage.onChange.
 */
(function () {
  'use strict';
  window.MEIKO = window.MEIKO || {};
  var NS = 'meiko:v1:';
  var listeners = [];
  var memory = {}; // fallback when localStorage is unavailable

  function get(key, fallback) {
    try {
      var raw = window.localStorage.getItem(NS + key);
      if (raw == null) return key in memory ? memory[key] : fallback;
      return JSON.parse(raw);
    } catch (e) { return key in memory ? memory[key] : fallback; }
  }
  function set(key, value) {
    memory[key] = value;
    try { window.localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) { /* quota or disabled */ }
    listeners.forEach(function (fn) { try { fn(key, value); } catch (e) {} });
  }
  function remove(key) {
    delete memory[key];
    try { window.localStorage.removeItem(NS + key); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(key, undefined); } catch (e) {} });
  }
  function clearAll() {
    memory = {};
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(NS) === 0) keys.push(k); }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  /* Saved locations */
  function uid() { return 'loc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  var locations = {
    all: function () { return get('locations', []); },
    add: function (loc) {
      var list = locations.all();
      var rec = { id: uid(), name: String(loc.name || 'Saved position').slice(0, 60), lat: loc.lat, lon: loc.lon, note: loc.note || '', createdAt: Date.now() };
      list.unshift(rec); set('locations', list); return rec;
    },
    remove: function (id) { set('locations', locations.all().filter(function (l) { return l.id !== id; })); },
    rename: function (id, name) { set('locations', locations.all().map(function (l) { if (l.id === id) l.name = String(name).slice(0, 60); return l; })); }
  };

  MEIKO.storage = { get: get, set: set, remove: remove, clearAll: clearAll, locations: locations, onChange: function (fn) { listeners.push(fn); } };
})();
