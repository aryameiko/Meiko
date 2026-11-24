/*
 * MEIKO — unit converter UI (factors: js/core/units.js)
 */
(function () {
  'use strict';
  var C = window.MeikoCore, ui = MEIKO.ui;
  MEIKO.features.register({
    id: 'converter', cat: 'converter', icon: 'i-convert', title: 'Unit Converter',
    desc: 'Maritime, speed, length, time, angle and temperature', keywords: 'convert nautical mile cable fathom knot feet celsius radian konversi',
    lead: 'Type a value and see it in every unit of the category at once.',
    render: function (view) {
      var cats = C.units.CATEGORIES, catKeys = Object.keys(cats);
      var state = MEIKO.storage.get('conv', { cat: 'maritime', from: 'nm', value: '1' });
      if (!cats[state.cat]) state = { cat: 'maritime', from: 'nm', value: '1' };
      view.innerHTML = ui.pageHead(this) +
        '<div class="seg" data-cats style="margin-bottom:14px">' + catKeys.map(function (k) { return '<button type="button" data-cat="' + k + '">' + cats[k].label.replace(' distance', '') + '</button>'; }).join('') + '</div>' +
        '<div class="tool-grid"><div class="card card-pad form-gap"><div class="row unit"><label class="field"><span>Value</span><input name="v" inputmode="decimal" autocomplete="off"><small class="hint"></small></label>' +
        '<label class="field"><span>From</span><select name="from"></select></label></div>' +
        '<div class="actions" style="margin-top:0"><button class="btn btn-ghost btn-sm" type="button" data-reset>' + ui.icon('i-reset') + 'Reset</button></div></div>' +
        '<div class="results-col" data-out></div></div>' +
        ui.help('Conversion factors', '<p>1 NM = 1 852 m (exact, international) · 1 cable = 0.1 NM = 185.2 m · 1 fathom = 6 ft = 1.8288 m · 1 ft = 0.3048 m · 1 in = 25.4 mm · 1 kn = 1 NM/h = 0.514444 m/s · 1 mph = 0.44704 m/s · 1 rad = 180/π °.</p><p>Note: the historic British Admiralty cable was 608 ft (185.3184 m); MEIKO uses the international 0.1 NM cable.</p>');
      var input = ui.$('[name=v]', view), from = ui.$('[name=from]', view), out = ui.$('[data-out]', view), hint = ui.$('.hint', view);
      function setCat(cat, keepFrom) {
        state.cat = cat;
        ui.$$('[data-cat]', view).forEach(function (b) { b.classList.toggle('on', b.dataset.cat === cat); });
        var units = cats[cat].units;
        if (!keepFrom || !units[state.from]) state.from = cats[cat].defaults[0];
        from.innerHTML = Object.keys(units).map(function (k) { return '<option value="' + k + '"' + (k === state.from ? ' selected' : '') + '>' + units[k].label + ' (' + units[k].symbol + ')</option>'; }).join('');
        calc();
      }
      function calc() {
        state.value = input.value; state.from = from.value; MEIKO.storage.set('conv', state);
        var r = ui.readNum(input); hint.className = 'hint'; hint.textContent = '';
        if (!r.ok) {
          if (input.value.trim()) { hint.textContent = 'Enter a valid number'; hint.classList.add('err'); }
          out.innerHTML = '<div class="result">' + ui.empty('i-convert', 'Enter a value', 'Conversions to every unit appear here.') + '</div>'; return;
        }
        var units = cats[state.cat].units, rows = '', txt = [];
        try {
          Object.keys(units).forEach(function (k) {
            var v = C.units.convert(r.value, state.cat, state.from, k);
            var s = C.units.smartRound(v, 10);
            var shown = Math.abs(s) >= 1e12 || (Math.abs(s) < 1e-6 && s !== 0) ? s.toExponential(6) : s.toLocaleString('en-US', { maximumFractionDigits: 8 });
            rows += '<div class="conv-row' + (k === state.from ? ' src' : '') + '"><div class="u">' + units[k].label + '</div><div class="v">' + shown + ' <small class="muted">' + units[k].symbol + '</small></div>' +
              '<button class="icon-btn" data-c="' + String(s) + '" aria-label="Copy ' + units[k].label + '">' + ui.icon('i-copy') + '</button></div>';
            txt.push(shown + ' ' + units[k].symbol);
          });
        } catch (e) { ui.showError(out, e.message); return; }
        ui.showResult(out, ui.resultCard(cats[state.cat].label, '<div style="padding:4px 18px 8px">' + rows + '</div>', { copy: true, icon: 'i-convert' }), 'MEIKO · ' + input.value + ' ' + units[state.from].symbol + ' =\n' + txt.join('\n'));
        ui.$$('[data-c]', out).forEach(function (b) { b.addEventListener('click', function () { ui.copy(b.dataset.c); }); });
      }
      ui.$('[data-cats]', view).addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) setCat(b.dataset.cat); });
      input.addEventListener('input', calc); from.addEventListener('change', calc);
      ui.$('[data-reset]', view).addEventListener('click', function () { input.value = '1'; setCat(state.cat); });
      input.value = state.value;
      setCat(state.cat, true);
    }
  });
})();
