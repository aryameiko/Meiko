#!/usr/bin/env node
/*
 * Builds js/data/distance-tables.js: estimated sea distances (NM) between all ports in js/data/ports-data.js.
 *
 * Method (all inputs public domain / own code, no third-party distance tables):
 *  - Land from Natural Earth 1:10m (public domain), via the world-atlas package (ISC): node tools/sea-distances.js <land-10m.json>
 *    (npm pack world-atlas@2.0.2 → package/land-10m.json).
 *  - The region is rasterised on a 0.5′ grid by default (≈0.9 km; env CELLS_PER_DEG=60 for 1′); a cell is land when its centre is on land.
 *  - Shortest water path from each port with Dijkstra over 16 neighbours (orthogonal, diagonal, knight moves)
 *    with true local scale (cos latitude), so grid paths come within ~1–3 % of the real shortest line.
 *  - Each port is snapped to the nearest water cell; the snap distance is added. River ports (river: true) are
 *    measured from the coast/river mouth nearest to them, so their figures are only rough.
 * The figures are planning estimates. They ignore depth, traffic separation schemes, reefs and small islands
 * missing from the 1:10m coastline.
 */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const topojson = require(path.join(root, 'assets/vendor/topojson/topojson-client.min.js'));
const PORTS = require(path.join(root, 'js/data/ports-data.js')).all();

// Search aliases (common abbreviations and town names), so users can type SBY, Jakarta, Padang, …
const ALIASES = {"id-tpriok":["TPK","JKT","Jakarta","Tg. Priok","Priuk"],"id-tperak":["SBY","Surabaya"],"id-belawan":["BLW"],"id-makassar":["MKS","UPG","Ujung Pandang"],"id-bitung":["BTG"],"id-benoa":["Bali"],"id-bpn":["BPP"],"id-batam":["BTM"],"id-temas":["SMG","Semarang"],"id-sorong":["SRG"],"id-palembang":["PLG"],"id-muntok":["MTK","Mentok"],"id-pkbalam":["P.BLM","PKL.BALAM","Pangkalpinang"],"id-pontianak":["PTK"],"id-ranai":["RNI","Natuna"],"id-tarempa":["TRP","Terempa","Anambas"],"id-tguban":["TUB","Tg. Uban"],"id-tpinang":["TPI","Tg. Pinang"],"id-dumai":["DUM"],"id-lhokseumawe":["LSM","Krueng Geukueh"],"id-malahayati":["MLH","Krueng Raya"],"id-sabang":["SAB","SBG"],"id-bandaaceh":["BDA","B.ACEH"],"id-nias":["NAS","Gunungsitoli"],"id-sibolga":["SBA"],"id-tbayur":["PDG","TBY","Padang"],"id-tratai":["TRT"],"id-bengkulu":["BKU","Pulau Baai"],"id-panjang":["PJG"],"id-tegal":["TGL"],"id-cilacap":["CLP"],"id-banyuwangi":["BWI"],"id-ampenan":["AMP","Mataram"],"id-lembar":["LEMBAR"],"id-kupang":["KPG","Tenau"],"tl-dili":["DLI"],"id-merauke":["MKE"],"id-biak":["BIAK"],"id-tual":["TUAL"],"id-ambon":["AMB"],"id-jayapura":["JPR"],"id-manokwari":["MWR"],"id-ternate":["TNT"],"id-tahuna":["SANGIHE","Tahuna"],"id-kendari":["KDI"],"id-tarakan":["TRK"],"id-banjarmasin":["BSN","BJM","Trisakti"],"id-nunukan":["NUK"],"id-kotabaru":["KBU"],"id-sangatta":["STA","SGT"],"id-palu":["PLU","Pantoloan"],"id-tolitoli":["TLI"],"id-miangas":["MGS"],"id-maumere":["MRE"],"id-gebe":["GBE","Pulau Gebe"],"id-dobo":["ARU","Aru"],"id-timika":["TMK","Pomako"],"id-nabire":["NBR"],"id-cirebon":["CBN"],"id-cilegon":["CLG","Ciwandan","Merak"],"id-tbkarimun":["TBK","Karimun"],"id-dabo":["DSK","Singkep"]};

