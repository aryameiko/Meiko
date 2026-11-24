/*
 * MEIKO — Fleet & Chat.
 * Vessels that join the same group code see each other on a map (name, avatar, COG/SOG, last seen) and can chat.
 * No MEIKO server and no account: messages go through public Nostr relays, encrypted with a key derived from the
 * group code (js/core/fleet.js). Sharing your position is off until you switch it on.
 * Storage: 'fleet' = { code, joined, share, name, relays }, 'fleet:sk' = this device's random signing key,
 * 'fleet:chat:<tag>' = last 100 messages of a group (kept on this device).
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, icon = ui.icon, esc = ui.esc, C = window.MeikoCore;
  var KEY = 'fleet', ONLINE_MS = 3 * 60 * 1000, BEAT_MS = 30000, MIN_GAP_MS = 10000;

  /* ======================= session (lives while the app is open) ======================= */
  var st = { dm: {}, dmName: {}, unread: {}, view: 'group', client: null, tag: null, peers: {}, chat: [], status: { relays: 0, connected: 0 }, fix: null, prevFix: null, lastSent: 0, timer: null, joining: false };
  var subs = [];
  function cfg() { return Object.assign({ code: '', joined: false, share: false, name: '', relays: '' }, MEIKO.storage.get(KEY, {})); }
  function saveCfg(p) { MEIKO.storage.set(KEY, Object.assign(cfg(), p)); }
  function emit(what) { subs.forEach(function (fn) { try { fn(what); } catch (e) {} }); }
  function sk() {
    var nc = window.MeikoNostrCrypto, h = MEIKO.storage.get('fleet:sk', null);
    if (!h || !/^[0-9a-f]{64}$/.test(h)) { h = nc.bytesToHex(nc.randomBytes(32)); MEIKO.storage.set('fleet:sk', h); }
    return nc.hexToBytes(h);
  }
  function relayList() {
    var custom = String(cfg().relays || '').split(/[\s,]+/).filter(function (u) { return /^wss:\/\/[^\s]+$/i.test(u) || /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/\S*)?$/i.test(u); });
    return custom.length ? custom : C.fleet.DEFAULT_RELAYS;
  }
  function me() {
    var v = MEIKO.vessel && MEIKO.vessel.get(), c = cfg();
    return { name: (c.name || (v && v.name) || 'Unnamed vessel').slice(0, 40), callsign: v && v.callsign ? v.callsign.slice(0, 16) : '', v: v ? { type: v.type, h: v.h, s: v.s, a: v.a } : null };
  }
  function supported() { return !!(window.WebSocket && window.crypto && window.crypto.subtle && window.MeikoNostrCrypto && C.fleet); }

  function onFix(f) {
    if (!f || !isFinite(f.lat)) return;
    if (st.fix && C.geo.haversine(st.fix.lat, st.fix.lon, f.lat, f.lon) > 30) st.prevFix = st.fix;
    st.fix = f;
    if (cfg().share && (!st.posSent || Date.now() - st.lastSent > MIN_GAP_MS * 1.5)) beat();
    if (cfg().share) emit('status');
  }
  function cogSog() {
    var f = st.fix, cog = null, sog = null;
    if (f.speed != null && isFinite(f.speed)) sog = f.speed * 1.943844;
    if (f.heading != null && isFinite(f.heading) && (sog == null || sog > 0.5)) cog = (f.heading + 360) % 360;
    if (cog == null && st.prevFix && f.timestamp - st.prevFix.timestamp < 10 * 60 * 1000) {
      var gc = C.geo.greatCircle(st.prevFix.lat, st.prevFix.lon, f.lat, f.lon);
      if (!gc.coincident) { cog = gc.initialBearing; if (sog == null) sog = gc.distanceNM / Math.max(1 / 3600, (f.timestamp - st.prevFix.timestamp) / 3600000); }
    }
    return { cog: cog != null ? Math.round(cog * 10) / 10 : null, sog: sog != null ? Math.min(99, Math.round(sog * 10) / 10) : null };
  }
  function beat() {
    if (!st.client) return;
    var p = me(), c = cfg();
    p.k = 'live';
    if (c.share && st.fix && Date.now() - (st.fix.timestamp || 0) < 5 * 60 * 1000) {
      var cs = cogSog();
      p.pos = { lat: Math.round(st.fix.lat * 1e5) / 1e5, lon: Math.round(st.fix.lon * 1e5) / 1e5, cog: cs.cog, sog: cs.sog, t: st.fix.timestamp, acc: st.fix.accuracy != null ? Math.round(st.fix.accuracy) : null };
    }
    st.lastSent = Date.now(); st.posSent = !!p.pos;
    st.client.sendLive(p).catch(function () {});
  }
  function ensureGps() {
    if (!MEIKO.gps) return;
    var l = MEIKO.gps.last && MEIKO.gps.last(); if (l) onFix(l);
    if (!MEIKO.gps.isWatching()) MEIKO.gps.watch(function () {}, function (e) { ui.toast(e.message); });
  }
  function chatKey() { return 'fleet:chat:' + st.tag; }
  function addChat(m) {
    if (st.chat.some(function (x) { return x.id === m.id; })) return false;
    st.chat.push({ id: m.id, from: m.from, me: m.me, name: m.name, callsign: m.callsign, text: m.text, at: m.at });
    st.chat.sort(function (a, b) { return a.at - b.at; });
    if (st.chat.length > 100) st.chat = st.chat.slice(-100);
    MEIKO.storage.set(chatKey(), st.chat);
    return true;
  }
  function dmKey() { return 'fleet:dm:' + st.tag; }
  function loadDM() {
    var d = MEIKO.storage.get(dmKey(), null) || {};
    st.dm = d.threads && typeof d.threads === 'object' ? d.threads : {}; st.dmName = d.names || {}; st.unread = d.unread || {};
  }
  function saveDM() { MEIKO.storage.set(dmKey(), { threads: st.dm, names: st.dmName, unread: st.unread }); }
  function addDM(m) {
    var t = st.dm[m.peer] || (st.dm[m.peer] = []);
    if (t.some(function (x) { return x.id === m.id; })) return false;
    t.push({ id: m.id, me: !!m.me, name: m.name, text: m.text, at: m.at });
    t.sort(function (a, b) { return a.at - b.at; }); if (t.length > 100) st.dm[m.peer] = t.slice(-100);
    if (!m.me && m.name) st.dmName[m.peer] = m.name;
    var viewing = st.view === m.peer && document.querySelector('[data-fleet-page]');
    if (!m.me && !viewing) st.unread[m.peer] = (st.unread[m.peer] || 0) + 1;
    saveDM(); return true;
  }
  function peerName(id) { return (st.peers[id] && st.peers[id].name) || st.dmName[id] || ('Vessel ' + C.fleet.shortId(id)); }
  function join(code) {
    if (!supported()) return Promise.reject(new Error('This browser cannot run Fleet & Chat.'));
    code = C.fleet.normCode(code);
    if (!C.fleet.codeOk(code)) return Promise.reject(new Error('The group code needs at least 8 letters or digits.'));
    leave(true);
    st.joining = true; emit('status');
    var client = C.fleet.createClient({
      relays: relayList(), code: code, sk: sk(), WebSocket: window.WebSocket, nc: window.MeikoNostrCrypto, subtle: window.crypto.subtle,
      onStatus: function (s) { if (st.client !== client) return; st.status = s; emit('status'); },
      onLive: function (p) {
        if (p.me) return;
        if (p.k === 'bye') { if (st.peers[p.from]) { st.peers[p.from].left = true; st.peers[p.from].at = p.at; } emit('peers'); return; }
        var old = st.peers[p.from] || {};
        st.peers[p.from] = { id: p.from, name: p.name, callsign: p.callsign, vessel: p.vessel, pos: p.pos || (old.pos && Date.now() - old.pos.seen < 2 * 3600 * 1000 ? old.pos : null), at: Math.max(p.at, old.at || 0), left: false };
        if (p.pos) st.peers[p.from].pos.seen = p.at;
        emit('peers');
      },
      onChat: function (m) {
        if (!addChat(m)) return;
        emit('chat');
        if (!m.me && Date.now() - m.at < 120000 && !document.querySelector('[data-fleet-page]')) ui.toast('💬 ' + m.name + ': ' + m.text.slice(0, 60));
      },
      onDM: function (m) {
        if (!st.tag || !addDM(m)) return;
        emit('dm');
        if (!m.me && Date.now() - m.at < 120000 && !(st.view === m.peer && document.querySelector('[data-fleet-page]'))) ui.toast('🔒 ' + peerName(m.peer) + ': ' + m.text.slice(0, 60));
      }
    });
    st.client = client;
    return client.start().then(function (tag) {
      if (st.client !== client) return;
      st.tag = tag; st.joining = false;
      st.chat = (MEIKO.storage.get(chatKey(), []) || []).filter(function (m) { return m && m.id && typeof m.text === 'string'; });
      loadDM();
      saveCfg({ code: code, joined: true });
      if (cfg().share) ensureGps();
      MEIKO.gps && MEIKO.gps.offFix && MEIKO.gps.offFix(onFix); MEIKO.gps && MEIKO.gps.onFix(onFix);
      clearInterval(st.timer); st.timer = setInterval(beat, BEAT_MS);
      setTimeout(beat, 1500);
      emit('all');
    }, function (e) { st.joining = false; st.client = null; emit('status'); throw e; });
  }
  function leave(silent) {
    clearInterval(st.timer); st.timer = null;
    if (st.client) { try { st.client.sendLive({ k: 'bye', name: me().name }); } catch (e) {} var c = st.client; setTimeout(function () { c.stop(); }, 400); }
    st.client = null; st.tag = null; st.peers = {}; st.chat = []; st.dm = {}; st.dmName = {}; st.unread = {}; st.view = 'group'; st.status = { relays: 0, connected: 0 };
    if (MEIKO.gps && MEIKO.gps.offFix) MEIKO.gps.offFix(onFix);
    if (!silent) { saveCfg({ joined: false }); emit('all'); }
  }
  function setShare(on) {
    saveCfg({ share: !!on });
    if (on) ensureGps();
    beat(); emit('status');
  }
  function sendChat(text) {
    text = String(text || '').trim(); if (!text || !st.client) return Promise.resolve(null);
    var m = me();
    return st.client.sendChat(text, { name: m.name, callsign: m.callsign, v: m.v });
  }
  function sendDM(peer, text) {
    text = String(text || '').trim(); if (!text || !st.client) return Promise.resolve(null);
    var m = me();
    return st.client.sendDM(peer, text, { name: m.name, callsign: m.callsign });
  }
  function peersSorted() {
    return Object.keys(st.peers).map(function (k) { return st.peers[k]; }).sort(function (a, b) { return b.at - a.at; });
  }
  // Resume the group after a reload (sharing resumes only if it was switched on).
  setTimeout(function () { var c = cfg(); if (c.joined && c.code && supported() && navigator.onLine !== false) join(c.code).catch(function () {}); }, 1200);
  window.addEventListener('online', function () { var c = cfg(); if (c.joined && c.code && !st.client) join(c.code).catch(function () {}); });

  MEIKO.fleet = { join: join, leave: leave, setShare: setShare, sendChat: sendChat, sendDM: sendDM, state: st, cfg: cfg, subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (x) { return x !== fn; }); }; } };

  /* ======================= page ======================= */
  function ago(ms) {
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago'; return Math.floor(s / 86400) + ' d ago';
  }
  function vesselOf(p) {
    if (!p.vessel || !MEIKO.vessel) return null;
    var t = MEIKO.vessel.types.filter(function (x) { return x.id === p.vessel.type; })[0]; if (!t) return null;
    return { type: t.id, h: p.vessel.h || t.def.h, s: p.vessel.s || t.def.s, a: p.vessel.a || t.def.a };
  }
  function online(p) { return !p.left && Date.now() - p.at < ONLINE_MS; }
  function kn(v) { return v == null ? '—' : ui.num(v, 1) + ' kn'; }
  function deg(v) { return v == null ? '—' : ui.bearing(v) + ' T'; }

  MEIKO.features.register({
    id: 'fleet', cat: 'navigation', order: 4, icon: 'i-chat', title: 'Fleet & Chat',
    desc: 'See other MEIKO vessels online and chat with them', keywords: 'chat fleet group armada kapal lain posisi teman pesan message',
    lead: 'Join a group with a shared code to see the other vessels on a map and chat. No account needed.',
    render: function (view) {
      var c = cfg();
      var setup = '<div class="card card-pad form-gap" data-setup>' +
        '<label class="field"><span>Your name on the map</span><input data-name maxlength="40" placeholder="' + esc(me().name) + '" value="' + esc(c.name || '') + '"></label>' +
        '<label class="field"><span>Group code</span><input data-code autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="e.g. MEIKO-7KQP-29XD" value="' + esc(c.code || '') + '"><small class="hint">Everyone who uses the same code is in the same group. Treat it like a password.</small></label>' +
        '<div class="actions"><button type="button" class="btn btn-primary" data-join>' + icon('i-check') + 'Join group</button><button type="button" class="btn btn-ghost" data-new>' + icon('i-plus') + 'New code</button></div>' +
        '<div data-offline-note></div></div>';
      var live = '<div class="card card-pad form-gap fleet-live" data-live hidden>' +
        '<div class="fleet-head"><div><div class="label">Group</div><b class="fleet-code" data-codeview></b></div><button type="button" class="btn btn-ghost btn-sm" data-share-code>' + icon('i-copy') + 'Share code</button></div>' +
        '<div class="fleet-status" data-status></div>' +
        '<label class="fleet-switch"><input type="checkbox" data-share> <span><b>Share my position</b><small data-share-hint></small></span></label>' +
        '<div class="port-map-wrap"><div class="map-box port-map fleet-map" data-fmap></div></div>' +
        '<div data-peers></div>' +
        '<div class="fleet-chat"><div class="label">Chat</div><div class="chat-tabs" data-tabs role="tablist"></div><div data-dmhead></div><div class="chat-list" data-chat aria-live="polite"></div>' +
        '<form class="chat-form" data-chatform><input class="input" data-msg maxlength="500" placeholder="Type a message" autocomplete="off" enterkeyhint="send"><button class="btn btn-primary" type="submit">Send</button></form></div>' +
        '<div class="actions"><button type="button" class="btn btn-ghost" data-leave>' + icon('i-x') + 'Leave group</button></div></div>';
      view.innerHTML = ui.pageHead(this) + '<div data-fleet-page class="fleet-page">' + setup + live +
        ui.notice('warn', '<b>Not a safety system.</b> Fleet & Chat needs internet on both sides and uses free public relays that can be slow or down. For distress and collision avoidance use VHF (Ch 16 / DSC) and AIS.') +
        ui.help('How it works and privacy', '<p>MEIKO has no server and no accounts. Messages travel through free public <b>Nostr relays</b>. Everything is encrypted with a key made from the group code, so the relays see only scrambled data. Anyone who knows the code can read the group, so share it only with people you trust.</p>' +
          '<p>Your position is sent only while <b>Share my position</b> is on, every 30 seconds, and only while MEIKO is open. Phones pause web apps in the background, so others may see you as offline. <b>Private chat</b> (the Private button next to a vessel) is encrypted a second time with a key only your device and theirs can compute, so other group members cannot read it. Compare the <b>safety code</b> by VHF or phone to be sure you are talking to the right device. Relays and group members can still see <i>that</i> you sent a private message and when, but not to whom or what it says. Anyone who gets hold of an unlocked phone can read its messages.</p><p>Positions are not stored by the relays; recent chat (up to 2 days) is, so people who join later can read it. The last 100 messages are also kept on this device.</p>' +
          '<p>Vessels show as online if they sent something in the last 3 minutes; otherwise you see when they were last seen.</p>' +
          '<label class="field"><span>Relays (advanced)</span><textarea data-relays rows="3" placeholder="' + esc(C.fleet.DEFAULT_RELAYS.join('\n')) + '">' + esc(c.relays || '') + '</textarea><small class="hint">Leave empty for the defaults. One wss:// address per line. Everyone in a group needs at least one relay in common.</small></label>') + '</div>';

      var $ = function (s) { return ui.$(s, view); };
      var fm = null, markers = {};
      function alive() { return document.body.contains(view) && $('[data-fleet-page]'); }
      function paintMode() {
        var joined = !!st.client;
        $('[data-setup]').hidden = joined; $('[data-live]').hidden = !joined;
        $('[data-offline-note]').innerHTML = navigator.onLine === false ? ui.notice('warn', 'You are offline. Fleet & Chat needs an internet connection.', 'i-wifi-off') : '';
        if (joined) { $('[data-codeview]').textContent = cfg().code; initMap(); }
        paintStatus(); paintPeers(); paintChat();
      }
      function paintStatus() {
        if (!st.client) return;
        var s = st.status, n = peersSorted().filter(online).length, sh = cfg().share;
        $('[data-status]').innerHTML = '<span class="dot ' + (s.connected ? 'ok' : 'bad') + '"></span>' +
          (st.joining ? 'Connecting…' : s.connected ? 'Connected (' + s.connected + '/' + s.relays + ' relays)' : navigator.onLine === false ? 'Offline: waiting for internet' : 'Connecting to relays…') +
          ' · ' + n + ' other vessel' + (n === 1 ? '' : 's') + ' online';
        $('[data-share]').checked = sh;
        $('[data-share-hint]').textContent = sh ? (st.fix ? 'On. Others in this group see your position, COG and SOG.' : 'On. Waiting for a GPS fix…') : 'Off. Others see your name only, not where you are.';
      }
      function peerRow(p) {
        var dist = '';
        if (p.pos && st.fix) { var g = C.geo.greatCircle(st.fix.lat, st.fix.lon, p.pos.lat, p.pos.lon); dist = ui.num(g.distanceNM, g.distanceNM < 10 ? 2 : 1) + ' NM · ' + ui.bearing(g.initialBearing) + ' T'; }
        return '<div class="fleet-peer' + (online(p) ? '' : ' off') + '"><button type="button" class="fp-btn" data-peer="' + esc(p.id) + '">' +
          '<span class="dot ' + (online(p) ? 'ok' : '') + '"></span><span class="fp-main"><b>' + esc(p.name) + (p.callsign ? ' <small>' + esc(p.callsign) + '</small>' : '') + '</b>' +
          '<small>' + (p.pos ? 'COG ' + deg(p.pos.cog) + ' · SOG ' + kn(p.pos.sog) + (dist ? ' · ' + dist : '') : 'Position not shared') + '</small></span>' +
          '<small class="fp-seen">' + (p.left ? 'left · ' : '') + (online(p) ? 'online' : ago(p.at)) + '<br><span class="fp-id">ID ' + C.fleet.shortId(p.id) + '</span></small></button>' +
          '<button type="button" class="btn btn-ghost btn-sm fp-dm" data-dm="' + esc(p.id) + '" aria-label="Private chat with ' + esc(p.name) + '">' + icon('i-lock') + 'Private' + (st.unread[p.id] ? ' <span class="badge-n">' + st.unread[p.id] + '</span>' : '') + '</button></div>';
      }
      function paintPeers() {
        if (!st.client) return;
        var list = peersSorted();
        $('[data-peers]').innerHTML = list.length ? '<div class="label">Vessels in this group</div><div class="fleet-peers">' + list.map(peerRow).join('') + '</div>' :
          '<p class="small muted">No other vessels yet. Share the group code; they appear here as soon as they join.</p>';
        paintMarkers();
      }
      function paintTabs() {
        var ids = Object.keys(st.dm).filter(function (k) { return st.dm[k].length; });
        if (st.view !== 'group' && ids.indexOf(st.view) < 0) ids.push(st.view);
        ids.sort(function (a, b) { var la = st.dm[a] && st.dm[a].length ? st.dm[a][st.dm[a].length - 1].at : Date.now(), lb = st.dm[b] && st.dm[b].length ? st.dm[b][st.dm[b].length - 1].at : Date.now(); return lb - la; });
        $('[data-tabs]').innerHTML = '<button type="button" role="tab" class="chat-tab' + (st.view === 'group' ? ' on' : '') + '" data-tab="group">Group</button>' + ids.map(function (id) {
          return '<button type="button" role="tab" class="chat-tab' + (st.view === id ? ' on' : '') + '" data-tab="' + esc(id) + '">' + icon('i-lock') + esc(peerName(id)) + (st.unread[id] ? ' <span class="badge-n">' + st.unread[id] + '</span>' : '') + '</button>';
        }).join('');
      }
      function msgHTML(m, showName) {
        return '<div class="msg' + (m.me ? ' me' : '') + '"><div class="msg-meta">' + (m.me ? 'You' : esc(m.name) + (showName && m.from ? ' · ID ' + C.fleet.shortId(m.from) : '')) + ' · ' + esc(ui.time(m.at)) + (Date.now() - m.at > 86400000 ? ' · ' + esc(ui.date(m.at)) : '') + '</div><div class="msg-text">' + esc(m.text) + '</div></div>';
      }
      function paintChat() {
        if (!st.client) return;
        paintTabs();
        var box = $('[data-chat]'), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40, list, dm = st.view !== 'group';
        if (dm) {
          if (st.unread[st.view]) { delete st.unread[st.view]; saveDM(); paintTabs(); paintPeers(); }
          var myPub = st.client.pubkey, code = C.fleet.safetyCode(window.MeikoNostrCrypto, myPub, st.view);
          $('[data-dmhead]').innerHTML = '<div class="dm-head">' + icon('i-lock') + '<div><b>Private with ' + esc(peerName(st.view)) + '</b> <small>ID ' + C.fleet.shortId(st.view) + '</small>' +
            '<small>Only your device and theirs can read these messages. Other group members cannot.</small>' +
            '<details><summary>Safety code: <b class="sc">' + code + '</b></summary><small>Ask the other vessel (by VHF, phone or in person) to read the safety code on their screen. If it is the same, you are talking to the right device and nobody else can read it. If it differs, do not send secrets.</small></details></div></div>';
          list = st.dm[st.view] || [];
          $('[data-msg]').placeholder = 'Private message to ' + peerName(st.view);
        } else { $('[data-dmhead]').innerHTML = ''; list = st.chat; $('[data-msg]').placeholder = 'Message to the whole group'; }
        box.classList.toggle('dm', dm);
        box.innerHTML = list.length ? list.map(function (m) { return msgHTML(m, !dm); }).join('') : '<p class="small muted">' + (dm ? 'No private messages yet.' : 'No messages yet.') + '</p>';
        if (atBottom || list.length && list[list.length - 1].me) box.scrollTop = box.scrollHeight;
      }
      function openDM(id) { st.view = id; paintChat(); $('[data-msg]').focus({ preventScroll: true }); $('.fleet-chat').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      function initMap() {
        if (fm || !MEIKO.map || !window.L) return;
        var f = st.fix || (MEIKO.gps && MEIKO.gps.last && MEIKO.gps.last());
        fm = MEIKO.map.create($('[data-fmap]'), { markers: false, noRemember: true, center: f ? [f.lat, f.lon] : [-2.5, 118], zoom: f ? 9 : 4 });
        if (fm) { paintMarkers(true); }
      }
      function paintMarkers(fit) {
        if (!fm) return;
        var L = fm.L, keep = {}, pts = [], added = false;
        peersSorted().forEach(function (p) {
          if (!p.pos) return;
          keep[p.id] = 1;
          var v = vesselOf(p), moving = p.pos.sog == null || p.pos.sog > 0.5, hdg = moving ? p.pos.cog : null;
          var icon = v ? L.divIcon({ className: 'mk vsl-mk' + (online(p) ? '' : ' stale'), html: MEIKO.vessel.markerHTML(v, hdg), iconSize: hdg != null ? [34, 68] : [76, 46], iconAnchor: hdg != null ? [17, 34] : [38, 39] })
            : L.divIcon({ className: 'mk pm-dot fleet-dot' + (online(p) ? '' : ' stale'), iconSize: [16, 16], iconAnchor: [8, 8] });
          var tip = '<b>' + esc(p.name) + '</b> · ' + (online(p) ? 'online' : ago(p.pos.seen || p.at)) + '<br>COG ' + deg(p.pos.cog) + ' · SOG ' + kn(p.pos.sog);
          var ll = [p.pos.lat, p.pos.lon]; pts.push(ll);
          if (!markers[p.id]) added = markers[p.id] = L.marker(ll, { icon: icon, keyboard: false }).bindTooltip(tip, { permanent: true, direction: 'top', offset: [0, -10], className: 'pm-label fleet-label' }).addTo(fm.map);
          else { markers[p.id].setLatLng(ll).setIcon(icon); markers[p.id].setTooltipContent(tip); }
        });
        Object.keys(markers).forEach(function (k) { if (!keep[k]) { fm.map.removeLayer(markers[k]); delete markers[k]; } });
        if ((fit || added) && pts.length) { var mf = st.fix || (MEIKO.gps && MEIKO.gps.last && MEIKO.gps.last()); if (mf && isFinite(mf.lat)) pts.push([mf.lat, mf.lon]); fm.map.invalidateSize(); if (pts.length > 1) fm.map.fitBounds(pts, { padding: [50, 50], maxZoom: 12 }); else fm.map.setView(pts[0], 10); }
      }

      var unsub = MEIKO.fleet.subscribe(function (what) {
        if (!alive()) { unsub(); return; }
        if (what === 'all') return paintMode();
        if (what === 'status') { paintStatus(); return; }
        if (what === 'peers') { paintPeers(); paintStatus(); return; }
        if (what === 'chat') paintChat();
        if (what === 'dm') { paintChat(); paintPeers(); }
      });
      var tick = setInterval(function () { if (!alive()) { clearInterval(tick); return; } paintPeers(); paintStatus(); }, 20000);

      $('[data-new]').addEventListener('click', function () { $('[data-code]').value = C.fleet.newCode(window.MeikoNostrCrypto.randomBytes); });
      $('[data-name]').addEventListener('input', function (e) { saveCfg({ name: e.target.value.trim() }); });
      $('[data-relays]').addEventListener('change', function (e) { saveCfg({ relays: e.target.value.trim() }); if (st.client) join(cfg().code).catch(function (er) { ui.toast(er.message); }); });
      $('[data-join]').addEventListener('click', function () {
        if (!supported()) { ui.toast('This browser cannot run Fleet & Chat.'); return; }
        var btn = this; btn.disabled = true;
        join($('[data-code]').value).then(function () { btn.disabled = false; }, function (e) { btn.disabled = false; ui.toast(e.message); });
      });
      $('[data-leave]').addEventListener('click', function () { if (fm) { try { fm.map.remove(); } catch (e) {} } fm = null; markers = {}; leave(); });
      $('[data-share]').addEventListener('change', function (e) { setShare(e.target.checked); });
      $('[data-share-code]').addEventListener('click', function () {
        var code = cfg().code, text = 'Join my MEIKO group: open Fleet & Chat at ' + location.origin + location.pathname + ' and enter the code ' + code;
        if (navigator.share) navigator.share({ title: 'MEIKO group', text: text }).catch(function () {}); else ui.copy(code);
      });
      $('[data-chatform]').addEventListener('submit', function (e) {
        e.preventDefault(); var inp = $('[data-msg]'), t = inp.value;
        if (!t.trim()) return;
        (st.view === 'group' ? sendChat(t) : sendDM(st.view, t)).then(function (r) { inp.value = ''; if (r && !r.sent) ui.toast('Not connected to any relay yet; the message was not delivered.'); }, function (er) { ui.toast(er.message); });
      });
      view.addEventListener('click', function (e) {
        var tb = e.target.closest('[data-tab]'); if (tb) { st.view = tb.dataset.tab; paintChat(); return; }
        var d = e.target.closest('[data-dm]'); if (d) { openDM(d.dataset.dm); return; }
        var b = e.target.closest('[data-peer]'); if (!b || !fm) return;
        var p = st.peers[b.dataset.peer]; if (p && p.pos) { fm.map.setView([p.pos.lat, p.pos.lon], Math.max(fm.map.getZoom(), 11)); $('[data-fmap]').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
      paintMode();
    }
  });
})();
