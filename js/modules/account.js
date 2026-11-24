/*
 * MEIKO — Account (Settings): who is signed in, nickname, sign out.
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, esc = ui.esc, icon = ui.icon;
  /** Erase every MEIKO trace on this device: storage, Fleet files (IndexedDB) and saved/seen map tiles. */
  function wipeDevice() {
    MEIKO.storage.clearAll(); if (MEIKO.settings && MEIKO.settings.reset) MEIKO.settings.reset();
    var jobs = [];
    try { if (window.indexedDB) jobs.push(new Promise(function (res) { var r = indexedDB.deleteDatabase('meiko-fleet'); r.onsuccess = r.onerror = r.onblocked = function () { res(); }; })); } catch (e) {}
    if ('caches' in window) jobs.push(caches.delete('tiles-saved-v1').catch(function () {}), caches.delete('tiles-seen-v1').catch(function () {}));
    return Promise.all(jobs);
  }
  MEIKO.features.register({
    id: 'account', cat: 'settings', order: 2, icon: 'i-pin', title: 'Account',
    desc: 'Your email, nickname and sign-in', keywords: 'akun email login daftar register profile nickname sign out keluar',
    lead: 'Your MEIKO registration. Your email is never shown to other users.',
    render: function (view) {
      var p = MEIKO.auth.profile(), fb = MEIKO.auth.usesFirebase();
      if (!p) {
        view.innerHTML = ui.pageHead(this) + '<div class="card card-pad form-gap">' + ui.empty('i-pin', 'Not registered', 'Register with your email to use Fleet & Chat with your nickname.') +
          '<div class="actions"><a class="btn btn-primary" href="#/welcome">Register</a></div></div>';
        return;
      }
      view.innerHTML = ui.pageHead(this) + '<div class="card card-pad form-gap">' +
        ui.kv([['Email', esc(p.email)], ['Signed in with', fb ? (p.via === 'google' ? 'Google account' : 'Email &amp; password') : 'This device (saved here only)']]) +
        '<label class="field"><span>Nickname</span><input data-nick maxlength="24" value="' + esc(p.nickname || '') + '"><small class="hint" data-hint>Shown to other vessels in Fleet &amp; Chat.</small></label>' +
        '<div class="actions"><button class="btn btn-primary" data-save>' + icon('i-check') + 'Save nickname</button><a class="btn btn-ghost" href="#/t/vessel">' + icon('i-anchor') + 'My Vessel</a></div></div>' +
        '<div class="card card-pad form-gap"><b>Sign out</b><p class="small muted">' + (MEIKO.onboarding && MEIKO.onboarding.required() ? 'After signing out you must sign in again (internet needed) before using MEIKO. Your saved places, tracks and vessel stay on this device.' : 'Removes your registration from this device.') + '</p>' +
        '<div class="actions"><button class="btn btn-danger" data-out>' + icon('i-x') + 'Sign out</button></div></div>' +
        '<div class="card card-pad form-gap"><b>Delete account</b><p class="small muted">Permanently deletes your MEIKO account' + (fb ? ' (on Firebase)' : '') + ' and your MEIKO data on this device. Messages already sent to Fleet &amp; Chat stay with the other members and expire from the relays after 3 days.</p>' +
        '<div class="actions"><button class="btn btn-danger" data-del>' + icon('i-trash') + 'Delete account</button></div>' +
        '<p class="small muted">See the <a href="#/t/privacy">Privacy Policy</a> and <a href="#/t/terms">Terms of Use</a>.</p></div>';
      ui.$('[data-save]', view).addEventListener('click', function () {
        var n = ui.$('[data-nick]', view).value.trim().replace(/\s+/g, ' ');
        if (n.length < 2) { ui.$('[data-hint]', view).textContent = 'At least 2 characters.'; return; }
        MEIKO.auth.setNickname(n); ui.toast('Nickname saved');
      });
      ui.$('[data-del]', view).addEventListener('click', function () {
        var needPw = MEIKO.auth.deleteNeedsPassword(), google = fb && p.via === 'google';
        ui.sheet({ title: 'Delete account?', html: '<p>This cannot be undone. Your account <b>' + esc(p.email) + '</b> will be deleted' + (fb ? ' from Firebase' : '') + ', and your settings, places, tracks, vessel, chats and saved map areas on this device will be erased.</p>' +
          (needPw ? '<label class="field"><span>Password (to confirm)</span><input type="password" data-pw autocomplete="current-password"></label>' : '') +
          (google ? '<p class="small muted">Google will ask you to confirm with the same Google account.</p>' : '') +
          '<small class="hint" data-err></small>' +
          '<div class="actions"><button class="btn btn-danger" data-yes>' + icon('i-trash') + 'Delete permanently</button><button class="btn btn-ghost" data-close>Cancel</button></div>', onMount: function (body, close) {
          var btn = ui.$('[data-yes]', body), errEl = ui.$('[data-err]', body);
          btn.addEventListener('click', function () {
            var pw = needPw ? ui.$('[data-pw]', body).value : '';
            if (needPw && !pw) { errEl.textContent = 'Enter your password.'; errEl.classList.add('err'); return; }
            if (navigator.onLine === false && fb) { errEl.textContent = 'Deleting the account needs internet.'; errEl.classList.add('err'); return; }
            btn.disabled = true; errEl.textContent = 'Deleting…'; errEl.classList.remove('err');
            if (MEIKO.fleet && MEIKO.fleet.state.client) MEIKO.fleet.leave();
            MEIKO.auth.deleteAccount(pw).then(function () { return wipeDevice(); }).then(function () {
              close(); ui.toast('Your account was deleted'); location.hash = '#/welcome'; MEIKO.app.rerender();
            }, function (e) { btn.disabled = false; errEl.textContent = e.message; errEl.classList.add('err'); });
          });
        } });
      });
      ui.$('[data-out]', view).addEventListener('click', function () {
        ui.sheet({ title: 'Sign out?', html: '<p>You will need your email and password to sign in again.</p><div class="actions"><button class="btn btn-danger" data-yes>Sign out</button><button class="btn btn-ghost" data-close>Cancel</button></div>', onMount: function (body, close) {
          ui.$('[data-yes]', body).addEventListener('click', function () { close(); if (MEIKO.fleet && MEIKO.fleet.state.client) MEIKO.fleet.leave(); Promise.resolve(MEIKO.auth.signOut()).then(function () { location.hash = '#/welcome'; MEIKO.app.rerender(); }); });
        } });
      });
    }
  });
})();
