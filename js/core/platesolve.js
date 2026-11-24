/*
 * MEIKO core — identify stars in a night-sky photo on the device ("plate solving"), no internet.
 *
 *  1. detect(): find point-like bright spots on a grey image (background map + noise estimate,
 *     local maxima, intensity-weighted centroids; large blobs such as the Moon or lights are dropped).
 *  2. solve(): match triangles of the brightest detections against triangles of catalogue stars
 *     (scale- and rotation-invariant side ratios, same handedness), estimate focal length and the
 *     camera attitude (Horn quaternion), verify by projecting fainter stars, then refine by least squares.
 *  Camera frame: x right, y down, z forward (pinhole/gnomonic; lens distortion is not modelled).
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.platesolve = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var rad = Math.PI / 180, deg = 180 / Math.PI;

  /* ---------- vectors ---------- */
  function vec(ra, dec) { var a = ra * rad, d = dec * rad; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; }
  function radec(v) { var r = Math.atan2(v[1], v[0]) * deg; return { ra: r < 0 ? r + 360 : r, dec: Math.asin(Math.max(-1, Math.min(1, v[2]))) * deg }; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.sqrt(dot(a, a)); return [a[0] / l, a[1] / l, a[2] / l]; }
  function ang(a, b) { return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))); }
  function mul(R, v) { return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]]; }
  function mulT(R, v) { return [R[0] * v[0] + R[3] * v[1] + R[6] * v[2], R[1] * v[0] + R[4] * v[1] + R[7] * v[2], R[2] * v[0] + R[5] * v[1] + R[8] * v[2]]; }
  function camVec(x, y, f, cx, cy) { return norm([(x - cx) / f, (y - cy) / f, 1]); }

  /* ---------- 1. detection ---------- */
  /**
   * gray: Float32Array/Uint8Array (0–255), w × h. Returns [{ x, y, flux, peak, area }] sorted by flux (brightest first).
   * opts: { max (60), sigma (5), block (32) }
   */
  function detect(gray, w, h, opts) {
    opts = opts || {};
    var B = opts.block || 32, nbx = Math.ceil(w / B), nby = Math.ceil(h / B);
    var bg = new Float32Array(nbx * nby), tmp = [];
    for (var by = 0; by < nby; by++) for (var bx = 0; bx < nbx; bx++) {
      tmp.length = 0;
      for (var yy = by * B; yy < Math.min(h, by * B + B); yy += 2) for (var xx = bx * B; xx < Math.min(w, bx * B + B); xx += 2) tmp.push(gray[yy * w + xx]);
      tmp.sort(function (a, b) { return a - b; });
      bg[by * nbx + bx] = tmp[Math.floor(tmp.length * 0.4)] || 0;
    }
    function bgAt(x, y) {
      var fx = Math.max(0, Math.min(nbx - 1.001, x / B - 0.5)), fy = Math.max(0, Math.min(nby - 1.001, y / B - 0.5));
      var x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, x1 = Math.min(nbx - 1, x0 + 1), y1 = Math.min(nby - 1, y0 + 1);
      return (bg[y0 * nbx + x0] * (1 - tx) + bg[y0 * nbx + x1] * tx) * (1 - ty) + (bg[y1 * nbx + x0] * (1 - tx) + bg[y1 * nbx + x1] * tx) * ty;
    }
    // noise: median absolute deviation of (pixel − background) on a sparse grid
    var res = [];
    for (var y = 3; y < h - 3; y += 5) for (var x = 3; x < w - 3; x += 5) res.push(Math.abs(gray[y * w + x] - bgAt(x, y)));
    res.sort(function (a, b) { return a - b; });
    var sigma = Math.max(1.5, 1.4826 * (res[Math.floor(res.length / 2)] || 1));
    var thr = (opts.sigma || 5) * sigma;
    var out = [];
    for (y = 3; y < h - 3; y++) for (x = 3; x < w - 3; x++) {
      var v = gray[y * w + x], b0 = bgAt(x, y);
      if (v - b0 < thr) continue;
      // local maximum in a 5×5 window (ties: first pixel wins)
      var isMax = true;
      for (var dy = -2; dy <= 2 && isMax; dy++) for (var dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        var u = gray[(y + dy) * w + x + dx];
        if (u > v || (u === v && (dy < 0 || (dy === 0 && dx < 0)))) { isMax = false; break; }
      }
      if (!isMax) continue;
      // centroid & flux in 7×7, area above half-threshold in 15×15 (to reject big blobs)
      var sx = 0, sy = 0, sf = 0, area = 0;
      for (dy = -3; dy <= 3; dy++) for (dx = -3; dx <= 3; dx++) {
        var q = gray[(y + dy) * w + x + dx] - b0; if (q > 0) { sx += q * dx; sy += q * dy; sf += q; }
      }
      for (dy = -7; dy <= 7; dy += 1) for (dx = -7; dx <= 7; dx += 1) {
        var yy2 = y + dy, xx2 = x + dx; if (yy2 < 0 || yy2 >= h || xx2 < 0 || xx2 >= w) continue;
        if (gray[yy2 * w + xx2] - b0 > thr * 0.5) area++;
      }
      if (area > 120) continue; // Moon, lamps, clouds lit by lights
      var ring = 0, rn = 0; // edge of a big bright blob: much of a radius-11 ring is still bright
      for (var ai = 0; ai < 32; ai++) {
        var rx = Math.round(x + 11 * Math.cos(ai * Math.PI / 16)), ry = Math.round(y + 11 * Math.sin(ai * Math.PI / 16));
        if (rx < 0 || ry < 0 || rx >= w || ry >= h) continue;
        rn++; if (gray[ry * w + rx] - b0 > thr * 0.5) ring++;
      }
      if (rn && ring / rn > 0.2) continue;
      out.push({ x: x + sx / sf, y: y + sy / sf, flux: sf, peak: v - b0, area: area });
    }
    out.sort(function (a, b) { return b.flux - a.flux; });
    // non-maximum suppression (double peaks of the same star)
    var keep = [];
    for (var i = 0; i < out.length && keep.length < (opts.max || 60); i++) {
      var ok = true;
      for (var j = 0; j < keep.length; j++) { var ddx = keep[j].x - out[i].x, ddy = keep[j].y - out[i].y; if (ddx * ddx + ddy * ddy < 36) { ok = false; break; } }
      if (ok) keep.push(out[i]);
    }
    return { stars: keep, sigma: sigma };
  }

  /* ---------- catalogue triangle index (built once per catalogue) ---------- */
  var BIN = 0.01;
  function buildIndex(cat, opts) {
    var maxSide = (opts.maxSideDeg || 70) * rad, minSide = (opts.minSideDeg || 1.5) * rad;
    var S = cat.filter(function (s) { return s.mag <= (opts.indexMag || 3.3); });
    S.forEach(function (s) { s.v = s.v || vec(s.ra, s.dec); });
    var n = S.length, A = new Float32Array(n * n);
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) A[i * n + j] = A[j * n + i] = ang(S[i].v, S[j].v);
    var map = new Map(), count = 0;
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      var dij = A[i * n + j]; if (dij > maxSide || dij < minSide) continue;
      for (var k = j + 1; k < n; k++) {
        var dik = A[i * n + k], djk = A[j * n + k];
        if (dik > maxSide || djk > maxSide || dik < minSide || djk < minSide) continue;
        var t = canon([i, j, k], [djk, dik, dij], function (a) { return S[a].v; });
        var key = Math.round(t.r1 / BIN) * 1000 + Math.round(t.r2 / BIN);
        var arr = map.get(key); if (!arr) map.set(key, arr = []);
        arr.push(t.idx[0], t.idx[1], t.idx[2], t.sign);
        count++;
      }
    }
    return { stars: S, map: map, count: count, maxSide: maxSide, minSide: minSide };
  }
  /**
   * Canonical vertex order: vertex opposite the longest side first, then opposite the middle, then shortest.
   * sides[i] = length of the side opposite vertex i. Returns ratios (middle/longest, shortest/longest) and handedness sign.
   */
  function canon(idx, sides, vget) {
    var o = [0, 1, 2].sort(function (a, b) { return sides[b] - sides[a]; });
    var I = [idx[o[0]], idx[o[1]], idx[o[2]]];
    var s0 = sides[o[0]], s1 = sides[o[1]], s2 = sides[o[2]];
    var v0 = vget(I[0]), v1 = vget(I[1]), v2 = vget(I[2]);
    return { idx: I, r1: s1 / s0, r2: s2 / s0, sign: dot(v0, cross(v1, v2)) > 0 ? 1 : -1, sides: [s0, s1, s2] };
  }

  /* ---------- attitude from vector pairs (Horn 1987, quaternion) ---------- */
  function attitude(camVs, skyVs, weights) {
    var S = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var n = 0; n < camVs.length; n++) {
      var a = camVs[n], b = skyVs[n], wgt = weights ? weights[n] : 1;
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) S[i * 3 + j] += wgt * a[i] * b[j];
    }
    var Sxx = S[0], Sxy = S[1], Sxz = S[2], Syx = S[3], Syy = S[4], Syz = S[5], Szx = S[6], Szy = S[7], Szz = S[8];
    var N = [
      [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
      [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
      [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
      [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]];
    var q = maxEigvec4(N);
    var w = q[0], x = q[1], y = q[2], z = q[3];
    return [w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y),
      2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x),
      2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z];
  }
  function maxEigvec4(A) { // Jacobi eigen-decomposition of a symmetric 4×4
    var a = A.map(function (r) { return r.slice(); }), V = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    for (var sweep = 0; sweep < 30; sweep++) {
      var off = 0;
      for (var p = 0; p < 4; p++) for (var q = p + 1; q < 4; q++) off += a[p][q] * a[p][q];
      if (off < 1e-18) break;
      for (p = 0; p < 4; p++) for (q = p + 1; q < 4; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        var th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        var t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (var k = 0; k < 4; k++) { var akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (k = 0; k < 4; k++) { var apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (k = 0; k < 4; k++) { var vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    var best = 0; for (var i = 1; i < 4; i++) if (a[i][i] > a[best][best]) best = i;
    return [V[0][best], V[1][best], V[2][best], V[3][best]];
  }

  /* ---------- lens model: pinhole + one radial term (undistorted = distorted·(1 + k·r²), r in half-widths) ---------- */
  function pixToCam(m, x, y) {
    var dx = x - m.cx, dy = y - m.cy, s = m.k ? 1 + m.k * (dx * dx + dy * dy) / (m.hw * m.hw) : 1;
    return norm([dx * s / m.f, dy * s / m.f, 1]);
  }
  function camToPix(m, c) {
    if (c[2] <= 0.05) return null;
    var ux = m.f * c[0] / c[2], uy = m.f * c[1] / c[2], dx = ux, dy = uy;
    if (m.k) for (var i = 0; i < 4; i++) { var s = 1 + (m.k || 0) * (dx * dx + dy * dy) / (m.hw * m.hw); dx = ux / s; dy = uy / s; }
    return { x: m.cx + dx, y: m.cy + dy };
  }

  /* ---------- 2. solve ---------- */
  /**
   * dets: detections (brightest first), w,h: image size, cat: [{ id, ra, dec, mag, ... }].
   * opts: { fovMin (15°), fovMax (110°), fovHint (68°), budgetMs (6000), index (prebuilt), K (14), verifyMag (4.6) }
   * Returns { ok, f, k, R, fovX, fovY, matches:[{ d, di, s, resPx }], rmsPx, center:{ra,dec}, tried, ms } or { ok:false, reason }.
   */
  function solve(dets, w, h, cat, opts) {
    opts = opts || {};
    var t0 = Date.now(), budget = opts.budgetMs || 6000;
    if (dets.length < 5) return { ok: false, reason: 'few', found: dets.length };
    var cx = w / 2, cy = h / 2, hw = Math.max(w, h) / 2, diag = Math.sqrt(w * w + h * h);
    var fMin = hw / Math.tan((opts.fovMax || 110) * rad / 2), fMax = hw / Math.tan((opts.fovMin || 15) * rad / 2);
    var index = opts.index || buildIndex(cat, opts);
    var verify = cat.filter(function (s) { return s.mag <= (opts.verifyMag || 4.6); });
    verify.forEach(function (s) { s.v = s.v || vec(s.ra, s.dec); });
    var K = Math.min(dets.length, opts.K || 14), top = dets.slice(0, K);
    var tol = Math.max(4, 0.007 * diag), tolT = Math.max(2.5, tol * 0.3);
    var best = null, tried = 0;
    function model(f, k) { return { f: f, k: k || 0, cx: cx, cy: cy, hw: hw }; }

    // Match catalogue stars to detections. slack widens the tolerance towards the corners (unknown distortion).
    function score(R, m, tolPx, slack) {
      var used = {}, matches = [], lam = 0, area = w * h;
      for (var i = 0; i < verify.length; i++) {
        var c = mulT(R, verify[i].v); if (c[2] < 0.2) continue;
        var p = camToPix(m, c); if (!p) continue;
        var rr = ((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy)) / (hw * hw);
        var tp = tolPx + (slack || 0) * rr * hw;
        if (p.x < -tp || p.y < -tp || p.x > w + tp || p.y > h + tp) continue;
        lam += Math.min(1, dets.length * Math.PI * tp * tp / area);
        var bi = -1, bd = tp * tp;
        for (var j = 0; j < dets.length; j++) {
          if (used[j]) continue;
          var dx = dets[j].x - p.x, dy = dets[j].y - p.y, d2 = dx * dx + dy * dy;
          if (d2 < bd) { bd = d2; bi = j; }
        }
        if (bi >= 0) { used[bi] = 1; matches.push({ d: dets[bi], di: bi, s: verify[i], resPx: Math.sqrt(bd) }); }
      }
      // how far above chance (matches expected if the pointing were wrong) this result is
      matches.sig = (matches.length - lam) / Math.sqrt(lam + 1);
      return matches;
    }
    function rmsOf(ms) { return Math.sqrt(ms.reduce(function (s, mm) { return s + mm.resPx * mm.resPx; }, 0) / Math.max(1, ms.length)); }
    function refine(R, m, matches) {
      var slacks = [0.04, 0.02, 0.01, 0.005, 0.005, 0.005];
      for (var it = 0; it < slacks.length; it++) {
        R = attitude(matches.map(function (mm) { return pixToCam(m, mm.d.x, mm.d.y); }), matches.map(function (mm) { return mm.s.v; }));
        // focal length and radial term together (linear least squares, R fixed):
        //   f·(c/c_z) − k·d·r² = d   for each matched star (d = detected offset from the centre)
        var a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0, useK = matches.length >= 8;
        matches.forEach(function (mm) {
          var c = mulT(R, mm.s.v), gx = c[0] / c[2], gy = c[1] / c[2];
          var dx = mm.d.x - cx, dy = mm.d.y - cy, r2 = (dx * dx + dy * dy) / (hw * hw);
          var hx = -dx * r2, hy = -dy * r2;
          a11 += gx * gx + gy * gy; a12 += gx * hx + gy * hy; a22 += hx * hx + hy * hy;
          b1 += gx * dx + gy * dy; b2 += hx * dx + hy * dy;
        });
        var det = a11 * a22 - a12 * a12;
        if (useK && Math.abs(det) > 1e-9 * a11 * a22) {
          var fN = (a22 * b1 - a12 * b2) / det, kN = (a11 * b2 - a12 * b1) / det;
          if (fN > 0 && Math.abs(kN) < 0.2) m = model(fN, kN); else m = model(b1 / a11, m.k);
        } else if (a11 > 0) m = model((b1 - (m.k || 0) * a12) / a11, m.k);
        matches = score(R, m, Math.max(3, tol * 0.6), slacks[it]);
        if (matches.length < 4) break;
      }
      R = attitude(matches.map(function (mm) { return pixToCam(m, mm.d.x, mm.d.y); }), matches.map(function (mm) { return mm.s.v; }));
      matches = score(R, m, Math.max(3, tol * 0.6), 0.005);
      return { R: R, m: m, matches: matches };
    }
    function good(r) { // must hold up with a tight tolerance too: chance matches shrink with tol², true ones do not
      r.rmsPx = rmsOf(r.matches);
      if (r.matches.length < 6 || r.matches.sig < 6.5) return false;
      var tight = score(r.R, r.m, tolT, 0); r.sigT = tight.sig; r.tight = tight;
      return tight.length >= 6 && tight.sig >= 9;
    }

    // Focal-length guesses: image triangle sides are measured as angles with each guess, so the
    // gnomonic stretch of wide lenses does not spoil the side ratios. Typical phone field first.
    var guesses = [], fovG = opts.fovMax || 110, typical = opts.fovHint || 68;
    while (fovG >= (opts.fovMin || 15) * 0.95) { guesses.push({ fov: fovG, f: hw / Math.tan(fovG * rad / 2) }); fovG /= 1.22; }
    guesses = guesses.sort(function (a, b) { return Math.abs(Math.log(a.fov / typical)) - Math.abs(Math.log(b.fov / typical)); }).map(function (g) { return g.f; });
    var iv = index.stars;
    function quick(R, m, usedIdx) { // do other bright detections land on an index star?
      var hit = 0, n = 0;
      for (var q = 0; q < K && n < 10; q++) {
        if (usedIdx.indexOf(q) >= 0) continue;
        n++;
        var ddx = top[q].x - cx, ddy = top[q].y - cy, lim = Math.cos(Math.max((1.5 * tol + 0.05 * (ddx * ddx + ddy * ddy) / hw) / m.f, 0.004));
        var sv = mul(R, pixToCam(m, top[q].x, top[q].y));
        for (var u = 0; u < iv.length; u++) if (dot(sv, iv[u].v) > lim) { hit++; break; }
      }
      return hit;
    }
    var CV = guesses.map(function (fg) { var mg = model(fg, 0); return top.map(function (p) { return pixToCam(mg, p.x, p.y); }); });
    // triangles in brightness order (k outermost so the brightest few are combined first), every guess per triangle
    outer:
    for (var k = 2; k < K; k++) for (var j = 1; j < k; j++) for (var i = 0; i < j; i++) for (var gi = 0; gi < guesses.length; gi++) {
      if (Date.now() - t0 > budget) break outer;
      var fg = guesses[gi], cv = CV[gi];
      {
        var tri = [i, j, k];
        var sides = [ang(cv[j], cv[k]), ang(cv[i], cv[k]), ang(cv[i], cv[j])];
        if (Math.min(sides[0], sides[1], sides[2]) * fg < 0.03 * diag) continue;
        var dmax = Math.max(sides[0], sides[1], sides[2]);
        if (dmax > index.maxSide * 1.25 || dmax < index.minSide * 0.8) continue;
        var t = canon([0, 1, 2], sides, function (a) { return cv[tri[a]]; });
        var k1 = Math.round(t.r1 / BIN), k2 = Math.round(t.r2 / BIN);
        for (var d1 = -2; d1 <= 2; d1++) for (var d2 = -2; d2 <= 2; d2++) {
          var arr = index.map.get((k1 + d1) * 1000 + (k2 + d2)); if (!arr) continue;
          for (var n = 0; n < arr.length; n += 4) {
            if (arr[n + 3] !== t.sign) continue;
            var Sv = [iv[arr[n]], iv[arr[n + 1]], iv[arr[n + 2]]];
            var cs0 = ang(Sv[1].v, Sv[2].v), sc = cs0 / t.sides[0];
            if (sc < 0.82 || sc > 1.22) continue; // a neighbouring guess covers it
            var cs1 = ang(Sv[0].v, Sv[2].v), cs2 = ang(Sv[0].v, Sv[1].v);
            if (Math.abs(cs1 / cs0 - t.r1) > 0.02 || Math.abs(cs2 / cs0 - t.r2) > 0.02) continue;
            tried++;
            var fm = fg / sc;
            if (fm < fMin * 0.85 || fm > fMax * 1.15) continue;
            var m0 = model(fm, 0), usedIdx = [tri[t.idx[0]], tri[t.idx[1]], tri[t.idx[2]]];
            var R = attitude(usedIdx.map(function (q) { return pixToCam(m0, top[q].x, top[q].y); }), Sv.map(function (s) { return s.v; }));
            if (quick(R, m0, usedIdx) < 3) continue;
            var mt = score(R, m0, tol, 0.05);
            if (mt.length < 5) continue;
            var r = refine(R, m0, mt);
            if (good(r) && (!best || r.sigT > best.sigT)) best = r;
            if (best) {
              var topHit = best.matches.filter(function (mm) { return mm.di < K; }).length;
              if (best.matches.length >= 8 && (best.sigT >= 12 || topHit >= K * 0.5)) break outer;
            }
          }
        }
      }
    }
    if (!best) return { ok: false, reason: 'nomatch', found: dets.length, tried: tried, ms: Date.now() - t0 };
    var center = radec(mul(best.R, [0, 0, 1]));
    return { ok: true, f: best.m.f, k: best.m.k, R: best.R, cx: cx, cy: cy, hw: hw, w: w, h: h,
      fovX: 2 * Math.atan(w / 2 / best.m.f) * deg, fovY: 2 * Math.atan(h / 2 / best.m.f) * deg,
      matches: best.matches, rmsPx: best.rmsPx, sig: best.sigT, center: center, tried: tried, ms: Date.now() - t0 };
  }

  /** Project a sky direction (J2000 RA/Dec or unit vector) into the solved image. */
  function project(sol, raOrVec, dec) {
    var v = Array.isArray(raOrVec) ? raOrVec : vec(raOrVec, dec);
    return camToPix(sol, mulT(sol.R, v));
  }
  /** Sky direction (J2000) of an image pixel. */
  function unproject(sol, x, y) { return mul(sol.R, pixToCam(sol, x, y)); }
  /** Camera-frame unit vector of an image pixel (lens model applied). */
  function pixVec(sol, x, y) { return pixToCam(sol, x, y); }

  return { detect: detect, buildIndex: buildIndex, solve: solve, project: project, unproject: unproject, pixVec: pixVec, vec: vec, radec: radec, attitude: attitude, camVec: camVec, ang: ang, dot: dot, cross: cross, norm: norm, mul: mul, mulT: mulT };
});
