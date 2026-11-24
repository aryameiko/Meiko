/*
 * MEIKO — port database (sample)
 *
 * ⚠ STATUS: SAMPLE / UNVERIFIED
 * The coordinates below are approximate harbour-area positions taken from general reference
 * knowledge. They have NOT been checked against an authoritative source (e.g. Pushidrosal
 * charts, the Indonesian port authority / KSOP, or the NGA World Port Index). Each record
 * carries `verified: false` and the app labels it as such. When you verify a record, set
 * `verified: true` and fill in `source` (publication + edition/date) — the UI will then show it as verified.
 *
 * To add ports: append objects with the same fields. `id` must be unique and stable
 * (it is stored in the user's recent selections). Optional fields: `unlocode`, `region`, `aliases`.
 */
(function (root) {
  var PORTS = [
    { id: 'id-tpriok',   name: 'Tanjung Priok',      city: 'Jakarta',     country: 'Indonesia', lat: -6.1040, lon: 106.8800, verified: false, source: null, aliases: ['Priok', 'Jakarta'] },
    { id: 'id-tperak',   name: 'Tanjung Perak',      city: 'Surabaya',    country: 'Indonesia', lat: -7.1980, lon: 112.7310, verified: false, source: null, aliases: ['Surabaya', 'Perak'] },
    { id: 'id-belawan',  name: 'Belawan',            city: 'Medan',       country: 'Indonesia', lat: 3.7870,  lon: 98.6930,  verified: false, source: null, aliases: ['Medan'] },
    { id: 'id-makassar', name: 'Makassar (Soekarno-Hatta)', city: 'Makassar', country: 'Indonesia', lat: -5.1230, lon: 119.4050, verified: false, source: null, aliases: ['Ujung Pandang', 'Soekarno Hatta'] },
    { id: 'id-bitung',   name: 'Bitung',             city: 'Bitung',      country: 'Indonesia', lat: 1.4410,  lon: 125.1920, verified: false, source: null, aliases: [] },
    { id: 'id-benoa',    name: 'Benoa',              city: 'Denpasar, Bali', country: 'Indonesia', lat: -8.7450, lon: 115.2120, verified: false, source: null, aliases: ['Bali', 'Denpasar'] },
    { id: 'id-bpn',      name: 'Balikpapan (Semayang)', city: 'Balikpapan', country: 'Indonesia', lat: -1.2700, lon: 116.8080, verified: false, source: null, aliases: ['Semayang'] },
    { id: 'id-batam',    name: 'Batam (Batu Ampar)', city: 'Batam',       country: 'Indonesia', lat: 1.1700,  lon: 104.0000, verified: false, source: null, aliases: ['Batu Ampar'] },
    { id: 'id-temas',    name: 'Tanjung Emas',       city: 'Semarang',    country: 'Indonesia', lat: -6.9470, lon: 110.4250, verified: false, source: null, aliases: ['Semarang'] },
    { id: 'id-sorong',   name: 'Sorong',             city: 'Sorong',      country: 'Indonesia', lat: -0.8770, lon: 131.2470, verified: false, source: null, aliases: [] }
  ];

  var api = {
    STATUS: 'sample-unverified',
    all: function () { return PORTS.slice(); },
    byId: function (id) { for (var i = 0; i < PORTS.length; i++) if (PORTS[i].id === id) return PORTS[i]; return null; },
    search: function (q) {
      q = String(q || '').trim().toLowerCase();
      if (!q) return PORTS.slice();
      return PORTS.filter(function (p) {
        var hay = [p.name, p.city, p.country, p.unlocode || ''].concat(p.aliases || []).join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.MeikoData = root.MeikoData || {}; root.MeikoData.ports = api; }
})(typeof self !== 'undefined' ? self : this);
