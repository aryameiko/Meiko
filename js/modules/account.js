/*
 * MEIKO — Account (Settings): who is signed in, nickname, sign out.
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, esc = ui.esc, icon = ui.icon;
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
        ui.kv([['Email', esc(p.email)], ['Status', fb ? (p.verified ? '<span class="badge ok">confirmed</span>' : '<span class="badge warn">not confirmed</span>') : 'Saved on this device only'], ['Signed in with', fb ? 'Email &amp; password (Firebase)' : 'This device']]) +
        '<label class="field"><span>Nickname</span><input data-nick maxlength="24" value="' + esc(p.nickname || '') + '"><small class="hint" data-hint>Shown to other vessels in Fleet &amp; Chat.</small></label>' +
        '<div class="actions"><button class="btn btn-primary" data-save>' + icon('i-check') + 'Save nickname</button><a class="btn btn-ghost" href="#/t/vessel">' + icon('i-anchor') + 'My Vessel</a></div></div>' +
        '<div class="card card-pad form-gap"><b>Sign out</b><p class="small muted">' + (MEIKO.onboarding && MEIKO.onboarding.required() ? 'After signing out you must sign in again (internet needed) before using MEIKO. Your saved places, tracks and vessel stay on this device.' : 'Removes your registration from this device.') + '</p>' +
        '<div class="actions"><button class="btn btn-danger" data-out>' + icon('i-x') + 'Sign out</button></div></div>';
      ui.$('[data-save]', view).addEventListener('click', function () {
        var n = ui.$('[data-nick]', view).value.trim().replace(/\s+/g, ' ');
        if (n.length < 2) { ui.$('[data-hint]', view).textContent = 'At least 2 characters.'; return; }
        MEIKO.auth.setNickname(n); ui.toast('Nickname saved');
      });
      ui.$('[data-out]', view).addEventListener('click', function () {
        ui.sheet({ title: 'Sign out?', html: '<p>You will need your email and password to sign in again.</p><div class="actions"><button class="btn btn-danger" data-yes>Sign out</button><button class="btn btn-ghost" data-close>Cancel</button></div>', onMount: function (body, close) {
          ui.$('[data-yes]', body).addEventListener('click', function () { close(); if (MEIKO.fleet && MEIKO.fleet.state.client) MEIKO.fleet.leave(); Promise.resolve(MEIKO.auth.signOut()).then(function () { location.hash = '#/welcome'; MEIKO.app.rerender(); }); });
        } });
      });
    }
  });
})();
