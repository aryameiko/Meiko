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

  /* ---- Firebase Auth: email + password (no email confirmation) or a Google account ---- */
  var fbAuth = null;
  function fbErr(e) {
    var c = (e && e.code) || '';
    var map = {
      'auth/email-already-in-use': 'This email is already registered. Choose "I already have an account" and sign in.',
      'auth/invalid-email': 'Enter a valid email address, e.g. name@example.com',
      'auth/weak-password': 'Password too weak: use at least 8 characters.',
      'auth/invalid-credential': 'Wrong email or password.', 'auth/wrong-password': 'Wrong email or password.', 'auth/user-not-found': 'No account with this email. Choose "Create account".',
      'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
      'auth/network-request-failed': 'No internet connection. The first sign-in needs internet; after that MEIKO works offline.',
      'auth/unauthorized-domain': 'This web address is not allowed in Firebase (add it under Authentication → Settings → Authorized domains).',
      'auth/operation-not-allowed': 'Email/Password sign-in is not enabled in Firebase yet.',
      'auth/configuration-not-found': 'Registration is not switched on yet (Firebase Authentication not set up). Please tell the app owner.'
    };
    if (/api-key-not-valid|invalid-api-key/.test(c)) return new Error('MEIKO\'s Firebase settings are not valid. Please tell the app owner.');
    return new Error(map[c] || (e && e.message) || 'Something went wrong.');
  }
  function initFirebase() {
    var F = window.MeikoFirebase, cfg = MEIKO.FIREBASE_CONFIG;
    if (!F || !cfg || !cfg.apiKey) return false;
    try {
      var app = F.initializeApp(cfg);
      fbAuth = F.initializeAuth(app, { persistence: [F.indexedDBLocalPersistence, F.browserLocalPersistence], popupRedirectResolver: F.browserPopupRedirectResolver });
      try { fbAuth.languageCode = 'id'; } catch (e) {}
      F.onAuthStateChanged(fbAuth, function (u) {
        var p = profile();
        if (u && p && p.uid === u.uid && !!u.emailVerified !== !!p.verified) save({ verified: !!u.emailVerified });
      });
    } catch (e) { console.warn('Firebase init failed', e); return false; }
    function asProfile(u) { return { email: u.email, verified: !!u.emailVerified, uid: u.uid, name: u.displayName || '', via: (u.providerData || []).some(function (x) { return x && x.providerId === 'google.com'; }) ? 'google' : 'password' }; }
    function google() { var g = new F.GoogleAuthProvider(); g.setCustomParameters({ prompt: 'select_account' }); return g; }
    /* A Google redirect sign-in (used when a popup is blocked) finishes after the page reloads. */
    var redirected = F.getRedirectResult(fbAuth).then(function (c) { return c && c.user ? asProfile(c.user) : null; }, function (e) { console.warn('Google redirect', e && e.code); return null; });
    providers.firebase = {
      id: 'firebase', label: 'Firebase', verifies: false, passwords: true, google: true,
      signUp: function (email, pw) { return F.createUserWithEmailAndPassword(fbAuth, email, pw).then(function (c) { return asProfile(c.user); }, function (e) { throw fbErr(e); }); },
      signIn: function (email, pw) { return F.signInWithEmailAndPassword(fbAuth, email, pw).then(function (c) { return asProfile(c.user); }, function (e) { throw fbErr(e); }); },
      signInGoogle: function () {
        return F.signInWithPopup(fbAuth, google()).then(function (c) { return asProfile(c.user); }, function (e) {
          var c = (e && e.code) || '';
          if (/popup-blocked|operation-not-supported-in-this-environment/.test(c)) return F.signInWithRedirect(fbAuth, google()).then(function () { return new Promise(function () {}); });
          if (/popup-closed-by-user|cancelled-popup-request|user-cancelled/.test(c)) { var x = new Error('Google sign-in was cancelled.'); x.cancelled = true; throw x; }
          if (/operation-not-allowed/.test(c)) throw new Error('Google sign-in is not switched on yet. Please use email and password for now.');
          if (/account-exists-with-different-credential/.test(c)) throw new Error('This email already has a MEIKO account with a password. Sign in with email and password.');
          throw fbErr(e);
        });
      },
      redirected: function () { return redirected; },
      reset: function (email) { return F.sendPasswordResetEmail(fbAuth, email).catch(function (e) { throw fbErr(e); }); },
      signOut: function () { return F.signOut(fbAuth).catch(function () {}); },
      /** Delete the Firebase account. Firebase wants a recent sign-in, so confirm with the password or Google first. */
      deleteAccount: function (pw) {
        return Promise.resolve(fbAuth.authStateReady ? fbAuth.authStateReady() : null).then(function () {
          var u = fbAuth.currentUser;
          if (!u) throw new Error('Not signed in on this device. Sign in again (internet needed), then delete the account.');
          var google = (u.providerData || []).some(function (x) { return x && x.providerId === 'google.com'; });
          var re = google ? F.reauthenticateWithPopup(u, google_()) : F.reauthenticateWithCredential(u, F.EmailAuthProvider.credential(u.email, pw || ''));
          return re.then(function () { return F.deleteUser(u); });
        }).catch(function (e) {
          var c = (e && e.code) || '';
          if (/popup-closed-by-user|cancelled-popup-request|user-cancelled/.test(c)) { var x = new Error('Cancelled. Your account was not deleted.'); x.cancelled = true; throw x; }
          if (/missing-password/.test(c)) throw new Error('Enter your password.');
          if (/user-mismatch/.test(c)) throw new Error('Choose the same Google account you signed in with.');
          throw e && e.code ? fbErr(e) : e;
        });
      }
    };
    function google_() { return google(); }
    active = 'firebase';
    return true;
  }
  function saveAccount(r) { var pv = providers[active]; return save({ email: r.email, verified: !!r.verified, uid: r.uid, via: r.via || 'password', provider: pv.id, createdAt: (profile() && profile().createdAt) || Date.now() }); }
  function switchTo(r) { var old = profile(); if (old && old.uid !== r.uid) MEIKO.storage.remove(KEY); var p = saveAccount(r); if (!p.nickname && r.name) p = save({ suggestedNick: r.name.slice(0, 24) }); return p; }

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
    /** Firebase only: create an account (no email confirmation) / sign in with email + password or Google. */
    signUp: function (email, pw) { email = String(email || '').trim().toLowerCase(); return providers[active].signUp(email, pw).then(switchTo); },
    signIn: function (email, pw) { email = String(email || '').trim().toLowerCase(); return providers[active].signIn(email, pw).then(switchTo); },
    signInGoogle: function () { return providers[active].signInGoogle().then(switchTo); },
    /** Resolves the profile when the page was opened by a finished Google redirect sign-in, else null. */
    googleRedirect: function () { var pv = providers[active]; return pv.redirected ? pv.redirected().then(function (r) { return r ? switchTo(r) : null; }) : Promise.resolve(null); },
    resetPassword: function (email) { return providers[active].reset(String(email || '').trim().toLowerCase()); },
    signOut: function () { var pv = providers[active]; MEIKO.storage.remove(KEY); return pv.signOut ? pv.signOut() : Promise.resolve(); },
    /** Record agreement to the Privacy Policy and Terms ({ v, at, age18 }). */
    setConsent: function (c) { return save({ consent: c }); },
    /** True when deleting needs the password (email + password accounts on Firebase). */
    deleteNeedsPassword: function () { var p = profile(); return active === 'firebase' && !(p && p.via === 'google'); },
    /** Delete the account on the server (Firebase), then remove the profile from this device. */
    deleteAccount: function (pw) {
      var pv = providers[active];
      return Promise.resolve(pv.deleteAccount ? pv.deleteAccount(pw) : null).then(function () { MEIKO.storage.remove(KEY); return pv.signOut ? pv.signOut() : null; });
    },
    /** Plug in another provider (e.g. Firebase) later: { id, label, verifies, register(email) → Promise<{email, verified, uid}> }. */
    use: function (p) { providers[p.id] = p; active = p.id; },
    provider: function () { return providers[active]; },
    usesFirebase: function () { return active === 'firebase'; }
  };
  initFirebase();
})();
