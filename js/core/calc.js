/*
 * MEIKO core — safe arithmetic expression evaluator for the everyday calculator.
 * No eval(). Supports + − × ÷ (also + - * /), parentheses, unary minus, decimals and percent.
 *
 * Percent rules (same as common handheld calculators):
 *   200 × 10%  = 20        (10% → 0.10 in multiplication/division)
 *   200 + 10%  = 220       (a ± b%  →  a ± a·b/100)
 *   10%        = 0.1
 * Results are rounded to 12 significant digits to remove binary floating-point noise (0.1 + 0.2 = 0.3).
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.calc = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function CalcError(msg) { this.name = 'CalcError'; this.message = msg; }
  CalcError.prototype = Object.create(Error.prototype);

  function tokenize(src) {
    var s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.').replace(/\s+/g, '');
    var tokens = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/[0-9.]/.test(c)) {
        var j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        var numStr = s.slice(i, j);
        if ((numStr.match(/\./g) || []).length > 1 || numStr === '.') throw new CalcError('Invalid number');
        tokens.push({ t: 'num', v: parseFloat(numStr) }); i = j; continue;
      }
      if ('+-*/()%'.indexOf(c) !== -1) { tokens.push({ t: c }); i++; continue; }
      throw new CalcError('Invalid character');
    }
    return tokens;
  }

  function evaluate(src) {
    var tokens = tokenize(src), pos = 0;
    if (!tokens.length) throw new CalcError('Empty');
    function peek() { return tokens[pos]; }
    function eat(t) { if (peek() && peek().t === t) { pos++; return true; } return false; }

    function primary() {
      var tk = peek();
      if (!tk) throw new CalcError('Incomplete expression');
      if (tk.t === 'num') { pos++; return tk.v; }
      if (tk.t === '(') {
        pos++; var v = expr();
        if (!eat(')')) throw new CalcError('Missing )');
        return v;
      }
      throw new CalcError('Incomplete expression');
    }
    function factor() { // returns {v, pct}
      var neg = false;
      while (peek() && (peek().t === '-' || peek().t === '+')) { if (peek().t === '-') neg = !neg; pos++; }
      var v = primary(), pct = false;
      while (eat('%')) { v = v / 100; pct = true; }
      return { v: neg ? -v : v, pct: pct, raw: pct ? (neg ? -v : v) : null };
    }
    function term() {
      var f = factor(), v = f.v, single = true, pct = f.pct;
      while (peek() && (peek().t === '*' || peek().t === '/')) {
        var op = tokens[pos++].t; var r = factor().v; single = false;
        if (op === '*') v = v * r;
        else { if (r === 0) throw new CalcError('Cannot divide by zero'); v = v / r; }
      }
      return { v: v, pct: single && pct };
    }
    function expr() {
      var first = term(), acc = first.v;
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        var op = tokens[pos++].t; var r = term();
        var rv = r.pct ? acc * r.v : r.v; // a ± b%  → a ± a·b/100
        acc = op === '+' ? acc + rv : acc - rv;
      }
      return acc;
    }
    var result = expr();
    if (pos < tokens.length) throw new CalcError(tokens[pos].t === ')' ? 'Unmatched )' : 'Unexpected input');
    if (!isFinite(result)) throw new CalcError('Result too large');
    return clean(result);
  }

  function clean(v) { if (v === 0) return 0; return parseFloat(v.toPrecision(12)); }

  return { evaluate: evaluate, tokenize: tokenize, clean: clean, CalcError: CalcError };
});
