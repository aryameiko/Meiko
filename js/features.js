/*
 * MEIKO — feature registry and entitlements.
 * Every tool registers itself here with a `tier`. Today every tier is unlocked (no accounts, no payments).
 * Later, a Pro build can replace `entitlements` with a licence/account check without touching the tools.
 */
(function () {
  'use strict';
  var tools = [], byId = {};
  var CATEGORIES = [
    { id: 'navigation', icon: 'i-nav', desc: 'Track planner, course & bearing, port to port, fleet & chat' },
    { id: 'calculator', icon: 'i-calc', desc: 'Calculator, distance, rhumb line, ETA, speed/distance/time, coordinates' },
    { id: 'converter', icon: 'i-convert', desc: 'Maritime, speed, length, time, angle, temperature' },
    { id: 'astronomy', icon: 'i-sun', desc: 'Meridian passage, sunrise and sunset' },
    { id: 'prayer', icon: 'i-moon', desc: 'Maghrib time and Qibla direction' },
    { id: 'position', icon: 'i-gps', desc: 'Your GPS position and saved places' },
    { id: 'settings', icon: 'i-settings', desc: 'Theme, units, formats, time zone' }
  ];
  var entitlements = {
    tier: 'free',
    // Placeholder for future Pro: return true while everything is free.
    canUse: function (tool) { return true; }
  };
  MEIKO.features = {
    CATEGORIES: CATEGORIES,
    register: function (tool) {
      tool.tier = tool.tier || 'free';
      tool.keywords = tool.keywords || '';
      tools.push(tool); byId[tool.id] = tool;
    },
    all: function () { return tools.slice(); },
    get: function (id) { return byId[id]; },
    inCategory: function (cat) {
      return tools.map(function (t, i) { return { t: t, i: i }; }).filter(function (x) { return x.t.cat === cat; })
        .sort(function (a, b) { return ((a.t.order || 99) - (b.t.order || 99)) || (a.i - b.i); }).map(function (x) { return x.t; });
    },
    category: function (id) { return CATEGORIES.filter(function (c) { return c.id === id; })[0]; },
    search: function (q) {
      q = String(q || '').trim().toLowerCase(); if (!q) return [];
      var words = q.split(/\s+/);
      return tools.filter(function (t) {
        var hay = (t.title + ' ' + t.desc + ' ' + t.keywords + ' ' + MEIKO.t('cat.' + t.cat)).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      });
    },
    entitlements: entitlements
  };
})();
