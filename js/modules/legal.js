/*
 * MEIKO — legal: Privacy Policy, Terms of Use (Indonesian, from privacy.html / terms.html so the public pages
 * and the in-app text are one source), consent record, and Licences & Attribution.
 * Consent is stored in the profile as { consent: { v: VERSION, at, age18 } }. When VERSION changes, signed-in
 * users are asked to agree again (onboarding.js).
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, esc = ui.esc, icon = ui.icon;
  var VERSION = '2026-11-25.3';
  var DOCS = { privacy: { file: 'privacy.html', title: 'Privacy Policy' }, terms: { file: 'terms.html', title: 'Terms of Use' } };
  var cache = {};

  function load(name) {
    var d = DOCS[name];
    if (cache[name]) return Promise.resolve(cache[name]);
    return fetch(d.file).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'text/html'), m = doc.getElementById('legal');
      if (!m) throw new Error('missing');
      m.querySelectorAll('script').forEach(function (s) { s.remove(); });
      // Links between the two documents open inside the app.
      m.querySelectorAll('a[href="privacy.html"], a[href="terms.html"]').forEach(function (a) { a.setAttribute('data-legal', a.getAttribute('href').replace('.html', '')); });
      return (cache[name] = m.outerHTML);
    });
  }
  function fallback(name) { return '<p>' + esc(DOCS[name].title) + ' could not be loaded (offline?). Open <a href="' + DOCS[name].file + '" target="_blank" rel="noopener">' + DOCS[name].file + '</a> when you have internet.</p>'; }
  /** The documents are written in Indonesian (the official version); say so in the other languages. */
  function langNote() { return MEIKO.i18n && MEIKO.i18n.lang() !== 'id' ? '<p class="small muted">' + icon('i-info') + ' This document is available in Indonesian, which is the official version.</p>' : ''; }
  var DOC_BOX = '<div data-doc translate="no" lang="id"><p class="small muted">Memuat…</p></div>';
  function wireLinks(root) {
    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-legal]'); if (!a) return;
      e.preventDefault(); show(a.getAttribute('data-legal'));
    });
  }
  /** Show a document in a sheet (works above the onboarding screen and offline once cached). */
  function show(name) {
    ui.sheet({ title: DOCS[name].title, html: langNote() + DOC_BOX, onMount: function (body) {
      var box = body.querySelector('[data-doc]');
      load(name).then(function (h) { box.innerHTML = h; }, function () { box.innerHTML = fallback(name); });
      wireLinks(body);
    } });
  }

  function consent() { var p = MEIKO.auth.profile(); return p && p.consent && p.consent.v === VERSION ? p.consent : null; }
  function recordConsent() { return MEIKO.auth.setConsent({ v: VERSION, at: new Date().toISOString(), age18: true }); }
  /** The consent checkbox used in onboarding (both for Google and email sign-up). */
  function checkboxHTML(checked) {
    return '<label class="legal-check"><input type="checkbox" data-consent' + (checked ? ' checked' : '') + '> <span>I am 18 or older (or have permission from a parent or guardian) and I agree to the MEIKO <a href="privacy.html" data-legal="privacy">Privacy Policy</a> and <a href="terms.html" data-legal="terms">Terms of Use</a>, including showing my flag and language to other MEIKO vessels and storing my account, country and language on Firebase (Google) outside Indonesia.</span></label>';
  }

  MEIKO.legal = { VERSION: VERSION, load: load, show: show, consent: consent, recordConsent: recordConsent, checkboxHTML: checkboxHTML, wireLinks: wireLinks };

  function docPage(name, order, ico, desc, keywords) {
    MEIKO.features.register({
      id: name, cat: 'settings', order: order, icon: ico, title: DOCS[name].title, desc: desc, keywords: keywords,
      render: function (view) {
        view.innerHTML = ui.pageHead(this) + langNote() + '<div class="card card-pad" data-doc translate="no" lang="id"><p class="small muted">Memuat…</p></div>' +
          '<p class="small muted mt-8"><a href="' + DOCS[name].file + '" target="_blank" rel="noopener">Open as a web page</a></p>';
        var box = ui.$('[data-doc]', view);
        load(name).then(function (h) { if (box.isConnected) box.innerHTML = h; }, function () { box.innerHTML = fallback(name); });
        wireLinks(view);
      }
    });
  }
  docPage('privacy', 3, 'i-lock', 'What data MEIKO uses, where it goes, and your rights (UU PDP)', 'privasi privacy kebijakan data pribadi pdp gdpr hapus akun delete');
  docPage('terms', 4, 'i-book', 'Rules of use, navigation safety limits, Fleet & Chat rules', 'syarat ketentuan terms tos aturan hukum disclaimer');

  /* ---------- Licences & attribution ---------- */
  var LIBS = [
    ['Leaflet 1.9.4', 'BSD-2-Clause · © Vladimir Agafonkin, CloudMade', 'https://leafletjs.com', 'assets/vendor/leaflet/LICENSE'],
    ['Firebase JS SDK 11.10 (app + auth)', 'Apache-2.0 · © Google LLC', 'https://github.com/firebase/firebase-js-sdk', null],
    ['@noble/curves 1.9.7, @noble/hashes 1.8.0', 'MIT · © Paul Miller', 'https://paulmillr.com/noble/', null],
    ['topojson-client 3.1', 'ISC · © Michael Bostock', 'https://github.com/topojson/topojson-client', 'assets/vendor/topojson/LICENSE'],
    ['geomagnetism (WMM code)', 'Apache-2.0 · © Natural Atlas', 'https://github.com/naturalatlas/geomagnetism', 'assets/vendor/wmm/LICENSE-geomagnetism']
  ];
  var DATA = [
    ['World Magnetic Model 2025', 'NOAA NCEI & British Geological Survey · public domain', 'https://www.ncei.noaa.gov/products/world-magnetic-model'],
    ['World outline (countries-50m)', 'world-atlas, ISC · © Michael Bostock; data Natural Earth (public domain). Borders are shown as in the source and are not an official position on any boundary.', 'https://github.com/topojson/world-atlas'],
    ['Star catalogue & constellations', 'd3-celestial, BSD-3-Clause · © Olaf Frohn. Star positions from the HYG database (© David Nash / astronexus, CC BY-SA 4.0) / ESA Hipparcos. MEIKO\'s derived star table (js/data/stars-data.js) is shared under the same CC BY-SA terms.', 'https://github.com/ofrohn/d3-celestial'],
    ['Port positions', 'SMDG Terminal Code List; Kemenhub/Dephub port points via bennyistanto/geodata; NGA World Port Index (US Government, public domain). Unverified; see each port\'s source.', 'https://smdg.org'],
    ['Port sea distances', 'Computed by MEIKO (tools/sea-distances.js): shortest water path on the Natural Earth 1:10m coastline (public domain). No third-party distance tables.', null],
    ['Solar & prayer algorithms', 'NOAA Solar Calculator / J. Meeus, Astronomical Algorithms (methods, own code).', null]
  ];
  var MAPS = [
    ['Street map', '© OpenStreetMap contributors, ODbL. Tiles by the OpenStreetMap Foundation under its tile usage policy (viewing only; no bulk download).', 'https://www.openstreetmap.org/copyright'],
    ['Satellite', 'EOxCloudless 2016 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017), licensed under CC BY 4.0. Viewing only; no bulk download.', 'https://cloudless.eox.at', 'https://creativecommons.org/licenses/by/4.0/'],
    ['Sea marks', '© OpenSeaMap contributors: data ODbL, map tiles CC BY-SA 2.0. Community data, not official.', 'https://www.openseamap.org', 'https://creativecommons.org/licenses/by-sa/2.0/']
  ];
  function rows(list) {
    return '<ul class="list small">' + list.map(function (x) {
      var link = x[2] ? ' <a href="' + esc(x[2]) + '" target="_blank" rel="noopener">website</a>' : '';
      var lic = x[3] ? ' · <a href="' + esc(x[3]) + '" target="_blank" rel="noopener">licence text</a>' : '';
      return '<li><div class="grow"><b>' + esc(x[0]) + '</b><small>' + esc(x[1]) + link + lic + '</small></div></li>';
    }).join('') + '</ul>';
  }
  MEIKO.features.register({
    id: 'licenses', cat: 'settings', order: 5, icon: 'i-info', title: 'Licences & Attribution',
    desc: 'Open-source libraries, data and map sources used by MEIKO', keywords: 'lisensi license atribusi attribution open source credits hak cipta copyright',
    lead: 'MEIKO is built on the work of others. Thank you to all of them.',
    render: function (view) {
      view.innerHTML = ui.pageHead(this) +
        '<div class="card card-pad"><div class="card-title">' + icon('i-map') + 'Maps</div>' + rows(MAPS) + '</div>' +
        '<div class="card card-pad mt-12"><div class="card-title">' + icon('i-star') + 'Data</div>' + rows(DATA) + '</div>' +
        '<div class="card card-pad mt-12"><div class="card-title">' + icon('i-settings') + 'Software libraries</div>' + rows(LIBS) +
        '<p class="small muted mt-8">Full licence notices of the bundled libraries are kept at the end of each file in <code>js/vendor/</code> and <code>assets/vendor/</code>.</p></div>';
    }
  });
})();
