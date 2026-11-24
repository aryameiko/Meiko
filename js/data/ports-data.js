/*
 * MEIKO — port database (sample)
 *
 * ⚠ STATUS: UNVERIFIED
 * Since v1.8.4 the coordinates come, in order of preference, from the SMDG Terminal Code List (terminal
 * positions), the Kemenhub/Dephub port point datasets (via github.com/bennyistanto/geodata) and the NGA World Port
 * Index (to 1′); `source` names the one used, null = MEIKO estimate. `river: true` marks river ports (inland by nature).
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
    { id: 'id-tpriok',   name: 'Tanjung Priok',      city: 'Jakarta',     country: 'Indonesia', lat: -6.10056, lon: 106.89056, verified: false, source: 'SMDG Terminal Code List (terminal position): IPC TPK Tanjung Priok', aliases: ['Priok', 'Jakarta'] },
    { id: 'id-tperak',   name: 'Tanjung Perak',      city: 'Surabaya',    country: 'Indonesia', lat: -7.19661, lon: 112.73235, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tanjung Perak', aliases: ['Surabaya', 'Perak'] },
    { id: 'id-belawan',  name: 'Belawan',            city: 'Medan',       country: 'Indonesia', lat: 3.78779, lon: 98.70408,  verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Belawan', aliases: ['Medan'] },
    { id: 'id-makassar', name: 'Makassar (Soekarno-Hatta)', city: 'Makassar', country: 'Indonesia', lat: -5.12972, lon: 119.40444, verified: false, source: 'SMDG Terminal Code List (terminal position): Makassar Container Terminal', aliases: ['Ujung Pandang', 'Soekarno Hatta'] },
    { id: 'id-bitung',   name: 'Bitung',             city: 'Bitung',      country: 'Indonesia', lat: 1.43917, lon: 125.19833, verified: false, source: 'SMDG Terminal Code List (terminal position): TPK Bitung', aliases: [] },
    { id: 'id-benoa',    name: 'Benoa',              city: 'Denpasar, Bali', country: 'Indonesia', lat: -8.74417, lon: 115.21083, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Benoa', aliases: ['Bali', 'Denpasar'] },
    { id: 'id-bpn',      name: 'Balikpapan (Semayang)', city: 'Balikpapan', country: 'Indonesia', lat: -1.21064, lon: 116.78786, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Balikpapan (Semayang)', aliases: ['Semayang'] },
    { id: 'id-batam',    name: 'Batam (Batu Ampar)', city: 'Batam',       country: 'Indonesia', lat: 1.16639, lon: 104.00222, verified: false, source: 'SMDG Terminal Code List (terminal position): Batu Ampar', aliases: ['Batu Ampar'] },
    { id: 'id-temas',    name: 'Tanjung Emas',       city: 'Semarang',    country: 'Indonesia', lat: -6.95538, lon: 110.42193, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tanjung Emas', aliases: ['Semarang'] },
    { id: 'id-sorong',   name: 'Sorong',             city: 'Sorong',      country: 'Indonesia', lat: -0.87750, lon: 131.24389, verified: false, source: 'SMDG Terminal Code List (terminal position): TPK Sorong', aliases: [] },
    // Added v1.8 for the sea-distance tables (approximate harbour positions, unverified).
    { id: 'id-palembang', name: 'Palembang (Boom Baru)', city: 'Palembang', country: 'Indonesia', lat: -2.98056, lon: 104.77861, verified: false, river: true, source: 'SMDG Terminal Code List (terminal position): Boom Baru', aliases: ['PLG'] },
    { id: 'id-muntok', name: 'Muntok', city: 'Bangka', country: 'Indonesia', lat: -2.07583, lon: 105.17917, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Muntok', aliases: ['MTK', 'Mentok'] },
    { id: 'id-pkbalam', name: 'Pangkal Balam', city: 'Pangkalpinang', country: 'Indonesia', lat: -2.09833, lon: 106.13056, verified: false, river: true, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Pangkal Balam', aliases: ['P.BLM', 'PKL.BALAM', 'Pangkalpinang'] },
    { id: 'id-pontianak', name: 'Pontianak', city: 'Pontianak', country: 'Indonesia', lat: -0.00694, lon: 109.32222, verified: false, river: true, source: 'SMDG Terminal Code List (terminal position): IPC TPK Pontianak', aliases: ['PTK'] },
    { id: 'id-ranai', name: 'Ranai', city: 'Natuna', country: 'Indonesia', lat: 3.94500, lon: 108.39000, verified: false, source: null, aliases: ['RNI', 'Natuna'] },
    { id: 'id-tarempa', name: 'Tarempa', city: 'Anambas', country: 'Indonesia', lat: 3.21667, lon: 106.21667, verified: false, source: 'NGA World Port Index (to 1′): TAREMPAH', aliases: ['TRP', 'Terempa', 'Anambas'] },
    { id: 'id-tguban', name: 'Tanjung Uban', city: 'Bintan', country: 'Indonesia', lat: 1.07556, lon: 104.21361, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tanjung Uban', aliases: ['TUB', 'Tg. Uban'] },
    { id: 'id-tpinang', name: 'Tanjung Pinang', city: 'Bintan', country: 'Indonesia', lat: 0.93222, lon: 104.43890, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Sri Bintan Pura', aliases: ['TPI', 'Tg. Pinang'] },
    { id: 'id-dumai', name: 'Dumai', city: 'Riau', country: 'Indonesia', lat: 1.68694, lon: 101.45667, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Dumai', aliases: ['DUM'] },
    { id: 'id-lhokseumawe', name: 'Lhokseumawe', city: 'Aceh', country: 'Indonesia', lat: 5.24083, lon: 97.03944, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Lhokseumawe (Krueng Geukueh)', aliases: ['LSM', 'Krueng Geukueh'] },
    { id: 'id-malahayati', name: 'Malahayati', city: 'Aceh Besar', country: 'Indonesia', lat: 5.59509, lon: 95.52644, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Malahayati', aliases: ['MLH', 'Krueng Raya'] },
    { id: 'id-sabang', name: 'Sabang', city: 'Pulau Weh', country: 'Indonesia', lat: 5.88944, lon: 95.31806, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Sabang', aliases: ['SAB', 'SBG'] },
    { id: 'id-bandaaceh', name: 'Banda Aceh (Ulee Lheue)', city: 'Banda Aceh', country: 'Indonesia', lat: 5.56546, lon: 95.29446, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Ulee Lheue', aliases: ['BDA', 'B.ACEH'] },
    { id: 'id-nias', name: 'Nias (Gunungsitoli)', city: 'Nias', country: 'Indonesia', lat: 1.30556, lon: 97.60972, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Gunung Sitoli', aliases: ['NAS', 'Gunungsitoli'] },
    { id: 'id-sibolga', name: 'Sibolga', city: 'North Sumatra', country: 'Indonesia', lat: 1.72806, lon: 98.78639, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Sibolga', aliases: ['SBA'] },
    { id: 'id-tbayur', name: 'Teluk Bayur', city: 'Padang', country: 'Indonesia', lat: -0.99722, lon: 100.37194, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Teluk Bayur', aliases: ['PDG', 'TBY', 'Padang'] },
    { id: 'id-tratai', name: 'Teluk Ratai', city: 'Lampung', country: 'Indonesia', lat: -5.60000, lon: 105.23000, verified: false, source: null, aliases: ['TRT'] },
    { id: 'id-bengkulu', name: 'Bengkulu (Pulau Baai)', city: 'Bengkulu', country: 'Indonesia', lat: -3.90822, lon: 102.30369, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Pulau Baai', aliases: ['BKU', 'Pulau Baai'] },
    { id: 'id-panjang', name: 'Panjang', city: 'Bandar Lampung', country: 'Indonesia', lat: -5.46818, lon: 105.31866, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Panjang', aliases: ['PJG'] },
    { id: 'id-tegal', name: 'Tegal', city: 'Central Java', country: 'Indonesia', lat: -6.84806, lon: 109.13722, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tegal', aliases: ['TGL'] },
    { id: 'id-cilacap', name: 'Cilacap', city: 'Central Java', country: 'Indonesia', lat: -7.73139, lon: 108.99333, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tanjung Intan', aliases: ['CLP'] },
    { id: 'id-banyuwangi', name: 'Banyuwangi', city: 'East Java', country: 'Indonesia', lat: -8.12889, lon: 114.39917, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tanjung Wangi', aliases: ['BWI'] },
    { id: 'id-ampenan', name: 'Ampenan', city: 'Lombok', country: 'Indonesia', lat: -8.56667, lon: 116.06667, verified: false, source: 'NGA World Port Index (to 1′): AMPENAN', aliases: ['AMP', 'Mataram'] },
    { id: 'id-lembar', name: 'Lembar', city: 'Lombok', country: 'Indonesia', lat: -8.73061, lon: 116.07339, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Lembar', aliases: ['LEMBAR'] },
    { id: 'id-kupang', name: 'Kupang (Tenau)', city: 'Kupang', country: 'Indonesia', lat: -10.19376, lon: 123.52907, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tenau', aliases: ['KPG', 'Tenau'] },
    { id: 'tl-dili', name: 'Dili', city: 'Timor-Leste', country: 'Timor-Leste', lat: -8.55300, lon: 125.57300, verified: false, source: null, aliases: ['DLI'] },
    { id: 'id-merauke', name: 'Merauke', city: 'South Papua', country: 'Indonesia', lat: -8.47889, lon: 140.39056, verified: false, river: true, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Merauke', aliases: ['MRE'] },
    { id: 'id-biak', name: 'Biak', city: 'Papua', country: 'Indonesia', lat: -1.18500, lon: 136.07528, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Biak', aliases: ['BIAK'] },
    { id: 'id-tual', name: 'Tual', city: 'Kei Islands', country: 'Indonesia', lat: -5.63333, lon: 132.74194, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Yos Sudarso Tual', aliases: ['TUAL'] },
    { id: 'id-ambon', name: 'Ambon', city: 'Maluku', country: 'Indonesia', lat: -3.69490, lon: 128.17546, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Ambon', aliases: ['AMB'] },
    { id: 'id-jayapura', name: 'Jayapura', city: 'Papua', country: 'Indonesia', lat: -2.54556, lon: 140.71333, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Jayapura', aliases: ['JPR'] },
    { id: 'id-manokwari', name: 'Manokwari', city: 'Papua Barat', country: 'Indonesia', lat: -0.86750, lon: 134.07472, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Manokwari', aliases: ['MWR'] },
    { id: 'id-ternate', name: 'Ternate', city: 'North Maluku', country: 'Indonesia', lat: 0.78014, lon: 127.38826, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Achmad Yani Ternate', aliases: ['TNT'] },
    { id: 'id-tahuna', name: 'Tahuna (Sangihe)', city: 'Sangihe', country: 'Indonesia', lat: 3.60123, lon: 125.50167, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tahuna', aliases: ['SANGIHE', 'Tahuna'] },
    { id: 'id-kendari', name: 'Kendari', city: 'Southeast Sulawesi', country: 'Indonesia', lat: -3.97361, lon: 122.58389, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Pelabuhan Nusantara Kendari', aliases: ['KDI'] },
    { id: 'id-tarakan', name: 'Tarakan', city: 'North Kalimantan', country: 'Indonesia', lat: 3.28056, lon: 117.59417, verified: false, source: 'SMDG Terminal Code List (terminal position): TPK Tarakan (Malundung)', aliases: ['TRK'] },
    { id: 'id-banjarmasin', name: 'Banjarmasin (Trisakti)', city: 'South Kalimantan', country: 'Indonesia', lat: -3.32806, lon: 114.55778, verified: false, river: true, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Trisakti', aliases: ['BSN', 'BJM', 'Trisakti'] },
    { id: 'id-nunukan', name: 'Nunukan', city: 'North Kalimantan', country: 'Indonesia', lat: 4.14583, lon: 117.65306, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Nunukan', aliases: ['NUK'] },
    { id: 'id-kotabaru', name: 'Kotabaru', city: 'South Kalimantan', country: 'Indonesia', lat: -3.23611, lon: 116.22472, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Kotabaru', aliases: ['KBU'] },
    { id: 'id-sangatta', name: 'Sangatta', city: 'East Kalimantan', country: 'Indonesia', lat: 0.36667, lon: 117.56667, verified: false, source: 'NGA World Port Index (to 1′): TANJUNG SANGATA', aliases: ['STA', 'SGT'] },
    { id: 'id-palu', name: 'Palu (Pantoloan)', city: 'Central Sulawesi', country: 'Indonesia', lat: -0.71111, lon: 119.85611, verified: false, source: 'SMDG Terminal Code List (terminal position): TPK Pantoloan', aliases: ['PLU', 'Pantoloan'] },
    { id: 'id-tolitoli', name: 'Tolitoli', city: 'Central Sulawesi', country: 'Indonesia', lat: 1.04278, lon: 120.81000, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Toli-toli', aliases: ['TLI'] },
    { id: 'id-miangas', name: 'Miangas', city: 'Talaud', country: 'Indonesia', lat: 5.55500, lon: 126.58500, verified: false, source: null, aliases: ['MGS'] },
    { id: 'id-maumere', name: 'Maumere', city: 'Flores', country: 'Indonesia', lat: -8.61556, lon: 122.21833, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Maumere', aliases: ['MRE'] },
    { id: 'id-gebe', name: 'Gebe', city: 'North Maluku', country: 'Indonesia', lat: -0.07861, lon: 129.43083, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Gebe', aliases: ['GBE', 'Pulau Gebe'] },
    { id: 'id-dobo', name: 'Dobo (Aru)', city: 'Aru Islands', country: 'Indonesia', lat: -5.75713, lon: 134.23821, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Dobo Yos Sudarso', aliases: ['ARU', 'Aru'] },
    { id: 'id-timika', name: 'Timika (Pomako)', city: 'Central Papua', country: 'Indonesia', lat: -4.80278, lon: 136.76889, verified: false, river: true, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Pomako (Pamako)', aliases: ['TMK', 'Pomako'] },
    { id: 'id-nabire', name: 'Nabire', city: 'Central Papua', country: 'Indonesia', lat: -3.35111, lon: 135.50722, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Nabire', aliases: ['NBR'] },
    { id: 'id-cirebon', name: 'Cirebon', city: 'West Java', country: 'Indonesia', lat: -6.71306, lon: 108.57028, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Pelabuhan Cirebon', aliases: ['CBN'] },
    { id: 'id-cilegon', name: 'Cilegon (Ciwandan)', city: 'Banten', country: 'Indonesia', lat: -6.01944, lon: 105.95361, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Ciwandan', aliases: ['CLG', 'Ciwandan', 'Merak'] },
    { id: 'id-tbkarimun', name: 'Tanjung Balai Karimun', city: 'Riau Islands', country: 'Indonesia', lat: 0.98833, lon: 103.43694, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Tanjung Balai Karimun', aliases: ['TBK', 'Karimun'] },
    { id: 'id-dabo', name: 'Dabo Singkep', city: 'Riau Islands', country: 'Indonesia', lat: -0.50164, lon: 104.56595, verified: false, source: 'Kemenhub port dataset (bennyistanto/geodata, trs/idn_trs_port_*_dephub_p): Dabo Singkep', aliases: ['DSK', 'Singkep'] }
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
