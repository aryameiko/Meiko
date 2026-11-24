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
    { id: 'id-sorong',   name: 'Sorong',             city: 'Sorong',      country: 'Indonesia', lat: -0.8770, lon: 131.2470, verified: false, source: null, aliases: [] },
    // Added v1.8 for the sea-distance tables (approximate harbour positions, unverified).
    { id: 'id-palembang', name: 'Palembang (Boom Baru)', city: 'Palembang', country: 'Indonesia', lat: -2.9750, lon: 104.7750, verified: false, source: null, aliases: ['PLG'] },
    { id: 'id-muntok', name: 'Muntok', city: 'Bangka', country: 'Indonesia', lat: -2.0600, lon: 105.1600, verified: false, source: null, aliases: ['MTK', 'Mentok'] },
    { id: 'id-pkbalam', name: 'Pangkal Balam', city: 'Pangkalpinang', country: 'Indonesia', lat: -2.0950, lon: 106.1400, verified: false, source: null, aliases: ['P.BLM', 'PKL.BALAM', 'Pangkalpinang'] },
    { id: 'id-pontianak', name: 'Pontianak', city: 'Pontianak', country: 'Indonesia', lat: -0.0200, lon: 109.3350, verified: false, source: null, aliases: ['PTK'] },
    { id: 'id-ranai', name: 'Ranai', city: 'Natuna', country: 'Indonesia', lat: 3.9450, lon: 108.3900, verified: false, source: null, aliases: ['RNI', 'Natuna'] },
    { id: 'id-tarempa', name: 'Tarempa', city: 'Anambas', country: 'Indonesia', lat: 3.2200, lon: 106.2200, verified: false, source: null, aliases: ['TRP', 'Terempa', 'Anambas'] },
    { id: 'id-tguban', name: 'Tanjung Uban', city: 'Bintan', country: 'Indonesia', lat: 1.0700, lon: 104.2200, verified: false, source: null, aliases: ['TUB', 'Tg. Uban'] },
    { id: 'id-tpinang', name: 'Tanjung Pinang', city: 'Bintan', country: 'Indonesia', lat: 0.9250, lon: 104.4400, verified: false, source: null, aliases: ['TPI', 'Tg. Pinang'] },
    { id: 'id-dumai', name: 'Dumai', city: 'Riau', country: 'Indonesia', lat: 1.6900, lon: 101.4500, verified: false, source: null, aliases: ['DUM'] },
    { id: 'id-lhokseumawe', name: 'Lhokseumawe', city: 'Aceh', country: 'Indonesia', lat: 5.2000, lon: 97.1100, verified: false, source: null, aliases: ['LSM', 'Krueng Geukueh'] },
    { id: 'id-malahayati', name: 'Malahayati', city: 'Aceh Besar', country: 'Indonesia', lat: 5.6000, lon: 95.5100, verified: false, source: null, aliases: ['MLH', 'Krueng Raya'] },
    { id: 'id-sabang', name: 'Sabang', city: 'Pulau Weh', country: 'Indonesia', lat: 5.8900, lon: 95.3200, verified: false, source: null, aliases: ['SAB', 'SBG'] },
    { id: 'id-bandaaceh', name: 'Banda Aceh (Ulee Lheue)', city: 'Banda Aceh', country: 'Indonesia', lat: 5.5600, lon: 95.2900, verified: false, source: null, aliases: ['BDA', 'B.ACEH'] },
    { id: 'id-nias', name: 'Nias (Gunungsitoli)', city: 'Nias', country: 'Indonesia', lat: 1.2900, lon: 97.6200, verified: false, source: null, aliases: ['NAS', 'Gunungsitoli'] },
    { id: 'id-sibolga', name: 'Sibolga', city: 'North Sumatra', country: 'Indonesia', lat: 1.7400, lon: 98.7750, verified: false, source: null, aliases: ['SBA'] },
    { id: 'id-tbayur', name: 'Teluk Bayur', city: 'Padang', country: 'Indonesia', lat: -1.0000, lon: 100.3700, verified: false, source: null, aliases: ['PDG', 'TBY', 'Padang'] },
    { id: 'id-tratai', name: 'Teluk Ratai', city: 'Lampung', country: 'Indonesia', lat: -5.6000, lon: 105.2300, verified: false, source: null, aliases: ['TRT'] },
    { id: 'id-bengkulu', name: 'Bengkulu (Pulau Baai)', city: 'Bengkulu', country: 'Indonesia', lat: -3.9000, lon: 102.3000, verified: false, source: null, aliases: ['BKU', 'Pulau Baai'] },
    { id: 'id-panjang', name: 'Panjang', city: 'Bandar Lampung', country: 'Indonesia', lat: -5.4700, lon: 105.3200, verified: false, source: null, aliases: ['PJG'] },
    { id: 'id-tegal', name: 'Tegal', city: 'Central Java', country: 'Indonesia', lat: -6.8500, lon: 109.1400, verified: false, source: null, aliases: ['TGL'] },
    { id: 'id-cilacap', name: 'Cilacap', city: 'Central Java', country: 'Indonesia', lat: -7.7400, lon: 109.0000, verified: false, source: null, aliases: ['CLP'] },
    { id: 'id-banyuwangi', name: 'Banyuwangi', city: 'East Java', country: 'Indonesia', lat: -8.2100, lon: 114.3850, verified: false, source: null, aliases: ['BWI'] },
    { id: 'id-ampenan', name: 'Ampenan', city: 'Lombok', country: 'Indonesia', lat: -8.5700, lon: 116.0700, verified: false, source: null, aliases: ['AMP', 'Mataram'] },
    { id: 'id-lembar', name: 'Lembar', city: 'Lombok', country: 'Indonesia', lat: -8.7300, lon: 116.0700, verified: false, source: null, aliases: ['LEMBAR'] },
    { id: 'id-kupang', name: 'Kupang (Tenau)', city: 'Kupang', country: 'Indonesia', lat: -10.2000, lon: 123.5300, verified: false, source: null, aliases: ['KPG', 'Tenau'] },
    { id: 'tl-dili', name: 'Dili', city: 'Timor-Leste', country: 'Timor-Leste', lat: -8.5500, lon: 125.5750, verified: false, source: null, aliases: ['DLI'] },
    { id: 'id-merauke', name: 'Merauke', city: 'South Papua', country: 'Indonesia', lat: -8.4700, lon: 140.3900, verified: false, source: null, aliases: ['MRE'] },
    { id: 'id-biak', name: 'Biak', city: 'Papua', country: 'Indonesia', lat: -1.1850, lon: 136.0800, verified: false, source: null, aliases: ['BIAK'] },
    { id: 'id-tual', name: 'Tual', city: 'Kei Islands', country: 'Indonesia', lat: -5.6300, lon: 132.7500, verified: false, source: null, aliases: ['TUAL'] },
    { id: 'id-ambon', name: 'Ambon', city: 'Maluku', country: 'Indonesia', lat: -3.6900, lon: 128.1800, verified: false, source: null, aliases: ['AMB'] },
    { id: 'id-jayapura', name: 'Jayapura', city: 'Papua', country: 'Indonesia', lat: -2.5400, lon: 140.7100, verified: false, source: null, aliases: ['JPR'] },
    { id: 'id-manokwari', name: 'Manokwari', city: 'Papua Barat', country: 'Indonesia', lat: -0.8600, lon: 134.0750, verified: false, source: null, aliases: ['MWR'] },
    { id: 'id-ternate', name: 'Ternate', city: 'North Maluku', country: 'Indonesia', lat: 0.7850, lon: 127.3850, verified: false, source: null, aliases: ['TNT'] },
    { id: 'id-tahuna', name: 'Tahuna (Sangihe)', city: 'Sangihe', country: 'Indonesia', lat: 3.6100, lon: 125.4900, verified: false, source: null, aliases: ['SANGIHE', 'Tahuna'] },
    { id: 'id-kendari', name: 'Kendari', city: 'Southeast Sulawesi', country: 'Indonesia', lat: -3.9700, lon: 122.5900, verified: false, source: null, aliases: ['KDI'] },
    { id: 'id-tarakan', name: 'Tarakan', city: 'North Kalimantan', country: 'Indonesia', lat: 3.2900, lon: 117.5900, verified: false, source: null, aliases: ['TRK'] },
    { id: 'id-banjarmasin', name: 'Banjarmasin (Trisakti)', city: 'South Kalimantan', country: 'Indonesia', lat: -3.3300, lon: 114.5600, verified: false, source: null, aliases: ['BSN', 'BJM', 'Trisakti'] },
    { id: 'id-nunukan', name: 'Nunukan', city: 'North Kalimantan', country: 'Indonesia', lat: 4.1350, lon: 117.6650, verified: false, source: null, aliases: ['NUK'] },
    { id: 'id-kotabaru', name: 'Kotabaru', city: 'South Kalimantan', country: 'Indonesia', lat: -3.2400, lon: 116.2250, verified: false, source: null, aliases: ['KBU'] },
    { id: 'id-sangatta', name: 'Sangatta', city: 'East Kalimantan', country: 'Indonesia', lat: 0.4200, lon: 117.6000, verified: false, source: null, aliases: ['STA', 'SGT'] },
    { id: 'id-palu', name: 'Palu (Pantoloan)', city: 'Central Sulawesi', country: 'Indonesia', lat: -0.7100, lon: 119.8600, verified: false, source: null, aliases: ['PLU', 'Pantoloan'] },
    { id: 'id-tolitoli', name: 'Tolitoli', city: 'Central Sulawesi', country: 'Indonesia', lat: 1.0400, lon: 120.8000, verified: false, source: null, aliases: ['TLI'] },
    { id: 'id-miangas', name: 'Miangas', city: 'Talaud', country: 'Indonesia', lat: 5.5600, lon: 126.5850, verified: false, source: null, aliases: ['MGS'] },
    { id: 'id-maumere', name: 'Maumere', city: 'Flores', country: 'Indonesia', lat: -8.6150, lon: 122.2150, verified: false, source: null, aliases: ['MRE'] },
    { id: 'id-gebe', name: 'Gebe', city: 'North Maluku', country: 'Indonesia', lat: -0.0800, lon: 129.4000, verified: false, source: null, aliases: ['GBE', 'Pulau Gebe'] },
    { id: 'id-dobo', name: 'Dobo (Aru)', city: 'Aru Islands', country: 'Indonesia', lat: -5.7600, lon: 134.2200, verified: false, source: null, aliases: ['ARU', 'Aru'] },
    { id: 'id-timika', name: 'Timika (Pomako)', city: 'Central Papua', country: 'Indonesia', lat: -4.7900, lon: 136.9600, verified: false, source: null, aliases: ['TMK', 'Pomako'] },
    { id: 'id-nabire', name: 'Nabire', city: 'Central Papua', country: 'Indonesia', lat: -3.3600, lon: 135.5000, verified: false, source: null, aliases: ['NBR'] },
    { id: 'id-cirebon', name: 'Cirebon', city: 'West Java', country: 'Indonesia', lat: -6.7100, lon: 108.5700, verified: false, source: null, aliases: ['CBN'] },
    { id: 'id-cilegon', name: 'Cilegon (Ciwandan)', city: 'Banten', country: 'Indonesia', lat: -6.0200, lon: 105.9500, verified: false, source: null, aliases: ['CLG', 'Ciwandan', 'Merak'] },
    { id: 'id-tbkarimun', name: 'Tanjung Balai Karimun', city: 'Riau Islands', country: 'Indonesia', lat: 1.0000, lon: 103.4200, verified: false, source: null, aliases: ['TBK', 'Karimun'] },
    { id: 'id-dabo', name: 'Dabo Singkep', city: 'Riau Islands', country: 'Indonesia', lat: -0.5000, lon: 104.5700, verified: false, source: null, aliases: ['DSK', 'Singkep'] }
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
