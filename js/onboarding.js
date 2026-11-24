/*
 * MEIKO — first-run onboarding: Welcome → Account → (Verify email) → Nickname → Vessel avatar → Done.
 * With Firebase configured (js/firebase-config.js) the account step uses email + password, a verification
 * email must be confirmed, and onboarding is REQUIRED before the app can be used. Without a config it is a
 * device-only preview (?welcome or #/welcome).
 * Offline: once an account is verified and the profile is complete, the gate only reads the profile saved on
 * this device, so MEIKO opens without internet.
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, esc = ui.esc, icon = ui.icon;
  var FB = MEIKO.auth.usesFirebase();
  var REQUIRED = FB;
  var el = null, step = 0, draft = {}, mode = 'new', resendAt = 0;
  var STEPS = FB ? ['welcome', 'account', 'verify', 'nick', 'avatar', 'done'] : ['welcome', 'account', 'nick', 'avatar', 'done'];
  var FIRST = 1, LAST = STEPS.length - 2; // steps with dots / back button

  function wants() {
    var preview = /[?&]welcome\b/.test(location.search) || location.hash === '#/welcome';
    return preview || (REQUIRED && !MEIKO.auth.isComplete());
  }
  function resumeStep() {
    var p = MEIKO.auth.profile();
    if (!p || !p.email) return 0;
    if (FB && !p.verified) return STEPS.indexOf('verify');
    if (!p.nickname) return STEPS.indexOf('nick');
    if (!MEIKO.vessel.get()) return STEPS.indexOf('avatar');
    return 0;
  }
  function open() {
    if (el) return;
    var p = MEIKO.auth.profile() || {}, v = MEIKO.vessel.get();
    var t0 = v ? v.type : 'fishing', def = MEIKO.vessel.types.filter(function (x) { return x.id === t0; })[0].def;
    draft = { email: p.email || '', nick: p.nickname || '', vname: v ? v.name : '', type: t0, h: v ? v.h : def.h, s: v ? v.s : def.s, a: v ? v.a : def.a };
    step = resumeStep();
    el = document.createElement('div'); el.className = 'onb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Welcome to MEIKO');
    document.body.appendChild(el); document.body.classList.add('onb-open');
    paint();
  }
  function close() {
    if (!el) return;
    if (REQUIRED && !MEIKO.auth.isComplete()) return;
    el.remove(); el = null; document.body.classList.remove('onb-open');
    if (location.hash === '#/welcome') location.hash = '#/';
    if (/[?&]welcome\b/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    MEIKO.app.rerender();
  }
  function dots() { var n = LAST - FIRST + 1, out = ''; for (var i = 0; i < n; i++) out += '<span class="' + (FIRST + i <= step ? 'on' : '') + '"></span>'; return '<div class="onb-dots">' + out + '</div>'; }
  function head(title, sub) {
    var mid = step >= FIRST && step <= LAST;
    return '<div class="onb-top">' + (mid ? '<button type="button" class="onb-back" data-back aria-label="Back">' + icon('i-back') + '</button>' : '<span></span>') + (mid ? dots() : '') + '<span></span></div>' +
      '<h1>' + title + '</h1>' + (sub ? '<p class="onb-sub">' + sub + '</p>' : '');
  }
  function art() { return '<div class="onb-art">' + MEIKO.vessel.side(draft.type, draft) + '</div>'; }
  function offlineNote() { return navigator.onLine === false ? '<p class="small onb-warn">' + icon('i-wifi-off') + ' You are offline. Creating an account or signing in needs internet once; after that MEIKO works offline.</p>' : ''; }

  function paint() {
    var s = STEPS[step], h = '';
    if (s === 'welcome') {
      h = '<div class="onb-hero"><img class="onb-full" src="assets/icons/logo-full.jpg" alt="MEIKO"><div class="onb-tag">Navigate · Calculate · Explore</div></div>' +
        '<h1>Welcome aboard</h1><p class="onb-sub">Register with your email, then choose a nickname and your vessel. Other vessels in Fleet &amp; Chat see your nickname and vessel, never your email.</p>' +
        '<button class="btn btn-primary onb-next" data-next>Get started</button>' +
        (FB ? '<button class="btn btn-ghost onb-alt" data-signin>I already have an account</button>' : '');
    } else if (s === 'account') {
      if (FB) {
        var isNew = mode === 'new';
        h = head(isNew ? 'Create your account' : 'Sign in', isNew ? 'We will send a link to your email to confirm it is yours.' : 'Use the email and password you registered with.') +
          '<div class="onb-seg" role="tablist"><button type="button" role="tab" class="' + (isNew ? 'on' : '') + '" data-mode="new">Create account</button><button type="button" role="tab" class="' + (isNew ? '' : 'on') + '" data-mode="old">I have an account</button></div>' +
          '<label class="field"><span>Email</span><input type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" data-email placeholder="name@example.com" value="' + esc(draft.email) + '"></label>' +
          '<label class="field"><span>Password</span><input type="password" data-pw autocomplete="' + (isNew ? 'new-password' : 'current-password') + '" minlength="8" placeholder="' + (isNew ? 'At least 8 characters' : 'Your password') + '"></label>' +
          (isNew ? '<label class="field"><span>Repeat password</span><input type="password" data-pw2 autocomplete="new-password" placeholder="Type it again"></label>' : '') +
          '<small class="hint" data-err></small>' + offlineNote() +
          '<button class="btn btn-primary onb-next" data-next>' + (isNew ? 'Create account' : 'Sign in') + '</button>' +
          (isNew ? '' : '<button type="button" class="btn btn-ghost onb-alt" data-forgot>Forgot password?</button>');
      } else {
        h = head('Your email', 'Used to register you in MEIKO.') +
          '<label class="field"><span>Email</span><input type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" data-email placeholder="name@example.com" value="' + esc(draft.email) + '"><small class="hint" data-err></small></label>' +
          '<p class="small muted">' + icon('i-info') + ' Preview: the email is kept on this device only; no verification email is sent.</p>' +
          '<button class="btn btn-primary onb-next" data-next>Continue</button>';
      }
    } else if (s === 'verify') {
      h = head('Check your email', 'We sent a confirmation link to <b>' + esc(draft.email) + '</b>. Open the email (check Spam too), tap the link, then come back here.') +
        '<div class="onb-mail">' + icon('i-check') + '</div>' +
        '<small class="hint" data-err></small>' + offlineNote() +
        '<button class="btn btn-primary onb-next" data-next>I have confirmed my email</button>' +
        '<button type="button" class="btn btn-ghost onb-alt" data-resend>Send the link again</button>' +
        '<button type="button" class="btn btn-ghost onb-alt" data-other>Use a different email</button>';
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
      h = '<div class="onb-done">' + art() + '<h1>All set, ' + esc(draft.nick) + '!</h1><p class="onb-sub">' + esc(draft.vname || draft.nick) + ' is ready. You can change your vessel any time under Settings → My Vessel, and your account under Settings → Account.</p>' +
        '<div class="kv onb-kv"><div class="k">Email</div><div class="v">' + esc(draft.email) + (FB ? ' <small>✓ confirmed</small>' : '') + '</div><div class="k">Nickname</div><div class="v">' + esc(draft.nick) + '</div></div></div>' +
        '<button class="btn btn-primary onb-next" data-next>Open MEIKO</button>';
    }
    el.innerHTML = '<div class="onb-card onb-step-' + s + '">' + h + '</div>';
    bind();
    var f = el.querySelector('input'); if (f && matchMedia('(pointer:fine)').matches) f.focus();
  }
  function err(msg, ok) {
    var e = el.querySelector('[data-err]'); if (e) { e.textContent = msg; e.classList.toggle('err', !ok); e.classList.toggle('ok', !!ok); }
    if (!ok) { var i = el.querySelector('input'); if (i) { i.classList.add('invalid'); i.focus(); } }
  }
  function busy(on) { el.querySelectorAll('button').forEach(function (b) { b.disabled = on; }); }
  function next() {
    var s = STEPS[step];
    if (s === 'account') {
      var em = el.querySelector('[data-email]').value.trim();
      if (!MEIKO.auth.validEmail(em)) return err('Enter a valid email address, e.g. name@example.com');
      draft.email = em.toLowerCase();
      if (!FB) { busy(true); return MEIKO.auth.register(em).then(function (p) { draft.email = p.email; step++; paint(); }, function (e) { busy(false); err(e.message); }); }
      var pw = el.querySelector('[data-pw]').value;
      if (mode === 'new') {
        if (pw.length < 8) return err('Password: at least 8 characters.');
        if (pw !== el.querySelector('[data-pw2]').value) return err('The two passwords are not the same.');
        busy(true);
        return MEIKO.auth.signUp(em, pw).then(function () { step = STEPS.indexOf('verify'); resendAt = Date.now() + 60000; paint(); }, function (e) { busy(false); err(e.message); });
      }
      if (!pw) return err('Enter your password.');
      busy(true);
      return MEIKO.auth.signIn(em, pw).then(function (p) {
        if (p.nickname) draft.nick = p.nickname;
        step = p.verified ? STEPS.indexOf('nick') : STEPS.indexOf('verify'); paint();
      }, function (e) { busy(false); err(e.message); });
    }
    if (s === 'verify') {
      busy(true);
      return MEIKO.auth.refreshVerification().then(function (p) {
        if (p.verified) { step++; paint(); } else { busy(false); err('Not confirmed yet. Open the link in the email first, then tap this button again.'); }
      }, function (e) { busy(false); if (e.signIn) { mode = 'old'; step = STEPS.indexOf('account'); paint(); err(e.message, true); } else err(e.message); });
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
  function back() {
    keep();
    var s = STEPS[step];
    if (s === 'verify' || (s === 'nick' && FB)) { step = STEPS.indexOf('account'); paint(); return; }
    step--; paint();
  }
  function bind() {
    var b = el.querySelector('[data-next]'); if (b) b.addEventListener('click', next);
    el.querySelectorAll('input').forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); next(); } }); i.addEventListener('input', function () { i.classList.remove('invalid'); var e = el.querySelector('[data-err]'); if (e) e.textContent = ''; }); });
    var bk = el.querySelector('[data-back]'); if (bk) bk.addEventListener('click', back);
    var si = el.querySelector('[data-signin]'); if (si) si.addEventListener('click', function () { mode = 'old'; step = STEPS.indexOf('account'); paint(); });
    el.querySelectorAll('[data-mode]').forEach(function (x) { x.addEventListener('click', function () { keep(); mode = x.dataset.mode; paint(); }); });
    var fg = el.querySelector('[data-forgot]'); if (fg) fg.addEventListener('click', function () {
      var em = el.querySelector('[data-email]').value.trim();
      if (!MEIKO.auth.validEmail(em)) return err('Type your email above first, then tap "Forgot password?".');
      busy(true); MEIKO.auth.resetPassword(em).then(function () { busy(false); err('A password reset link was sent to ' + em + '.', true); }, function (e) { busy(false); err(e.message); });
    });
    var rs = el.querySelector('[data-resend]'); if (rs) rs.addEventListener('click', function () {
      if (Date.now() < resendAt) return err('Please wait ' + Math.ceil((resendAt - Date.now()) / 1000) + ' s before sending again.');
      busy(true); MEIKO.auth.resendVerification().then(function () { busy(false); resendAt = Date.now() + 60000; err('Link sent again to ' + draft.email + '.', true); }, function (e) { busy(false); if (e.signIn) { mode = 'old'; step = STEPS.indexOf('account'); paint(); err(e.message, true); } else err(e.message); });
    });
    var ot = el.querySelector('[data-other]'); if (ot) ot.addEventListener('click', function () { MEIKO.auth.signOut(); draft.email = ''; mode = 'new'; step = STEPS.indexOf('account'); paint(); });
    el.querySelectorAll('[data-type]').forEach(function (x) { x.addEventListener('click', function () { keep(); var t = MEIKO.vessel.types.filter(function (y) { return y.id === x.dataset.type; })[0]; draft.type = t.id; draft.h = t.def.h; draft.s = t.def.s; draft.a = t.def.a; paint(); }); });
    el.querySelectorAll('[data-hull]').forEach(function (x) { x.addEventListener('click', function () { keep(); draft.h = x.dataset.hull; paint(); }); });
  }
  function keep() { // remember typed values when moving between steps
    var e = el.querySelector('[data-email]'); if (e) draft.email = e.value.trim();
    var n = el.querySelector('[data-nick]'); if (n) draft.nick = n.value.trim();
    var v = el.querySelector('[data-vname]'); if (v) draft.vname = v.value.trim();
  }
  window.addEventListener('online', function () { if (el) { keep(); paint(); } });
  window.addEventListener('offline', function () { if (el) { keep(); paint(); } });
  MEIKO.onboarding = { open: open, close: close, required: function () { return REQUIRED; } };
  window.addEventListener('hashchange', function () { if (location.hash === '#/welcome') open(); });
  if (wants()) open();
})();
