/*
 * MEIKO — everyday calculator UI (engine: js/core/calc.js)
 */
(function () {
  'use strict';
  var C = window.MeikoCore, ui = MEIKO.ui;
  MEIKO.features.register({
    id: 'calculator', cat: 'calculator', icon: 'i-calc', title: 'Calculator',
    desc: 'Add, subtract, multiply, divide and percentages', keywords: 'kalkulator arithmetic percent math',
    render: function (view) {
      view.innerHTML = ui.pageHead(this) +
        '<div class="calc"><div class="calc-display"><div class="expr" data-expr></div><div class="out" data-out>0</div></div>' +
        '<div class="calc-keys" data-keys>' +
        [['C', 'fn', 'Clear'], ['(', 'fn'], [')', 'fn'], ['⌫', 'fn', 'Backspace'],
         ['7'], ['8'], ['9'], ['÷', 'op', 'Divide'],
         ['4'], ['5'], ['6'], ['×', 'op', 'Multiply'],
         ['1'], ['2'], ['3'], ['−', 'op', 'Subtract'],
         ['0'], ['.', '', 'Decimal point'], ['%', 'op', 'Percent'], ['+', 'op', 'Add'],
         ['=', 'eq', 'Equals']].map(function (k) {
          return '<button type="button" class="' + (k[1] || '') + '" data-k="' + k[0] + '"' + (k[2] ? ' aria-label="' + k[2] + '"' : '') + '>' + k[0] + '</button>';
        }).join('') + '</div>' +
        '<div class="actions"><button class="btn btn-ghost btn-sm" data-copy>' + ui.icon('i-copy') + 'Copy result</button></div>' +
        '<div class="card card-pad calc-history"><div class="card-title">History<span class="spacer"></span><button class="btn btn-ghost btn-sm" data-clear-h>Clear</button></div><div data-hist></div></div>' +
        ui.help('Percentage rules', '<p><span class="mono">200 × 10%</span> = 20 · <span class="mono">200 + 10%</span> = 220 · <span class="mono">200 − 25%</span> = 150 · <span class="mono">50%</span> = 0.5</p><p>Results are rounded to 12 significant digits so that, for example, 0.1 + 0.2 shows 0.3. You can also type with a keyboard.</p>') + '</div>';
      var exprEl = ui.$('[data-expr]', view), outEl = ui.$('[data-out]', view), histEl = ui.$('[data-hist]', view);
      var expr = '', lastResult = null, justEvaluated = false;
      var hist = MEIKO.storage.get('calc:history', []);
      function fmt(v) { return Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-9 && v !== 0) ? v.toExponential(8).replace(/\.?0+e/, 'e') : v.toLocaleString('en-US', { maximumFractionDigits: 10 }); }
      function preview() {
        exprEl.textContent = expr;
        outEl.classList.remove('err');
        if (!expr) { outEl.textContent = lastResult != null && justEvaluated ? fmt(lastResult) : '0'; return; }
        try { var v = C.calc.evaluate(expr); outEl.textContent = fmt(v); } catch (e) { if (/zero/.test(e.message)) { outEl.textContent = 'Cannot divide by zero'; outEl.classList.add('err'); } else outEl.textContent = outEl.textContent; }
      }
      function renderHist() {
        histEl.innerHTML = hist.length ? '<ul>' + hist.map(function (h, i) { return '<li data-h="' + i + '"><span>' + ui.esc(h.e) + ' =</span><b>' + ui.esc(fmt(h.r)) + '</b></li>'; }).join('') + '</ul>' : '<p class="small muted">Calculations you complete appear here.</p>';
      }
      var OPS = '+−×÷';
      function press(k) {
        if (k === 'C') { expr = ''; lastResult = null; justEvaluated = false; return preview(); }
        if (k === '⌫') { expr = expr.slice(0, -1); justEvaluated = false; return preview(); }
        if (k === '=') {
          if (!expr) return;
          try {
            var v = C.calc.evaluate(expr);
            hist.unshift({ e: expr, r: v }); hist = hist.slice(0, 20); MEIKO.storage.set('calc:history', hist); renderHist();
            lastResult = v; expr = String(v); justEvaluated = true;
            exprEl.textContent = hist[0].e + ' ='; outEl.textContent = fmt(v); outEl.classList.remove('err');
          } catch (e) { outEl.textContent = e.message; outEl.classList.add('err'); }
          return;
        }
        if (justEvaluated && /[0-9.(]/.test(k)) expr = '';
        justEvaluated = false;
        var last = expr.slice(-1);
        if (OPS.indexOf(k) !== -1) {
          if (!expr && k !== '−') return;
          if (OPS.indexOf(last) !== -1) { if (!(k === '−' && (last === '×' || last === '÷'))) expr = expr.slice(0, -1); }
        }
        if (k === '.') { var seg = expr.split(/[+−×÷()%]/).pop(); if (seg.indexOf('.') !== -1) return; if (!seg) k = '0.'; }
        if (k === '%' && (!expr || OPS.indexOf(last) !== -1 || last === '%')) return;
        expr += k; preview();
      }
      ui.$('[data-keys]', view).addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
      histEl.addEventListener('click', function (e) { var li = e.target.closest('[data-h]'); if (li) { expr = String(hist[+li.dataset.h].r); justEvaluated = false; preview(); } });
      ui.$('[data-clear-h]', view).addEventListener('click', function () { hist = []; MEIKO.storage.set('calc:history', hist); renderHist(); });
      ui.$('[data-copy]', view).addEventListener('click', function () { var t = outEl.textContent.replace(/,/g, ''); if (!outEl.classList.contains('err')) ui.copy(t, 'Result copied'); });
      function onKey(e) {
        if (e.target.matches('input, textarea, select')) return;
        var map = { '*': '×', '/': '÷', '-': '−', 'Enter': '=', '=': '=', 'Backspace': '⌫', 'Escape': 'C', 'Delete': 'C', ',': '.' };
        var k = map[e.key] || e.key;
        if (/^[0-9.+−×÷%()=C⌫]$/.test(k) || k === '⌫') { e.preventDefault(); press(k); }
      }
      document.addEventListener('keydown', onKey);
      renderHist(); preview();
      return function () { document.removeEventListener('keydown', onKey); };
    }
  });
})();
