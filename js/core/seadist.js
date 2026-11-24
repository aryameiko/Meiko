/*
 * MEIKO core — sea distances from the port distance tables (js/data/distance-tables.js).
 *  - pair(a, b): every table figure for a pair, both directions (row a → column b and row b → column a).
 *  - route(a, b): when no table lists the pair, the shortest chain of table legs (Dijkstra), clearly an estimate.
 *  - check against the straight line: a table figure shorter than the great-circle distance between the
 *    (approximate) port positions is flagged as doubtful rather than silently used.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.seadist = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /**
   * data: MeikoData.distances. straightNM(keyA, keyB) → great-circle NM or null (when positions are unknown).
   */
  function create(data, straightNM) {
    straightNM = straightNM || function () { return null; };
    var idx = data.TABLES.map(function (t) { var m = {}; t.keys.forEach(function (k, i) { m[k] = i; }); return m; });
    function plausible(v, a, b) { var g = straightNM(a, b); return g == null || v >= g * 0.97; }

    function pair(a, b) {
      var out = [];
      data.TABLES.forEach(function (t, ti) {
        var i = idx[ti][a], j = idx[ti][b];
        if (i == null || j == null || i === j) return;
        var ab = t.rows[i][j], ba = t.rows[j][i];
        out.push({ table: t.id, title: t.title, ab: ab, ba: ba, codeA: t.codes[i], codeB: t.codes[j],
          agree: ab === ba, okAB: ab != null && plausible(ab, a, b), okBA: ba != null && plausible(ba, a, b) });
      });
      return out;
    }
    /** Best single figure for a pair: the row-of-departure value unless it is implausible. */
    function best(a, b) { // tables in priority order (newest first); within a table the smaller plausible figure
      var p = pair(a, b);
      for (var i = 0; i < p.length; i++) {
        var e = p[i], c = [];
        if (e.ab != null && e.okAB) c.push(e.ab); if (e.ba != null && e.okBA) c.push(e.ba);
        if (c.length) return Math.min.apply(null, c);
      }
      return null;
    }
    var graph = null;
    function buildGraph() {
      graph = {};
      data.TABLES.forEach(function (t) {
        t.keys.forEach(function (a) { graph[a] = graph[a] || {}; });
        t.keys.forEach(function (a) { t.keys.forEach(function (b) { if (a !== b) { var v = best(a, b); if (v != null && (graph[a][b] == null || v < graph[a][b])) graph[a][b] = v; } }); });
      });
    }
    /** Shortest chain of table legs a → … → b. Returns { nm, path:[keys], legs:[nm] } or null. */
    function route(a, b) {
      if (!graph) buildGraph();
      if (!graph[a] || !graph[b]) return null;
      var dist = {}, prev = {}, done = {}, keys = Object.keys(graph);
      keys.forEach(function (k) { dist[k] = Infinity; }); dist[a] = 0;
      for (;;) {
        var u = null; keys.forEach(function (k) { if (!done[k] && dist[k] < Infinity && (u == null || dist[k] < dist[u])) u = k; });
        if (u == null || u === b) break;
        done[u] = true;
        Object.keys(graph[u]).forEach(function (v) { var nd = dist[u] + graph[u][v]; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; } });
      }
      if (dist[b] === Infinity) return null;
      var path = [b]; while (path[0] !== a) path.unshift(prev[path[0]]);
      var legs = []; for (var i = 1; i < path.length; i++) legs.push(graph[path[i - 1]][path[i]]);
      return { nm: dist[b], path: path, legs: legs };
    }
    /** All table figures from a (its rows), sorted by distance. */
    function neighbours(a) {
      var m = {};
      data.TABLES.forEach(function (t, ti) {
        var i = idx[ti][a]; if (i == null) return;
        t.keys.forEach(function (b, j) { if (i !== j && t.rows[i][j] != null) { if (!m[b] || t.rows[i][j] < m[b]) m[b] = t.rows[i][j]; } });
      });
      return Object.keys(m).map(function (k) { return { key: k, nm: m[k] }; }).sort(function (x, y) { return x.nm - y.nm; });
    }
    function inTables(a) { return idx.some(function (m) { return m[a] != null; }); }
    return { pair: pair, best: best, route: route, neighbours: neighbours, inTables: inTables };
  }
  return { create: create };
});
