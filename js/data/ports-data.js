/*
 * MEIKO — port database (sample)
 *
 * ⚠ STATUS: UNVERIFIED
 * Since v1.16 the coordinates come first from the NGA World Port Index (Pub. 150, public domain, to 1′); ports
 * missing from that file keep the Kemenhub/Dephub port points (via github.com/bennyistanto/geodata) or the SMDG
 * Terminal Code List; `source` names the one used, null = MEIKO estimate. `river: true` marks river ports (inland by nature).
 * Earlier they were approximate harbour-area positions taken from general reference knowledge. They have NOT been checked against an authoritative source (e.g. Pushidrosal
 * charts, the Indonesian port authority / KSOP, or the NGA World Port Index). Each record
 * carries `verified: false` and the app labels it as such. When you verify a record, set
 * `verified: true` and fill in `source` (publication + edition/date) — the UI will then show it as verified.
 *
 * To add ports: append objects with the same fields. `id` must be unique and stable
 * (it is stored in the user's recent selections). Optional fields: `unlocode`, `region`, `aliases`.
 */
(function (root) {
  var PORTS = [
    { id: 'id-tpriok',   name: 'Tanjung Priok',      city: 'Jakarta',     country: 'Indonesia', lat: -6.10000, lon: 106.88333, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): JAKARTA #50970', aliases: ['Priok', 'Jakarta'] },
    { id: 'id-tperak',   name: 'Tanjung Perak',      city: 'Surabaya',    country: 'Indonesia', lat: -7.20000, lon: 112.73333, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): SURABAYA #51130', aliases: ['Surabaya', 'Perak'] },
    { id: 'id-belawan',  name: 'Belawan',            city: 'Medan',       country: 'Indonesia', lat: 3.78779, lon: 98.70408,  verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Belawan', aliases: ['Medan'] },
    { id: 'id-makassar', name: 'Makassar (Soekarno-Hatta)', city: 'Makassar', country: 'Indonesia', lat: -5.13333, lon: 119.40000, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): UJUNG PANDANG #52320', aliases: ['Ujung Pandang', 'Soekarno Hatta'] },
    { id: 'id-bitung',   name: 'Bitung',             city: 'Bitung',      country: 'Indonesia', lat: 1.43917, lon: 125.19833, verified: false, source: 'SMDG Terminal Code List (terminal position): TPK Bitung', aliases: [] },
    { id: 'id-benoa',    name: 'Benoa',              city: 'Denpasar, Bali', country: 'Indonesia', lat: -8.75000, lon: 115.21667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): BENOA #51260', aliases: ['Bali', 'Denpasar'] },
    { id: 'id-bpn',      name: 'Balikpapan (Semayang)', city: 'Balikpapan', country: 'Indonesia', lat: -1.25000, lon: 116.81667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): BALIKPAPAN #51840', aliases: ['Semayang'] },
    { id: 'id-batam',    name: 'Batam (Batu Ampar)', city: 'Batam',       country: 'Indonesia', lat: 1.16639, lon: 104.00222, verified: false, source: 'SMDG Terminal Code List (terminal position): Batu Ampar', aliases: ['Batu Ampar'] },
    { id: 'id-temas',    name: 'Tanjung Emas',       city: 'Semarang',    country: 'Indonesia', lat: -6.95000, lon: 110.41667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): SEMARANG #51040', aliases: ['Semarang'] },
    { id: 'id-sorong',   name: 'Sorong',             city: 'Sorong',      country: 'Indonesia', lat: -0.87750, lon: 131.24389, verified: false, source: 'SMDG Terminal Code List (terminal position): TPK Sorong', aliases: [] },
    // Added v1.8 for the sea-distance tables (approximate harbour positions, unverified).
    { id: 'id-palembang', name: 'Palembang (Boom Baru)', city: 'Palembang', country: 'Indonesia', lat: -2.98333, lon: 104.76667, verified: false, river: true, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): PALEMBANG #50330', aliases: ['PLG'] },
    { id: 'id-muntok', name: 'Muntok', city: 'Bangka', country: 'Indonesia', lat: -2.06667, lon: 105.16667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): MUNTOK #50140', aliases: ['MTK', 'Mentok'] },
    { id: 'id-pkbalam', name: 'Pangkal Balam', city: 'Pangkalpinang', country: 'Indonesia', lat: -2.11667, lon: 106.13333, verified: false, river: true, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): PANGKALPINANG #50210', aliases: ['P.BLM', 'PKL.BALAM', 'Pangkalpinang'] },
    { id: 'id-pontianak', name: 'Pontianak', city: 'Pontianak', country: 'Indonesia', lat: -0.01667, lon: 109.33333, verified: false, river: true, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): PONTIANAK #51941', aliases: ['PTK'] },
    { id: 'id-ranai', name: 'Ranai', city: 'Natuna', country: 'Indonesia', lat: 3.94500, lon: 108.39000, verified: false, source: null, aliases: ['RNI', 'Natuna'] },
    { id: 'id-tarempa', name: 'Tarempa', city: 'Anambas', country: 'Indonesia', lat: 3.21667, lon: 106.21667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): TAREMPAH #51500', aliases: ['TRP', 'Terempa', 'Anambas'] },
    { id: 'id-tguban', name: 'Tanjung Uban', city: 'Bintan', country: 'Indonesia', lat: 1.06667, lon: 104.21667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): TANJUNGUBAN #50030', aliases: ['TUB', 'Tg. Uban'] },
    { id: 'id-tpinang', name: 'Tanjung Pinang', city: 'Bintan', country: 'Indonesia', lat: 0.91667, lon: 104.45000, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): TANJUNGPINANG #50040', aliases: ['TPI', 'Tg. Pinang'] },
    { id: 'id-dumai', name: 'Dumai', city: 'Riau', country: 'Indonesia', lat: 1.68333, lon: 101.45000, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): DUMAI #50785', aliases: ['DUM'] },
    { id: 'id-lhokseumawe', name: 'Lhokseumawe', city: 'Aceh', country: 'Indonesia', lat: 5.25000, lon: 97.11667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): LHOKSEUMAWE #50650', aliases: ['LSM', 'Krueng Geukueh'] },
    { id: 'id-malahayati', name: 'Malahayati', city: 'Aceh Besar', country: 'Indonesia', lat: 5.59509, lon: 95.52644, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Malahayati', aliases: ['MLH', 'Krueng Raya'] },
    { id: 'id-sabang', name: 'Sabang', city: 'Pulau Weh', country: 'Indonesia', lat: 5.88333, lon: 95.31667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): SABANG #50610', aliases: ['SAB', 'SBG'] },
    { id: 'id-bandaaceh', name: 'Banda Aceh (Ulee Lheue)', city: 'Banda Aceh', country: 'Indonesia', lat: 5.56667, lon: 95.28333, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): ULEELHEUE #50600', aliases: ['BDA', 'B.ACEH'] },
    { id: 'id-nias', name: 'Nias (Gunungsitoli)', city: 'Nias', country: 'Indonesia', lat: 1.30556, lon: 97.60972, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Gunung Sitoli', aliases: ['NAS', 'Gunungsitoli'] },
    { id: 'id-sibolga', name: 'Sibolga', city: 'North Sumatra', country: 'Indonesia', lat: 1.73333, lon: 98.76667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): SIBOLGA #50510', aliases: ['SBA'] },
    { id: 'id-tbayur', name: 'Teluk Bayur', city: 'Padang', country: 'Indonesia', lat: -1.00000, lon: 100.36667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): TELUK BAYUR #50450', aliases: ['PDG', 'TBY', 'Padang'] },
    { id: 'id-tratai', name: 'Teluk Ratai', city: 'Lampung', country: 'Indonesia', lat: -5.60000, lon: 105.23000, verified: false, source: null, aliases: ['TRT'] },
    { id: 'id-bengkulu', name: 'Bengkulu (Pulau Baai)', city: 'Bengkulu', country: 'Indonesia', lat: -3.90822, lon: 102.30369, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Pulau Baai', aliases: ['BKU', 'Pulau Baai'] },
    { id: 'id-panjang', name: 'Panjang', city: 'Bandar Lampung', country: 'Indonesia', lat: -5.46667, lon: 105.31667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): PANJANG #50380', aliases: ['PJG'] },
    { id: 'id-tegal', name: 'Tegal', city: 'Central Java', country: 'Indonesia', lat: -6.85000, lon: 109.13333, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): TEGAL #51020', aliases: ['TGL'] },
    { id: 'id-cilacap', name: 'Cilacap', city: 'Central Java', country: 'Indonesia', lat: -7.73333, lon: 109.00000, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): CILACAP #51220', aliases: ['CLP'] },
    { id: 'id-banyuwangi', name: 'Banyuwangi', city: 'East Java', country: 'Indonesia', lat: -8.12889, lon: 114.39917, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tanjung Wangi', aliases: ['BWI'] },
    { id: 'id-ampenan', name: 'Ampenan', city: 'Lombok', country: 'Indonesia', lat: -8.56667, lon: 116.06667, verified: false, source: 'NGA World Port Index (to 1′): AMPENAN', aliases: ['AMP', 'Mataram'] },
    { id: 'id-lembar', name: 'Lembar', city: 'Lombok', country: 'Indonesia', lat: -8.73061, lon: 116.07339, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Lembar', aliases: ['LEMBAR'] },
    { id: 'id-kupang', name: 'Kupang (Tenau)', city: 'Kupang', country: 'Indonesia', lat: -10.19376, lon: 123.52907, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tenau', aliases: ['KPG', 'Tenau'] },
    { id: 'tl-dili', name: 'Dili', city: 'Timor-Leste', country: 'Timor-Leste', lat: -8.55300, lon: 125.57300, verified: false, source: null, aliases: ['DLI'] },
    { id: 'id-merauke', name: 'Merauke', city: 'South Papua', country: 'Indonesia', lat: -8.47889, lon: 140.39056, verified: false, river: true, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Merauke', aliases: ['MRE'] },
    { id: 'id-biak', name: 'Biak', city: 'Papua', country: 'Indonesia', lat: -1.18500, lon: 136.07528, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Biak', aliases: ['BIAK'] },
    { id: 'id-tual', name: 'Tual', city: 'Kei Islands', country: 'Indonesia', lat: -5.63333, lon: 132.74194, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Yos Sudarso Tual', aliases: ['TUAL'] },
    { id: 'id-ambon', name: 'Ambon', city: 'Maluku', country: 'Indonesia', lat: -3.68333, lon: 128.16667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): AMBON #52720', aliases: ['AMB'] },
    { id: 'id-jayapura', name: 'Jayapura', city: 'Papua', country: 'Indonesia', lat: -2.54556, lon: 140.71333, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Jayapura', aliases: ['JPR'] },
    { id: 'id-manokwari', name: 'Manokwari', city: 'Papua Barat', country: 'Indonesia', lat: -0.86667, lon: 134.08333, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): MANOKWARI ROAD #53010', aliases: ['MWR'] },
    { id: 'id-ternate', name: 'Ternate', city: 'North Maluku', country: 'Indonesia', lat: 0.78333, lon: 127.38333, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): TERNATE #52510', aliases: ['TNT'] },
    { id: 'id-tahuna', name: 'Tahuna (Sangihe)', city: 'Sangihe', country: 'Indonesia', lat: 3.61667, lon: 125.48333, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): TAHUNA #52440', aliases: ['SANGIHE', 'Tahuna'] },
    { id: 'id-kendari', name: 'Kendari', city: 'Southeast Sulawesi', country: 'Indonesia', lat: -3.96667, lon: 122.58333, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): KENDARI #52240', aliases: ['KDI'] },
    { id: 'id-tarakan', name: 'Tarakan', city: 'North Kalimantan', country: 'Indonesia', lat: 3.28333, lon: 117.60000, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): LINGKAS #51780', aliases: ['TRK'] },
    { id: 'id-banjarmasin', name: 'Banjarmasin (Trisakti)', city: 'South Kalimantan', country: 'Indonesia', lat: -3.33333, lon: 114.58333, verified: false, river: true, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): BANJARMASIN #51890', aliases: ['BSN', 'BJM', 'Trisakti'] },
    { id: 'id-nunukan', name: 'Nunukan', city: 'North Kalimantan', country: 'Indonesia', lat: 4.14583, lon: 117.65306, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Nunukan', aliases: ['NUK'] },
    { id: 'id-kotabaru', name: 'Kotabaru', city: 'South Kalimantan', country: 'Indonesia', lat: -3.23333, lon: 116.21667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): KOTA BARU #51860', aliases: ['KBU'] },
    { id: 'id-sangatta', name: 'Sangatta', city: 'East Kalimantan', country: 'Indonesia', lat: 0.36667, lon: 117.56667, verified: false, source: 'NGA World Port Index (to 1′): TANJUNG SANGATA', aliases: ['STA', 'SGT'] },
    { id: 'id-palu', name: 'Palu (Pantoloan)', city: 'Central Sulawesi', country: 'Indonesia', lat: -0.71111, lon: 119.85611, verified: false, source: 'SMDG Terminal Code List (terminal position): TPK Pantoloan', aliases: ['PLU', 'Pantoloan'] },
    { id: 'id-tolitoli', name: 'Tolitoli', city: 'Central Sulawesi', country: 'Indonesia', lat: 1.04278, lon: 120.81000, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Toli-toli', aliases: ['TLI'] },
    { id: 'id-miangas', name: 'Miangas', city: 'Talaud', country: 'Indonesia', lat: 5.55500, lon: 126.58500, verified: false, source: null, aliases: ['MGS'] },
    { id: 'id-maumere', name: 'Maumere', city: 'Flores', country: 'Indonesia', lat: -8.61667, lon: 122.21667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): MAUMERE #51320', aliases: ['MRE'] },
    { id: 'id-gebe', name: 'Gebe', city: 'North Maluku', country: 'Indonesia', lat: -0.07861, lon: 129.43083, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Gebe', aliases: ['GBE', 'Pulau Gebe'] },
    { id: 'id-dobo', name: 'Dobo (Aru)', city: 'Aru Islands', country: 'Indonesia', lat: -5.75713, lon: 134.23821, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Dobo Yos Sudarso', aliases: ['ARU', 'Aru'] },
    { id: 'id-timika', name: 'Timika (Pomako)', city: 'Central Papua', country: 'Indonesia', lat: -4.80278, lon: 136.76889, verified: false, river: true, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Pomako (Pamako)', aliases: ['TMK', 'Pomako'] },
    { id: 'id-nabire', name: 'Nabire', city: 'Central Papua', country: 'Indonesia', lat: -3.35111, lon: 135.50722, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Nabire', aliases: ['NBR'] },
    { id: 'id-cirebon', name: 'Cirebon', city: 'West Java', country: 'Indonesia', lat: -6.71667, lon: 108.56667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): CIREBON #51010', aliases: ['CBN'] },
    { id: 'id-cilegon', name: 'Cilegon (Ciwandan)', city: 'Banten', country: 'Indonesia', lat: -6.01667, lon: 105.96667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): BANTEN #50925', aliases: ['CLG', 'Ciwandan', 'Merak'] },
    { id: 'id-tbkarimun', name: 'Tanjung Balai Karimun', city: 'Riau Islands', country: 'Indonesia', lat: 0.98833, lon: 103.43694, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tanjung Balai Karimun', aliases: ['TBK', 'Karimun'] },
    { id: 'id-dabo', name: 'Dabo Singkep', city: 'Riau Islands', country: 'Indonesia', lat: -0.50000, lon: 104.56667, verified: false, source: 'NGA World Port Index (Pub. 150, public domain, to 1′): DABO #50100', aliases: ['DSK', 'Singkep'] }
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
