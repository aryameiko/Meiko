/*
 * MEIKO — i18n scaffold.
 * English is the source language. To add a language, add a dictionary under STRINGS and
 * a selector in Settings; call MEIKO.t('key') wherever UI text is rendered.
 */
(function () {
  'use strict';
  window.MEIKO = window.MEIKO || {};
  var STRINGS = {
    en: {
      'cat.navigation': 'Navigation', 'cat.calculator': 'Calculator', 'cat.converter': 'Unit Converter',
      'cat.astronomy': 'Astronomy', 'cat.prayer': 'Prayer Tools', 'cat.position': 'Position & GPS', 'cat.settings': 'Settings',
      'nav.home': 'Home', 'nav.navigate': 'Navigate', 'nav.qibla': 'Qibla', 'nav.gps': 'GPS', 'nav.settings': 'Settings',
      'tagline': 'Navigate • Calculate • Explore'
    },
    id: {
      'cat.navigation': 'Navigasi', 'cat.calculator': 'Kalkulator', 'cat.converter': 'Konversi Satuan',
      'cat.astronomy': 'Astronomi', 'cat.prayer': 'Alat Ibadah', 'cat.position': 'Posisi & GPS', 'cat.settings': 'Pengaturan',
      'nav.home': 'Beranda', 'nav.navigate': 'Navigasi', 'nav.qibla': 'Kiblat', 'nav.gps': 'GPS', 'nav.settings': 'Pengaturan',
      'tagline': 'Navigate • Calculate • Explore'
    }
  };
  var lang = 'en';
  MEIKO.i18n = {
    setLang: function (l) { if (STRINGS[l]) lang = l; },
    lang: function () { return lang; },
    languages: function () { return Object.keys(STRINGS); }
  };
  MEIKO.t = function (key, fallback) {
    return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || fallback || key;
  };
})();
