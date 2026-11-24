/*
 * MEIKO — first-run onboarding: Welcome → Email → Nickname → Vessel avatar → Done.
 * REQUIRED = false: the screens exist but do not block the app yet (waiting for the choice of login:
 * device-only email or Firebase Auth). Preview any time with  …/Meiko/?welcome  or  #/welcome.
 * When REQUIRED is true, the app stays behind this screen until a profile and vessel exist.
 */
(function () {
  'use strict';
  var REQUIRED = false;
  var ui = MEIKO.ui, esc = ui.esc, icon = ui.icon;
  var el = null, step = 0, draft = {};
  var STEPS = ['welcome', 'email', 'nick', 'avatar', 'done'];

  function wants() {
    var preview = /[?&]welcome\b/.test(location.search) || location.hash === '#/welcome';
    return preview || (REQUIRED && !MEIKO.auth.isComplete());
  }
  function open() {
    if (el) return;
    var p = MEIKO.auth.profile() || {}, v = MEIKO.vessel.get();
    var t0 = v ? v.type : 'fishing', def = MEIKO.vessel.types.filter(function (x) { return x.id === t0; })[0].def;
    draft = { email: p.email || '', nick: p.nickname || '', vname: v ? v.name : '', type: t0, h: v ? v.h : def.h, s: v ? v.s : def.s, a: v ? v.a : def.a };
    step = 0;
    el = document.createElement('div'); el.className = 'onb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Welcome to MEIKO');
    document.body.appendChild(el); document.body.classList.add('onb-open');
    paint();
  }
  function close() {
    if (!el) return;
    el.remove(); el = null; document.body.classList.remove('onb-open');
    if (location.hash === '#/welcome') location.hash = '#/';
    if (/[?&]welcome\b/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    MEIKO.app.rerender();
  }
  function dots() { return '<div class="onb-dots">' + STEPS.slice(1, 4).map(function (_, i) { return '<span class="' + (i + 1 <= step ? 'on' : '') + '"></span>'; }).join('') + '</div>'; }
  function head(title, sub) {
    return '<div class="onb-top">' + (step > 0 && step < 4 ? '<button type="button" class="onb-back" data-back aria-label="Back">' + icon('i-back') + '</button>' : '<span></span>') + (step > 0 && step < 4 ? dots() : '') + '<span></span></div>' +
      '<h1>' + title + '</h1>' + (sub ? '<p class="onb-sub">' + sub + '</p>' : '');
  }
  function art() { return '<div class="onb-art">' + MEIKO.vessel.side(draft.type, draft) + '</div>'; }

  function paint() {
    var s = STEPS[step], h = '';
    if (s === 'welcome') {
      h = '<div class="onb-hero"><svg class="onb-logo" aria-hidden="true"><use href="#logo"/></svg><div class="onb-brand">MEIKO</div><div class="onb-tag">Navigate · Calculate · Explore</div></div>' +
        '<h1>Welcome aboard</h1><p class="onb-sub">Set up your profile in three short steps: your email, a nickname, and your vessel. Other vessels in Fleet &amp; Chat will see your nickname and vessel, never your email.</p>' +
        '<button class="btn btn-primary onb-next" data-next>Get started</button>';
    } else if (s === 'email') {
      var pv = MEIKO.auth.provider();
      h = head('Your email', 'Used to register you in MEIKO.') +
        '<label class="field"><span>Email</span><input type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" data-email placeholder="name@example.com" value="' + esc(draft.email) + '"><small class="hint" data-err></small></label>' +
        (pv.verifies ? '' : '<p class="small muted">' + icon('i-info') + ' For now your email is kept on this device only; no verification email is sent.</p>') +
        '<button class="btn btn-primary onb-next" data-next>Continue</button>';
    } else if (s === 'nick') {
      h = head('Your nickname', 'This is how other vessels see you on the map and in chat.') +
        '<label class="field"><span>Nickname</span><input data-nick maxlength="24" autocomplete="nickname" placeholder="e.g. Kapten Arya" value="' + esc(draft.nick) + '"><small class="hint" data-err></small></label>' +
        '<button class="btn btn-primary onb-next" data-next>Continue</button>';
    } else if (s === 'avatar') {
      h = head('Your vessel', 'Pick a vessel and colour. This is your avatar on the map.') + art() +
        '<div class="onb-types">' + MEIKO.vessel.types.map(function (t) { return '<button type="button" class="onb-type' + (t.id === draft.type ? ' on' : '') + '" data-type="' + t.id + '" aria-pressed="' + (t.id === draft.type) + '">' + MEIKO.vessel.side(t.id, t.id === draft.type ? draft : t.def, { noWater: true }) + '<small>' + esc(t.label) + '</small></button>'; }).join('') + '</div>' +
        '<div class="field"><span>Hull colour</span><div class="swatches">' + MEIKO.vessel.palette.map(function (c) { return '<button type="button" class="sw' + (c.toLowerCase() === String(draft.h).toLowerCase() ? ' on' : '') + '" style="background:' + c + '" data-hull="' + c + '" aria-label="Hull ' + c + '"></button>'; }).join('') + '</div></div>' +
        '<label class="field"><span>Vessel name (optional)</span><input data-vname maxlength="40" placeholder="e.g. KM Bahari" value="' + esc(draft.vname) + '"></label>' +
        '<button class="btn btn-primary onb-next" data-next>Finish</button>';
    } else {
      h = '<div class="onb-done">' + art() + '<h1>All set, ' + esc(draft.nick) + '!</h1><p class="onb-sub">' + esc(draft.vname || draft.nick) + ' is ready. You can change your vessel any time under Settings → My Vessel.</p>' +
        '<div class="kv onb-kv"><div class="k">Email</div><div class="v">' + esc(draft.email) + '</div><div class="k">Nickname</div><div class="v">' + esc(draft.nick) + '</div></div></div>' +
        '<button class="btn btn-primary onb-next" data-next>Open MEIKO</button>';
    }
    el.innerHTML = '<div class="onb-card onb-step-' + s + '">' + h + '</div>';
    bind();
    var f = el.querySelector('input'); if (f && matchMedia('(pointer:fine)').matches) f.focus();
  }
  function err(msg) { var e = el.querySelector('[data-err]'); if (e) { e.textContent = msg; e.classList.add('err'); } var i = el.querySelector('input'); if (i) { i.classList.add('invalid'); i.focus(); } }
  function next() {
    var s = STEPS[step];
    if (s === 'email') {
      var em = el.querySelector('[data-email]').value.trim();
      if (!MEIKO.auth.validEmail(em)) return err('Enter a valid email address, e.g. name@example.com');
      var btn = el.querySelector('[data-next]'); btn.disabled = true;
      return MEIKO.auth.register(em).then(function (p) { draft.email = p.email; step++; paint(); }, function (e) { btn.disabled = false; err(e.message); });
    }
    if (s === 'nick') {
      var n = el.querySelector('[data-nick]').value.trim().replace(/\s+/g, ' ');
      if (n.length < 2) return err('At least 2 characters.');
      draft.nick = n; MEIKO.auth.setNickname(n);
    }
    if (s === 'avatar') {
      draft.vname = el.querySelector('[data-vname]').value.trim();
      var old = MEIKO.storage.get('vessel', null) || {};
      MEIKO.vessel.set(Object.assign({}, old, { type: draft.type, h: draft.h, s: draft.s, a: draft.a, name: draft.vname || old.name || draft.nick, showOnMap: old.showOnMap !== false }));
    }
    if (s === 'done') return close();
    step++; paint();
  }
  function bind() {
    var b = el.querySelector('[data-next]'); if (b) b.addEventListener('click', next);
    el.querySelectorAll('input').forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); next(); } }); i.addEventListener('input', function () { i.classList.remove('invalid'); var e = el.querySelector('[data-err]'); if (e) e.textContent = ''; }); });
    var bk = el.querySelector('[data-back]'); if (bk) bk.addEventListener('click', function () { keep(); step--; paint(); });
    el.querySelectorAll('[data-type]').forEach(function (x) { x.addEventListener('click', function () { keep(); var t = MEIKO.vessel.types.filter(function (y) { return y.id === x.dataset.type; })[0]; draft.type = t.id; draft.h = t.def.h; draft.s = t.def.s; draft.a = t.def.a; paint(); }); });
    el.querySelectorAll('[data-hull]').forEach(function (x) { x.addEventListener('click', function () { keep(); draft.h = x.dataset.hull; paint(); }); });
  }
  function keep() { // remember typed values when moving between steps
    var e = el.querySelector('[data-email]'); if (e) draft.email = e.value.trim();
    var n = el.querySelector('[data-nick]'); if (n) draft.nick = n.value.trim();
    var v = el.querySelector('[data-vname]'); if (v) draft.vname = v.value.trim();
  }
  MEIKO.onboarding = { open: open, close: close, required: function () { return REQUIRED; } };
  window.addEventListener('hashchange', function () { if (location.hash === '#/welcome') open(); });
  if (wants()) open();
})();