const landFile = process.argv[2];
if (!landFile) { console.error('usage: node tools/sea-distances.js <world-atlas land-10m.json>'); process.exit(1); }
const topo = JSON.parse(fs.readFileSync(landFile, 'utf8'));
const land = topojson.feature(topo, topo.objects.land);

const RES = 1 / (+process.env.CELLS_PER_DEG || 120); // default 0.5 arc-minute
const LON0 = 92, LON1 = 143, LAT0 = -14, LAT1 = 10;
const W = Math.round((LON1 - LON0) / RES), H = Math.round((LAT1 - LAT0) / RES);
const lonOf = x => LON0 + (x + 0.5) * RES, latOf = y => LAT1 - (y + 0.5) * RES;
console.log('grid', W, 'x', H, '=', (W * H / 1e6).toFixed(1) + 'M cells');

// ---- rasterise (even-odd scanline over all rings) ----
const isLand = new Uint8Array(W * H);
const rows = Array.from({ length: H }, () => []);
function addRing(r) {
  for (let i = 0; i < r.length - 1; i++) {
    let [x1, y1] = r[i], [x2, y2] = r[i + 1];
    if (y1 === y2) continue;
    if (Math.max(x1, x2) < LON0 - 1 || Math.min(x1, x2) > LON1 + 1) continue;
    const yMin = Math.min(y1, y2), yMax = Math.max(y1, y2);
    // rows whose centre latitude lies in [yMin, yMax)
    let r0 = Math.max(0, Math.ceil((LAT1 - yMax) / RES - 0.5)), r1 = Math.min(H - 1, Math.floor((LAT1 - yMin) / RES - 0.5));
    for (let y = r0; y <= r1; y++) {
      const la = latOf(y); if (la < yMin || la >= yMax) continue;
      rows[y].push(x1 + (la - y1) / (y2 - y1) * (x2 - x1));
    }
  }
}
land.features.forEach(f => {
  const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  polys.forEach(p => p.forEach(addRing));
});
for (let y = 0; y < H; y++) {
  const xs = rows[y].sort((a, b) => a - b);
  for (let i = 0; i + 1 < xs.length; i += 2) {
    let a = Math.ceil((xs[i] - LON0) / RES - 0.5), b = Math.floor((xs[i + 1] - LON0) / RES - 0.5);
    a = Math.max(a, 0); b = Math.min(b, W - 1);
    for (let x = a; x <= b; x++) isLand[y * W + x] = 1;
  }
}
console.log('land cells', isLand.reduce((s, v) => s + v, 0));

// ---- neighbours ----
const MOVES = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
const NM = RES * 60; // nautical miles per cell in latitude
const cosY = new Float64Array(H); for (let y = 0; y < H; y++) cosY[y] = Math.cos(latOf(y) * Math.PI / 180);
function water(x, y) { return x >= 0 && y >= 0 && x < W && y < H && !isLand[y * W + x]; }
function passable(x, y, dx, dy) {
  if (!water(x + dx, y + dy)) return false;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx === 1 && ady === 1) return water(x + dx, y) || water(x, y + dy);
  if (adx === 2) return water(x + Math.sign(dx), y) && water(x + Math.sign(dx), y + dy);
  if (ady === 2) return water(x, y + Math.sign(dy)) && water(x + dx, y + Math.sign(dy));
  return true;
}

// ---- open sea: water connected to the Java Sea (enclosed lagoons/lakes are not usable) ----
const sea = new Uint8Array(W * H);
{
  const start = Math.floor((LAT1 - (-5)) / RES) * W + Math.floor((110 - LON0) / RES);
  if (isLand[start]) throw new Error('seed on land');
  const st = new Int32Array(W * H); let sp = 0; st[sp++] = start; sea[start] = 1;
  while (sp) {
    const c = st[--sp], x = c % W, y = (c - x) / W;
    for (const [dx, dy] of MOVES) {
      const j = (y + dy) * W + x + dx;
      if (passable(x, y, dx, dy) && !sea[j]) { sea[j] = 1; st[sp++] = j; }
    }
  }
}

