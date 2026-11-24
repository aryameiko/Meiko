/*
 * MEIKO — account / registration layer (pluggable).
 * Today: provider 'local' — the email is checked for format and stored on this device only (no server,
 * no verification email). Later a provider such as Firebase Auth can replace `register` / `verify`
 * without touching the onboarding screens: they only call MEIKO.auth.register(email) and read profile().
 * Storage: 'profile' = { email, nickname, provider, verified, uid, createdAt, updatedAt }.
 * The email is never sent over Fleet & Chat.
 */
(function () {
  'use strict';
  var KEY = 'profile';
  var EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  function profile() { var p = MEIKO.storage.get(KEY, null); return p && p.email ? p : null; }
  function save(p) { var cur = profile() || {}; var n = Object.assign({}, cur, p, { updatedAt: Date.now() }); MEIKO.storage.set(KEY, n); return n; }
  function uid() { var a = new Uint8Array(8); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }

  var providers = {
    local: {
      id: 'local', label: 'This device only', verifies: false,
      register: function (email) { return Promise.resolve({ email: email, verified: false, uid: (profile() && profile().uid) || uid() }); }
    }
  };
  var active = 'local';

  MEIKO.auth = {
    EMAIL_RE: EMAIL_RE,
    validEmail: function (e) { return EMAIL_RE.test(String(e || '').trim()) && String(e).length <= 254; },
    /** Register (or re-register) with an email. Resolves with the saved profile. */
    register: function (email) {
      email = String(email || '').trim().toLowerCase();
      if (!MEIKO.auth.validEmail(email)) return Promise.reject(new Error('Enter a valid email address, e.g. name@example.com'));
      var pv = providers[active];
      return pv.register(email).then(function (r) { return save({ email: r.email, verified: !!r.verified, uid: r.uid, provider: pv.id, createdAt: (profile() && profile().createdAt) || Date.now() }); });
    },
    setNickname: function (n) { return save({ nickname: String(n || '').trim().slice(0, 24) }); },
    profile: profile,
    nickname: function () { var p = profile(); return p && p.nickname ? p.nickname : ''; },
    isComplete: function () { var p = profile(); return !!(p && p.email && p.nickname && MEIKO.vessel && MEIKO.vessel.get()); },
    signOut: function () { MEIKO.storage.remove(KEY); },
    /** Plug in another provider (e.g. Firebase) later: { id, label, verifies, register(email) → Promise<{email, verified, uid}> }. */
    use: function (p) { providers[p.id] = p; active = p.id; },
    provider: function () { return providers[active]; }
  };
})();