// ---- snap ports ----
function hav(la1, lo1, la2, lo2) {
  const r = Math.PI / 180, a = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.sqrt(a));
}
const ports = PORTS.map(p => {
  const x0 = Math.floor((p.lon - LON0) / RES), y0 = Math.floor((LAT1 - p.lat) / RES);
  let best = null;
  for (let r = 0; r < 400 && !best; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !water(x0 + dx, y0 + dy) || !sea[(y0 + dy) * W + x0 + dx]) continue;
      const d = hav(p.lat, p.lon, latOf(y0 + dy), lonOf(x0 + dx));
      if (!best || d < best.d) best = { x: x0 + dx, y: y0 + dy, d };
    }
  }
  if (!best) throw new Error('no water near ' + p.name);
  return { id: p.id, name: p.name, cell: best.y * W + best.x, snap: best.d };
});
ports.forEach(p => { if (p.snap > 3) console.log('  snap', p.name, p.snap.toFixed(1), 'NM'); });

// ---- Dijkstra ----
const dist = new Float64Array(W * H);
function dijkstra(src, targets) {
  let left = new Set(targets);
  dist.fill(Infinity); dist[src] = 0;
  let hk = new Float64Array(1 << 20), hv = new Int32Array(1 << 20), n = 0;
  function push(k, v) {
    if (n === hk.length) { const a = new Float64Array(n * 2), b = new Int32Array(n * 2); a.set(hk); b.set(hv); hk = a; hv = b; }
    let i = n++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = k; hv[i] = v;
  }
  function pop() {
    const v = hv[0], k = hk[0], lk = hk[--n], lv = hv[n]; let i = 0;
    while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && hk[c + 1] < hk[c]) c++; if (hk[c] >= lk) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; }
    hk[i] = lk; hv[i] = lv; return [k, v];
  }
  push(0, src);
  while (n) {
    const [d, c] = pop(); if (d > dist[c]) continue;
    if (left.delete(c) && !left.size) break;
    const x = c % W, y = (c - x) / W;
    for (const [dx, dy] of MOVES) {
      if (!passable(x, y, dx, dy)) continue;
      const ny = y + dy, cy = (cosY[y] + cosY[ny]) / 2;
      const nd = d + NM * Math.sqrt((dx * cy) ** 2 + dy * dy), j = ny * W + x + dx;
      if (nd < dist[j]) { dist[j] = nd; push(nd, j); }
    }
  }
}
const N = ports.length, M = Array.from({ length: N }, () => new Array(N).fill(null));
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  dijkstra(ports[i].cell, ports.filter((p, j) => j > i).map(p => p.cell));
  for (let j = 0; j < N; j++) if (i !== j) {
    const d = dist[ports[j].cell];
    M[i][j] = isFinite(d) ? Math.round(d + ports[i].snap + ports[j].snap) : null;
  }
  console.log((i + 1) + '/' + N + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
console.log();
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { // symmetric: same path both ways
  const a = M[i][j], b = M[j][i]; const v = a == null ? b : b == null ? a : Math.min(a, b); M[i][j] = M[j][i] = v;
}

const out = {
  TABLES: [{ id: 'computed', title: 'Computed sea distances (MEIKO, Natural Earth 1:10m coastline)',
    codes: ports.map(p => p.id), keys: ports.map(p => p.id), rows: M }],
  PLACES: Object.fromEntries(PORTS.map(p => [p.id, { name: p.name, area: p.city, port: p.id, aliases: ALIASES[p.id] || [], note: p.river ? 'River port: measured from the nearest coast, so the figure is rough.' : null }]))
};
const header = `/*
 * MEIKO — estimated sea distances (NM) between the ports in ports-data.js, generated by tools/sea-distances.js
 * on ${new Date().toISOString().slice(0, 10)}: shortest water path on a ${(60 * RES).toFixed(1).replace(/\.0$/, "")}′ grid of the Natural Earth 1:10m coastline (public domain).
 * Planning estimates only: depth, traffic separation schemes, reefs and small islands are not considered.
 * rows[i][j] = distance from keys[i] to keys[j]; null on the diagonal. Do not edit by hand.
 */
`;
fs.writeFileSync(path.join(root, 'js/data/distance-tables.js'), header + '(function (root) {\n  var d = ' + JSON.stringify(out) + ';\n  if (typeof module === \'object\' && module.exports) module.exports = d; else { root.MeikoData = root.MeikoData || {}; root.MeikoData.distances = d; }\n})(typeof self !== \'undefined\' ? self : this);\n');
console.log('written', N, 'ports');
