/*
 * MEIKO — Fleet & Chat.
 * Every signed-in user joins the public fleet automatically (v1.13.0), so online vessels see each other on a map
 * (name, avatar, COG/SOG, last seen) and can start a private chat. A private group with its own code is optional.
 * No MEIKO server: messages go through public Nostr relays, encrypted with a key derived from the group code
 * (js/core/fleet.js; the public fleet's code is public). Sharing your position is off until you agree.
 * Storage: 'fleet' = { code (private group), joined (in that group), share, shareAsked, publicOff, name, relays },
 * 'fleet:sk' = this device's random signing key,
 * 'fleet:chat:<tag>' = last 100 messages of a group (kept on this device).
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, icon = ui.icon, esc = ui.esc, C = window.MeikoCore;
  var PUB = C.fleet.PUBLIC_CODE, KEY = 'fleet', ONLINE_MS = 3 * 60 * 1000, BEAT_MS = 30000, MIN_GAP_MS = 10000;

  /* ======================= session (lives while the app is open) ======================= */
  var st = { dm: {}, dmName: {}, unread: {}, view: 'group', client: null, tag: null, peers: {}, chat: [], status: { relays: 0, connected: 0 }, fix: null, prevFix: null, lastSent: 0, timer: null, joining: false, code: null };
  var subs = [];
  function cfg() { return Object.assign({ code: '', joined: false, share: false, shareAsked: false, publicOff: false, general: false, blocked: [], name: '', relays: '' }, MEIKO.storage.get(KEY, {})); }
  /** In the public fleet (everyone), not a private group. */
  function isPublic() { return st.code === PUB; }
  /** Vessels this user blocked: their messages are dropped and they are hidden from the map and list. */
  function blocked(id) { var b = cfg().blocked; return Array.isArray(b) && b.indexOf(id) >= 0; }
  function setBlocked(id, on) {
    var b = (cfg().blocked || []).filter(function (x) { return x !== id; }); if (on) b.push(id);
    saveCfg({ blocked: b.slice(-500) });
    if (on) { delete st.peers[id]; st.chat = st.chat.filter(function (m) { return m.from !== id; }); if (st.tag) MEIKO.storage.set(chatKey(), st.chat); if (st.view === id) st.view = 'group'; }
    emit('all');
  }
  /** Group chat is visible: always in a private group; in the public fleet only after joining the General Group. */
  function groupOn() { return !isPublic() || !!cfg().general; }
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
    return { name: (c.name || (MEIKO.auth && MEIKO.auth.nickname()) || (v && v.name) || 'Unnamed vessel').slice(0, 40), callsign: v && v.callsign ? v.callsign.slice(0, 16) : '', v: v ? { type: v.type, h: v.h, s: v.s, a: v.a } : null };
  }
  function supported() { return !!(window.WebSocket && window.crypto && window.crypto.subtle && window.MeikoNostrCrypto && C.fleet); }

  function onFix(f) {
    if (!f || !isFinite(f.lat)) return;
    if (st.fix && C.geo.haversine(st.fix.lat, st.fix.lon, f.lat, f.lon) > 30) { st.prevFix = st.fix; st.lastMove = Date.now(); }
    if (!st.lastMove) st.lastMove = Date.now();
    st.fix = f; trackSlow();
    if (cfg().share && (!st.posSent || Date.now() - st.lastSent > MIN_GAP_MS * 1.5)) beat();
    if (cfg().share) emit('status');
  }
  function trackSlow() { var cs = cogSog(); if (cs.sog != null && cs.sog < 0.5) { if (!st.slowSince) st.slowSince = Date.now(); } else if (cs.sog != null) st.slowSince = 0; }
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
    // Forget vessels not heard from for 6 hours (the public fleet can see many vessels in a day).
    Object.keys(st.peers).forEach(function (k) { if (Date.now() - st.peers[k].at > 6 * 3600 * 1000) delete st.peers[k]; });
    var p = me(), c = cfg();
    p.k = 'live'; if (c.ns != null) p.ns = c.ns;
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
    if (!st.gw) st.gw = MEIKO.gps.watch(function () { st.gpsWarned = false; }, function (e) {
      // Signal loss repeats every 30 s while it lasts: say it once, not every time.
      if (e.code === 2 || e.code === 3) { if (!st.gpsWarned) ui.toast(e.message); st.gpsWarned = true; return; }
      ui.toast(e.message); gpsOff();
    });
  }
  function gpsOff() { if (st.gw) MEIKO.gps.stop(st.gw); st.gw = null; }
  function chatKey() { return 'fleet:chat:' + st.tag; }
  /* Flood guard (the public fleet is open to everyone): at most 8 messages per sender in any minute; more are dropped. */
  var FLOOD_N = 8, FLOOD_MS = 60000, sent = {};
  function flooding(from, at) {
    var a = (sent[from] || []).filter(function (t) { return Math.abs(t - at) < 10 * FLOOD_MS; });
    var n = a.filter(function (t) { return Math.abs(t - at) < FLOOD_MS; }).length;
    if (n >= FLOOD_N) { sent[from] = a; return true; }
    a.push(at); sent[from] = a.slice(-50); return false;
  }
  function addChat(m) {
    if (st.chat.some(function (x) { return x.id === m.id; })) return false;
    st.chat.push({ id: m.id, from: m.from, me: m.me, name: m.name, callsign: m.callsign, text: m.text, att: m.att || null, at: m.at });
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
    t.push({ id: m.id, me: !!m.me, from: m.from, name: m.name, text: m.text, att: m.att || null, at: m.at });
    t.sort(function (a, b) { return a.at - b.at; }); if (t.length > 100) st.dm[m.peer] = t.slice(-100);
    if (!m.me && m.name) st.dmName[m.peer] = m.name;
    var viewing = st.view === m.peer && document.querySelector('[data-fleet-page]');
    if (!m.me && !viewing) st.unread[m.peer] = (st.unread[m.peer] || 0) + 1;
    saveDM(); return true;
  }
  /* ---- files: kept in IndexedDB on this device (localStorage is too small) ---- */
  var dbP = null, urls = {};
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      try { var r = indexedDB.open('meiko-fleet', 1); r.onupgradeneeded = function () { r.result.createObjectStore('files'); }; r.onsuccess = function () { res(r.result); prune(r.result); }; r.onerror = function () { rej(r.error); }; }
      catch (e) { rej(e); }
    });
    return dbP;
  }
  /* Relays drop chat after 3 days; drop the photos, videos and files kept on this phone after the same time, so
     the public fleet cannot fill the phone's storage. */
  var KEEP_FILES_MS = 3 * 86400 * 1000;
  function prune(d) {
    try {
      var tx = d.transaction('files', 'readwrite'), cut = Date.now() - KEEP_FILES_MS;
      tx.objectStore('files').openCursor().onsuccess = function (e) { var c = e.target.result; if (!c) return; if (!c.value || !(c.value.at > cut)) c.delete(); c.continue(); };
    } catch (e) {}
  }
  function putFile(key, rec) { return db().then(function (d) { return new Promise(function (res, rej) { var tx = d.transaction('files', 'readwrite'); tx.objectStore('files').put(rec, key); tx.oncomplete = res; tx.onerror = function () { rej(tx.error); }; }); }); }
  function getFile(key) { return db().then(function (d) { return new Promise(function (res) { var q = d.transaction('files').objectStore('files').get(key); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }, function () { return null; }); }
  /* A file from another vessel is only shown as a photo or video; anything else is handled as a plain download,
     so a received web page or script can never run inside MEIKO. */
  function safeMime(m) { return /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime|3gpp))$/.test(String(m || '')) ? m : 'application/octet-stream'; }
  function fileURL(key) {
    if (urls[key]) return Promise.resolve(urls[key]);
    return getFile(key).then(function (r) { if (!r) return null; return (urls[key] = { url: URL.createObjectURL(new Blob([r.bytes], { type: safeMime(r.mime) })), rec: r }); });
  }
  st.prog = {};
  function onFile(f) {
    if (blocked(f.from) || (isPublic() && !f.peer && !cfg().general)) return;
    var key = f.from + ':' + f.fid;
    delete st.prog[key];
    putFile(key, { bytes: f.bytes, name: f.meta.name, mime: f.meta.mime, at: Date.now() }).then(function () { emit('file'); }, function () { emit('file'); });
  }
  /** Shrink a photo to at most 1280 px and about 300 KB (JPEG). */
  function compressImage(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(u);
        var max = 1280, q = 0.75, tries = 0;
        (function go() {
          var sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
          cv.toBlob(function (b) {
            if (!b) return rej(new Error('Could not read this photo.'));
            if (b.size > 300 * 1024 && tries++ < 5) { if (q > 0.5) q -= 0.1; else max = Math.round(max * 0.8); return go(); }
            b.arrayBuffer().then(function (ab) { res({ bytes: new Uint8Array(ab), mime: 'image/jpeg', w: w, h: h }); });
          }, 'image/jpeg', q);
        })();
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('This photo format cannot be read here. Try JPEG or PNG.')); };
      img.src = u;
    });
  }
  var MAX_DOC = 512 * 1024, VIDEO_MAX_S = 20, VIDEO_BUDGET = 900 * 1024;
  function isVideo(file) { return /^video\//i.test(file.type || '') || /\.(mp4|m4v|mov|webm|3gp|mkv)$/i.test(file.name || ''); }
  /** Best format this browser can record: MP4/H.264 plays almost everywhere; WebM is the fallback. */
  function videoMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    var c = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < c.length; i++) if (MediaRecorder.isTypeSupported(c[i])) return c[i];
    return '';
  }
  /**
   * Re-encode a video clip on the device to a short, small file: long side 480 px, about 24 fps,
   * bitrate chosen so the first VIDEO_MAX_S seconds fit in about 900 KB. Plays the clip into a canvas
   * (silently) and records it with MediaRecorder, so it takes as long as the clip itself.
   * onProgress(fraction). Resolves { bytes, mime, w, h, dur, cut }.
   */
  function compressVideo(file, onProgress) {
    return new Promise(function (res, rej) {
      var mime = videoMime(); if (!mime || !HTMLCanvasElement.prototype.captureStream) return rej(new Error('This browser cannot compress video. Update Chrome or Safari, or send a clip under ' + Math.round(C.fleet.MAX_FILE / 1024) + ' KB.'));
      var u = URL.createObjectURL(file), v = document.createElement('video'), done = false, ac = null, timer = null;
      v.playsInline = true; v.preload = 'auto'; v.muted = false; v.src = u;
      function fin(err, out) {
        if (done) return; done = true; clearInterval(timer);
        try { v.pause(); } catch (e) {} v.removeAttribute('src'); try { v.load(); } catch (e) {} URL.revokeObjectURL(u);
        if (ac) ac.close().catch(function () {});
        err ? rej(err) : res(out);
      }
      v.onerror = function () { fin(new Error('This video format cannot be read on this phone. Try recording with the camera button.')); };
      v.onloadedmetadata = function () {
        var vw = v.videoWidth, vh = v.videoHeight, dur = isFinite(v.duration) ? v.duration : VIDEO_MAX_S;
        if (!vw || !vh) return fin(new Error('This video has no picture that can be read here.'));
        var len = Math.min(dur, VIDEO_MAX_S), sc = Math.min(1, 480 / Math.max(vw, vh));
        var w = Math.max(2, Math.round(vw * sc / 2) * 2), h = Math.max(2, Math.round(vh * sc / 2) * 2);
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var cx = cv.getContext('2d');
        var stream = cv.captureStream(24), aBits = 32000;
        try {
          var AC = window.AudioContext || window.webkitAudioContext; ac = new AC();
          var src = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination(); src.connect(dst);
          dst.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
          if (ac.state === 'suspended') ac.resume().catch(function () {});
        } catch (e) { ac = null; v.muted = true; aBits = 0; }
        var vBits = Math.max(120000, Math.min(500000, Math.floor(VIDEO_BUDGET * 8 / Math.max(len, 1) * 0.92) - aBits));
        var rec, chunks = [];
        try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vBits, audioBitsPerSecond: aBits || undefined }); }
        catch (e) { return fin(new Error('This browser cannot compress video (' + e.message + ').')); }
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          var b = new Blob(chunks, { type: mime.split(';')[0] });
          b.arrayBuffer().then(function (ab) { fin(null, { bytes: new Uint8Array(ab), mime: mime.split(';')[0], w: w, h: h, dur: Math.round(Math.min(v.currentTime || len, len)), cut: dur > VIDEO_MAX_S + 0.5 }); });
        };
        function draw() { try { cx.drawImage(v, 0, 0, w, h); } catch (e) {} }
        function stop() { if (rec.state !== 'inactive') { draw(); rec.stop(); } try { v.pause(); } catch (e) {} }
        v.onended = stop;
        v.onplaying = function () {
          if (rec.state !== 'inactive') return;
          rec.start(1000);
          /* a timer, not requestAnimationFrame, so it keeps drawing if the screen dims */
          timer = setInterval(function () {
            draw(); if (onProgress) onProgress(Math.min(1, v.currentTime / len));
            if (v.currentTime >= len) stop();
          }, 1000 / 24);
        };
        draw();
        var pp = v.play(); if (pp && pp.catch) pp.catch(function () { v.muted = true; v.play().catch(function (e) { fin(new Error('Could not play the video to compress it (' + e.message + ').')); }); });
      };
      setTimeout(function () { if (!done && !v.videoWidth) fin(new Error('This video could not be opened.')); }, 15000);
    });
  }
  /** Send a picked file, photo or video to the current chat (group or a private chat). onPrep(fraction) while a video is compressed. */
  function sendAttachment(to, file, caption, onProgress, onPrep) {
    if (!st.client) return Promise.reject(new Error('Join a group first.'));
    var isImg = /^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '');
    var base = (file.name || 'file').replace(/\.[^.]+$/, ''), vid = isVideo(file);
    var prep = vid ? compressVideo(file, onPrep).then(function (r) { r.name = (base === 'file' ? 'video' : base) + (/mp4/.test(r.mime) ? '.mp4' : '.webm'); return r; }, function (er) {
          /* could not re-encode: a clip that is already small enough still goes as it is */
          if (file.size && file.size <= C.fleet.MAX_FILE) return file.arrayBuffer().then(function (ab) { return { bytes: new Uint8Array(ab), mime: file.type || 'video/mp4', name: file.name || 'video.mp4' }; });
          throw er;
        })
      : isImg && !/gif$/i.test(file.type) ? compressImage(file).then(function (r) { r.name = base + '.jpg'; return r; })
      : file.arrayBuffer().then(function (ab) { return { bytes: new Uint8Array(ab), mime: file.type || 'application/octet-stream', name: file.name || 'file' }; });
    return prep.then(function (r) {
      var lim = vid ? C.fleet.MAX_FILE : MAX_DOC;
      if (r.bytes.length > lim) throw new Error((vid ? 'The video is still too large after compression: ' : 'File too large: ') + Math.round(r.bytes.length / 1024) + ' KB. The limit is ' + Math.round(lim / 1024) + ' KB' + (vid ? '. Record a shorter clip (up to ' + VIDEO_MAX_S + ' seconds).' : ' (photos and videos are compressed automatically).'));
      var fid = Array.prototype.map.call(window.MeikoNostrCrypto.randomBytes(8), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      var m = me();
      return putFile(st.client.pubkey + ':' + fid, { bytes: r.bytes, name: r.name, mime: r.mime, at: Date.now() }).catch(function () {}).then(function () {
        return st.client.sendFile(to, r.bytes, { fid: fid, name: r.name, mime: r.mime, w: r.w, h: r.h }, caption, { name: m.name, callsign: m.callsign, v: m.v }, onProgress);
      }).then(function (out) { out.cut = !!r.cut; out.kb = Math.round(r.bytes.length / 1024); return out; });
    });
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
        if (p.me || blocked(p.from)) return;
        if (p.k === 'bye') { if (st.peers[p.from]) { st.peers[p.from].left = true; st.peers[p.from].at = p.at; } emit('peers'); return; }
        var old = st.peers[p.from] || {};
        st.peers[p.from] = { id: p.from, name: p.name, callsign: p.callsign, vessel: p.vessel, ns: p.ns, pos: p.pos || (old.pos && Date.now() - old.pos.seen < 2 * 3600 * 1000 ? old.pos : null), at: Math.max(p.at, old.at || 0), left: false };
        if (p.pos) st.peers[p.from].pos.seen = p.at;
        emit('peers');
      },
      onChat: function (m) {
        if (blocked(m.from) || (!m.me && st.chat.every(function (x) { return x.id !== m.id; }) && flooding(m.from, m.at)) || !addChat(m)) return;
        emit('chat');
        if (!m.me && groupOn() && Date.now() - m.at < 120000 && !document.querySelector('[data-fleet-page]')) ui.toast('💬 ' + m.name + ': ' + m.text.slice(0, 60));
      },
      onFile: onFile,
      onFileProgress: function (p) { st.prog[(p.from) + ':' + p.fid] = p.got / p.n; emit('prog'); },
      onDM: function (m) {
        if (!st.tag || (!m.me && (blocked(m.peer) || ((st.dm[m.peer] || []).every(function (x) { return x.id !== m.id; }) && flooding(m.peer, m.at)))) || !addDM(m)) return;
        emit('dm');
        if (!m.me && Date.now() - m.at < 120000 && !(st.view === m.peer && document.querySelector('[data-fleet-page]'))) ui.toast('🔒 ' + peerName(m.peer) + ': ' + m.text.slice(0, 60));
      }
    });
    st.client = client; st.since = Date.now();
    return client.start().then(function (tag) {
      if (st.client !== client) return;
      st.tag = tag; st.joining = false; st.code = code;
      if (window.indexedDB) db().catch(function () {}); // opens the file store and drops files older than 3 days
      st.chat = (MEIKO.storage.get(chatKey(), []) || []).filter(function (m) { return m && m.id && typeof m.text === 'string'; });
      loadDM();
      if (code === PUB) saveCfg({ joined: false, publicOff: false }); else saveCfg({ code: code, joined: true });
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
    var was = st.code;
    st.client = null; st.tag = null; st.code = null; st.peers = {}; st.chat = []; st.dm = {}; st.dmName = {}; st.unread = {}; st.view = 'group'; st.status = { relays: 0, connected: 0 };
    if (MEIKO.gps && MEIKO.gps.offFix) MEIKO.gps.offFix(onFix);
    gpsOff();
    if (!silent) { saveCfg(was === PUB ? { publicOff: true } : { joined: false }); emit('all'); }
  }
  function setShare(on) {
    saveCfg({ share: !!on, shareAsked: true });
    if (on) ensureGps(); else gpsOff(); // stop the GPS again when sharing is switched off (saves battery)
    beat(); emit('status');
  }
  function sendChat(text) {
    text = String(text || '').trim(); if (!text || !st.client || !groupOn()) return Promise.resolve(null);
    var m = me();
    return st.client.sendChat(text, { name: m.name, callsign: m.callsign, v: m.v });
  }
  function sendDM(peer, text) {
    text = String(text || '').trim(); if (!text || !st.client) return Promise.resolve(null);
    var m = me();
    return st.client.sendDM(peer, text, { name: m.name, callsign: m.callsign });
  }
  function peersSorted() {
    return Object.keys(st.peers).filter(function (k) { return !blocked(k); }).map(function (k) { return st.peers[k]; }).sort(function (a, b) { return b.at - a.at; });
  }
  /** Signed in and past the welcome / consent screens. */
  function gateOpen() {
    if (document.body.classList.contains('onb-open')) return false;
    return !(MEIKO.onboarding && MEIKO.onboarding.required() && !(MEIKO.auth && MEIKO.auth.isComplete()));
  }
  /**
   * Join automatically once the user is signed in: their private group if they are in one, else the public fleet
   * (unless they chose to go offline). Sharing resumes only if it was switched on.
   */
  function autoStart() {
    if (!supported()) return;
    if (!gateOpen()) { if (st.client && MEIKO.onboarding && MEIKO.onboarding.required() && !MEIKO.auth.isComplete()) leave(true); return; }
    if (!st.client) {
      if (st.joining || navigator.onLine === false) return;
      var c = cfg();
      if (c.joined && c.code) join(c.code).catch(function () {});
      else if (!c.publicOff) join(PUB).catch(function () {});
      return;
    }
    if (!cfg().shareAsked) shareNotice();
  }
  /**
   * Position sharing is on by default in the public fleet (Meiko's decision, 2026-11-24), covered by the updated
   * Privacy Policy. The first time, say so clearly and offer a one-tap way to hide the position.
   */
  function shareNotice() {
    if (st.noticing || document.querySelector('.sheet-backdrop')) return;
    st.noticing = true;
    setShare(true);
    ui.sheet({ title: 'Kapal Anda terlihat di peta', html:
      '<p>Semua kapal pengguna MEIKO yang sedang online kini <b>otomatis saling terlihat</b> di Peta dan Fleet &amp; Chat, tanpa kode grup.</p>' +
      '<p>Yang terlihat oleh pengguna lain: <b>posisi, haluan (COG), kecepatan (SOG), nama panggilan, dan avatar kapal</b> Anda, diperbarui tiap 30 detik selama MEIKO terbuka. Email Anda tidak pernah ditampilkan.</p>' +
      '<p class="small muted">Anda bisa menyembunyikan posisi kapan saja di Fleet &amp; Chat → <i>Share my position</i>. Chat pribadi terenkripsi ujung ke ujung. Lihat <a href="privacy.html" target="_blank" rel="noopener">Kebijakan Privasi</a>.</p>' +
      '<div class="actions"><button class="btn btn-primary" data-ok>' + icon('i-check') + 'Mengerti</button><button class="btn btn-ghost" data-hide>Sembunyikan posisi saya</button></div>',
      onMount: function (body, close) {
        ui.$('[data-ok]', body).addEventListener('click', function () { close(); });
        ui.$('[data-hide]', body).addEventListener('click', function () { close(); setShare(false); ui.toast('Posisi Anda disembunyikan. Kapal lain tetap terlihat oleh Anda.'); });
      },
      onClose: function () { st.noticing = false; saveCfg({ shareAsked: true }); } });
  }
  function setGeneral(on) {
    saveCfg({ general: !!on });
    if (on && st.view !== 'group') st.view = 'group';
    emit('all');
  }
  setTimeout(autoStart, 1200);
  setInterval(autoStart, 4000);
  function wake() {
    if (navigator.onLine === false) return;
    if (!st.client) { autoStart(); return; }
    if (st.client.reconnect) st.client.reconnect();
    setTimeout(beat, 3000);
  }
  window.addEventListener('online', wake);
  // Phones close the connections while MEIKO is in the background: reconnect as soon as it is opened again.
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') wake(); });

  MEIKO.fleet = { attachMap: attachMap, isPublic: isPublic, setGeneral: setGeneral, setBlocked: setBlocked, join: join, leave: leave, setShare: setShare, sendChat: sendChat, sendDM: sendDM, sendAttachment: sendAttachment, fileURL: fileURL, state: st, cfg: cfg, subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (x) { return x !== fn; }); }; } };

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
  function nsBadge(p) { var x = p.ns != null && C.fleet.navStatus(p.ns); return x ? '<span class="ns-badge ns-' + x.code + '">' + x.icon + ' ' + esc(x.short) + '</span>' : ''; }
  /** Markers for the other vessels on a MEIKO map controller (Fleet page or the main Map). Tap → onTap(id). */
  function markerLayer(fm, onTap) {
    var markers = {};
    function paint(fit) {
      var L = fm.L, keep = {}, pts = [], added = false;
      peersSorted().forEach(function (p) {
        if (!p.pos) return;
        keep[p.id] = 1;
        var v = vesselOf(p), moving = p.pos.sog == null || p.pos.sog > 0.5, hdg = moving ? p.pos.cog : null;
        var icon = v ? L.divIcon({ className: 'mk vsl-mk' + (online(p) ? '' : ' stale'), html: MEIKO.vessel.markerHTML(v, hdg), iconSize: hdg != null ? [34, 68] : [76, 46], iconAnchor: hdg != null ? [17, 34] : [38, 39] })
          : L.divIcon({ className: 'mk pm-dot fleet-dot' + (online(p) ? '' : ' stale'), iconSize: [16, 16], iconAnchor: [8, 8] });
        var tip = '<b>' + esc(p.name) + '</b> ' + nsBadge(p) + ' · ' + (online(p) ? 'online' : ago(p.pos.seen || p.at)) + '<br>COG ' + deg(p.pos.cog) + ' · SOG ' + kn(p.pos.sog);
        var ll = [p.pos.lat, p.pos.lon]; pts.push(ll);
        if (!markers[p.id]) added = markers[p.id] = L.marker(ll, { icon: icon, keyboard: false, title: p.name }).bindTooltip(tip, { permanent: true, direction: 'top', offset: [0, -10], className: 'pm-label fleet-label', interactive: true })
          .on('click', (function (pid) { return function (e) { L.DomEvent.stop(e); onTap(pid); }; })(p.id)).addTo(fm.map);
        else { markers[p.id].setLatLng(ll).setIcon(icon); markers[p.id].setTooltipContent(tip); }
      });
      Object.keys(markers).forEach(function (k) { if (!keep[k]) { fm.map.removeLayer(markers[k]); delete markers[k]; } });
      if ((fit || added) && fit !== false && pts.length) { var mf = st.fix || (MEIKO.gps && MEIKO.gps.last && MEIKO.gps.last()); if (mf && isFinite(mf.lat)) pts.push([mf.lat, mf.lon]); fm.map.invalidateSize(); if (pts.length > 1) fm.map.fitBounds(pts, { padding: [50, 50], maxZoom: 12 }); else fm.map.setView(pts[0], 10); }
    }
    function clear() { Object.keys(markers).forEach(function (k) { try { fm.map.removeLayer(markers[k]); } catch (e) {} }); markers = {}; }
    return { paint: paint, clear: clear };
  }
  /** Tap a vessel (map icon or list): its data, plus Chat and (optionally) Show on map. */
  function vesselSheet(id, opts) {
    var p = st.peers[id] || (/^[0-9a-f]{64}$/.test(id) ? { id: id, name: peerName(id), at: 0, left: true } : null); if (!p) return;
    var v = vesselOf(p), t = v && MEIKO.vessel.types.filter(function (x) { return x.id === v.type; })[0], rows = [];
    var nsx = p.ns != null && C.fleet.navStatus(p.ns);
    rows.push(['Nav status', nsx ? '<span class="ns-badge ns-' + nsx.code + '">' + nsx.icon + ' ' + esc(nsx.label) + '</span>' : 'Not set']);
    rows.push(['Online', online(p) ? '<span class="dot ok"></span> online' : p.at ? (p.left ? 'left · ' : 'last seen ') + ago(p.at) : 'not seen yet']);
    rows.push(['ID', C.fleet.shortId(id)]);
    if (t) rows.push(['Vessel type', esc(t.label)]);
    if (p.callsign) rows.push(['Call sign', esc(p.callsign)]);
    if (p.pos) {
      rows.push(['Position', esc(ui.coord(p.pos.lat, 'lat')) + '<br>' + esc(ui.coord(p.pos.lon, 'lon'))]);
      rows.push(['COG / SOG', deg(p.pos.cog) + ' · ' + kn(p.pos.sog)]);
      var mf = st.fix || (MEIKO.gps && MEIKO.gps.last && MEIKO.gps.last());
      if (mf && isFinite(mf.lat)) { var g = C.geo.greatCircle(mf.lat, mf.lon, p.pos.lat, p.pos.lon); rows.push(['From you', ui.num(g.distanceNM, g.distanceNM < 10 ? 2 : 1) + ' NM · ' + ui.bearing(g.initialBearing) + ' T']); }
      rows.push(['Position time', ago(p.pos.t || p.pos.seen || p.at)]);
    } else rows.push(['Position', 'Not shared']);
    ui.sheet({ title: p.name, html: '<div class="fleet-sheet">' + (v ? '<div class="fs-art">' + MEIKO.vessel.side(v.type, v) + '</div>' : '') + ui.kv(rows) +
      '<div class="actions"><button class="btn btn-primary" data-chatnow>' + icon('i-chat') + 'Chat' + (st.unread[id] ? ' <span class="badge-n">' + st.unread[id] + '</span>' : '') + '</button>' +
      (p.pos && opts.onMap ? '<button class="btn btn-ghost" data-mapnow>' + icon('i-map') + 'Show on map</button>' : '') + '</div>' +
      '<div class="actions fs-mod"><button class="btn btn-ghost btn-sm" data-block>' + icon('i-x') + 'Block</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + reportURL(id, p.name) + '">' + icon('i-info') + 'Report</a></div>' +
      '<small class="muted">Block hides this vessel and its messages on this phone. Report opens a form for the MEIKO team (needs a GitHub account); include the ID.</small></div>',
      onMount: function (body, close) {
        ui.$('[data-block]', body).addEventListener('click', function () { close(); setBlocked(id, true); ui.toast(p.name + ' blocked'); });
        ui.$('[data-chatnow]', body).addEventListener('click', function () { close(); opts.onChat(id); });
        var m = ui.$('[data-mapnow]', body); if (m) m.addEventListener('click', function () { close(); opts.onMap(p); });
      } });
  }
  function reportURL(id, name) {
    var title = 'Laporan kapal ' + C.fleet.shortId(id), body = 'ID kapal: ' + id + '\nNama yang terlihat: ' + name + '\nApa yang terjadi (tanpa data pribadi Anda):\n';
    return 'https://github.com/aryameiko/meiko/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }
  /** Show the other online vessels on the main Map too. Tap one → its data and Chat (opens Fleet & Chat). */
  function attachMap(ctl) {
    if (!ctl || !ctl.map || !ctl.L) return { destroy: function () {} };
    var lay = markerLayer(ctl, function (id) {
      vesselSheet(id, { onChat: function (pid) { st.view = pid; st.focusChat = true; location.hash = '#/t/fleet'; } });
    });
    /* A small button on the map: how many vessels are online; tap it to zoom to them. */
    var L = ctl.L, btn = null, Ctl = L.Control.extend({ options: { position: 'topright' }, onAdd: function () {
      btn = L.DomUtil.create('button', 'fleet-count'); btn.type = 'button'; btn.hidden = true;
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', function () { lay.paint(true); });
      return btn;
    } });
    var ctrl = new Ctl().addTo(ctl.map);
    function paint() {
      lay.paint(false);
      var n = peersSorted().filter(function (p) { return p.pos && online(p); }).length;
      if (btn) { btn.hidden = !n; btn.innerHTML = icon('i-chat') + n + ' vessel' + (n === 1 ? '' : 's') + ' online'; btn.title = 'Show the other MEIKO vessels online'; }
    }
    paint();
    var off = MEIKO.fleet.subscribe(function (w) { if (w === 'peers' || w === 'all') paint(); });
    var t = setInterval(paint, 20000);
    return { destroy: function () { off(); clearInterval(t); lay.clear(); try { ctrl.remove(); } catch (e) {} } };
  }
  function kn(v) { return v == null ? '—' : ui.num(v, 1) + ' kn'; }
  function deg(v) { return v == null ? '—' : ui.bearing(v) + ' T'; }

  MEIKO.features.register({
    id: 'fleet', cat: 'navigation', order: 4, icon: 'i-chat', title: 'Fleet & Chat',
    desc: 'See other MEIKO vessels online and chat with them', keywords: 'chat fleet group armada kapal lain posisi teman pesan message',
    lead: 'See the other MEIKO vessels that are online on the map and chat with them privately. No code needed. Only your nickname and vessel are shown, never your email.',
    render: function (view) {
      var c = cfg();
      var setup = '<div class="card card-pad form-gap" data-setup>' +
        '<div data-pubjoin-box><p class="small">You are not in the public fleet. Join it to see all MEIKO vessels that are online.</p><div class="actions"><button type="button" class="btn btn-primary" data-pubjoin>' + icon('i-check') + 'Join the public fleet</button></div></div>' +
        '<div class="card-title" data-setup-title>' + icon('i-lock') + 'Private group (optional)</div>' +
        '<p class="small muted">Only vessels that enter the same code see each other there; you leave the public fleet while you are in a group.</p>' +
        '<label class="field"><span>Your name on the map</span><input data-name maxlength="40" placeholder="' + esc(me().name) + '" value="' + esc(c.name || '') + '"></label>' +
        '<label class="field"><span>Group code</span><input data-code autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="e.g. MEIKO-7KQP-29XD" value="' + esc(c.code || '') + '"><small class="hint">Everyone who uses the same code is in the same group. Treat it like a password.</small></label>' +
        '<div class="actions"><button type="button" class="btn btn-primary" data-join>' + icon('i-check') + 'Join group</button><button type="button" class="btn btn-ghost" data-new>' + icon('i-plus') + 'New code</button></div>' +
        '<div data-offline-note></div></div>';
      var live = '<div class="card card-pad form-gap fleet-live" data-live hidden>' +
        '<div class="fleet-head"><div><div class="label" data-codelabel>Group</div><b class="fleet-code" data-codeview></b></div><button type="button" class="btn btn-ghost btn-sm" data-share-code>' + icon('i-copy') + 'Share code</button></div>' +
        '<div class="fleet-status" data-status></div>' +
        '<label class="fleet-switch"><input type="checkbox" data-share> <span><b>Share my position</b><small data-share-hint></small></span></label>' +
        '<label class="field"><span>My status</span><select data-ns><option value="">— not set —</option>' + C.fleet.NAV_STATUS.map(function (x) { return '<option value="' + x.code + '">' + x.icon + '  ' + esc(x.label) + '</option>'; }).join('') + '</select><small class="hint">Shown next to your vessel, like AIS.</small></label>' +
        '<div data-ns-suggest></div>' +
        '<div class="port-map-wrap"><div class="map-box port-map fleet-map" data-fmap></div></div>' +
        '<div data-peers></div>' +
        '<div class="fleet-chat"><div class="label">Chat</div><div class="chat-tabs" data-tabs role="tablist"></div><div data-dmhead></div><div class="chat-list" data-chat aria-live="polite"></div>' +
        '<div class="send-prog small muted" data-sendprog hidden></div>' +
        '<form class="chat-form" data-chatform><button type="button" class="btn btn-ghost att-btn" data-attach aria-label="Send a photo or file">' + icon('i-clip') + '</button>' +
        '<input type="file" accept="image/*" capture="environment" data-pick="camera" hidden><input type="file" accept="image/*" data-pick="gallery" hidden><input type="file" accept="video/*" capture="environment" data-pick="vcam" hidden><input type="file" accept="video/*" data-pick="vgallery" hidden><input type="file" data-pick="file" hidden>' +
        '<input class="input" data-msg maxlength="500" placeholder="Type a message" autocomplete="off" enterkeyhint="send"><button class="btn btn-primary" type="submit">Send</button></form></div>' +
        '<div class="actions"><button type="button" class="btn btn-ghost" data-leave>' + icon('i-x') + '<span data-leave-label>Leave group</span></button></div></div>';
      view.innerHTML = ui.pageHead(this) + '<div data-fleet-page class="fleet-page">' + live + setup +
        ui.notice('warn', '<b>Not a safety system.</b> Fleet & Chat needs internet on both sides and uses free public relays that can be slow or down. For distress and collision avoidance use VHF (Ch 16 / DSC) and AIS.') +
        ui.help('How it works and privacy', '<p><b>Public fleet.</b> Everyone signed in to MEIKO joins it automatically, so vessels that are online see each other without a code. Anyone using MEIKO can see the nickname, vessel and (only if you share it) position of the vessels in it. Your position is shared by default; switch <b>Share my position</b> off to hide it. <b>General Group</b> is one chat room for everyone, no code: join it under Chat. It is not private and not moderated; tap a name to <b>Block</b> or <b>Report</b> a vessel.</p>' +
          '<p>MEIKO has no server of its own. Messages travel through free public <b>Nostr relays</b>, encrypted, so the relays see only scrambled data. In a <b>private group</b> the key is made from the group code: anyone who knows the code can read the group, so share it only with people you trust. The public fleet\'s key is public by design.</p>' +
          '<p>Your position is sent only while <b>Share my position</b> is on, every 30 seconds, and only while MEIKO is open. Phones pause web apps in the background, so others may see you as offline. <b>Private chat</b>: tap a vessel on the map or in the list, then <b>Chat</b>. No extra code is needed. It is encrypted a second time with a key only your device and theirs can compute, so nobody else, including other vessels in the fleet, can read it. For very sensitive information you can optionally compare the number under <i>Verify</i> by VHF or phone. Relays and group members can still see <i>that</i> you sent a private message and when, but not to whom or what it says. Anyone who gets hold of an unlocked phone can read its messages.</p><p>Positions are not stored by the relays; recent chat (up to 2 days) is, so people who join later can read it. The last 100 messages are also kept on this device.</p><p><b>Photos and files</b> (the paperclip) are encrypted like messages (private ones end-to-end) and sent in small parts of 16 KB, because public relays refuse large messages. Photos are compressed to about 300 KB; other files can be up to 512 KB. A 300 KB photo takes about 20 parts and roughly 6–10 seconds; keep MEIKO open until it says sent. Some relays limit how fast you may send, so a large file can arrive incomplete. Received files are kept in this browser\'s storage for 3 days.</p>' +
          '<p>Vessels show as online if they sent something in the last 3 minutes; otherwise you see when they were last seen.</p>' +
          '<p><button type="button" class="btn btn-ghost btn-sm" data-unblock>Unblock all vessels</button></p>' +
          '<label class="field"><span>Relays (advanced)</span><textarea data-relays rows="3" placeholder="' + esc(C.fleet.DEFAULT_RELAYS.join('\n')) + '">' + esc(c.relays || '') + '</textarea><small class="hint">Leave empty for the defaults. One wss:// address per line. Everyone in a group needs at least one relay in common.</small></label>') + '</div>';

      var $ = function (s) { return ui.$(s, view); };
      var fm = null, lay = null;
      function alive() { return document.body.contains(view) && $('[data-fleet-page]'); }
      function paintMode() {
        var joined = !!st.client;
        var pub = isPublic();
        $('[data-setup]').hidden = joined && !pub; $('[data-live]').hidden = !joined;
        $('[data-pubjoin-box]').hidden = joined || st.joining;
        $('[data-offline-note]').innerHTML = navigator.onLine === false ? ui.notice('warn', 'You are offline. Fleet & Chat needs an internet connection.', 'i-wifi-off') : '';
        if (joined) {
          $('[data-codelabel]').textContent = pub ? 'Fleet' : 'Private group';
          $('[data-codeview]').textContent = pub ? 'All MEIKO vessels online' : st.code;
          $('[data-share-code]').hidden = pub;
          $('[data-leave-label]').textContent = pub ? 'Go offline (leave the public fleet)' : cfg().publicOff ? 'Leave group' : 'Leave group (back to the public fleet)';
          initMap();
        }
        paintStatus(); paintPeers(); paintChat();
      }
      function paintStatus() {
        if (!st.client) return;
        var s = st.status, n = peersSorted().filter(online).length, sh = cfg().share;
        $('[data-status]').innerHTML = '<span class="dot ' + (s.connected ? 'ok' : 'bad') + '"></span>' +
          (st.joining ? 'Connecting…' : s.connected ? 'Connected (' + s.connected + '/' + s.relays + ' relays)' : navigator.onLine === false ? 'Offline: waiting for internet' : 'Connecting to relays…') +
          ' · ' + n + ' other vessel' + (n === 1 ? '' : 's') + ' online' + (!s.connected && !st.joining && navigator.onLine !== false && st.since && Date.now() - st.since > 20000 ? '<br><small>No relay answers. Some mobile networks or Wi-Fi block them; try another network.</small>' : '');
        $('[data-share]').checked = sh;
        var nsSel = $('[data-ns]'), cns = cfg().ns; if (document.activeElement !== nsSel) nsSel.value = cns == null ? '' : String(cns);
        var sug = '', cs = st.fix && sh ? cogSog() : null;
        if (cs) {
          var still = cs.sog != null ? cs.sog < 0.5 && st.slowSince && Date.now() - st.slowSince > 5 * 60 * 1000 : st.lastMove && Date.now() - st.lastMove > 5 * 60 * 1000;
          if (still && (cns == null || cns === 0 || cns === 8)) sug = '<div class="ns-sug">You have not moved for a while. Set status to <button type="button" class="chip" data-setns="1">⚓ At anchor</button> <button type="button" class="chip" data-setns="5">⛓ Moored</button></div>';
          else if (cs.sog != null && cs.sog > 2 && (cns === 1 || cns === 5 || cns === 6)) sug = '<div class="ns-sug">You are moving (' + kn(cs.sog) + '). Set status to <button type="button" class="chip" data-setns="0">▶ Under way</button> <button type="button" class="chip" data-setns="8">⛵ Sailing</button></div>';
        }
        $('[data-ns-suggest]').innerHTML = sug;
        var who = isPublic() ? 'All MEIKO users online' : 'Others in this group';
        $('[data-share-hint]').textContent = sh ? (st.fix ? 'On. ' + who + ' see your position, COG and SOG.' : 'On. Waiting for a GPS fix…') : 'Off. Others see your name only, not where you are. Your vessel is not on their map.';
      }
      function peerRow(p) {
        var dist = '';
        if (p.pos && st.fix) { var g = C.geo.greatCircle(st.fix.lat, st.fix.lon, p.pos.lat, p.pos.lon); dist = ui.num(g.distanceNM, g.distanceNM < 10 ? 2 : 1) + ' NM · ' + ui.bearing(g.initialBearing) + ' T'; }
        return '<div class="fleet-peer' + (online(p) ? '' : ' off') + '"><button type="button" class="fp-btn" data-peer="' + esc(p.id) + '">' +
          '<span class="dot ' + (online(p) ? 'ok' : '') + '"></span><span class="fp-main"><b>' + esc(p.name) + ' ' + nsBadge(p) + (p.callsign ? ' <small>' + esc(p.callsign) + '</small>' : '') + '</b>' +
          '<small>' + (p.pos ? 'COG ' + deg(p.pos.cog) + ' · SOG ' + kn(p.pos.sog) + (dist ? ' · ' + dist : '') : 'Position not shared') + '</small></span>' +
          '<small class="fp-seen">' + (p.left ? 'left · ' : '') + (online(p) ? 'online' : ago(p.at)) + '<br><span class="fp-id">ID ' + C.fleet.shortId(p.id) + '</span></small></button>' +
          '<button type="button" class="btn btn-ghost btn-sm fp-dm" data-dm="' + esc(p.id) + '" aria-label="Chat with ' + esc(p.name) + '">' + icon('i-chat') + 'Chat' + (st.unread[p.id] ? ' <span class="badge-n">' + st.unread[p.id] + '</span>' : '') + '</button></div>';
      }
      function paintPeers() {
        if (!st.client) return;
        var list = peersSorted();
        $('[data-peers]').innerHTML = list.length ? '<div class="label">' + (isPublic() ? 'Vessels' : 'Vessels in this group') + '</div><div class="fleet-peers">' + list.map(peerRow).join('') + '</div>' :
          '<p class="small muted">' + (isPublic() ? 'No other vessels online right now. A vessel appears here as soon as someone else opens MEIKO; it is on the map when they share their position.' : 'No other vessels yet. Share the group code; they appear here as soon as they join.') + '</p>';
        paintMarkers();
      }
      function paintTabs() {
        var ids = Object.keys(st.dm).filter(function (k) { return st.dm[k].length; });
        if (st.view !== 'group' && ids.indexOf(st.view) < 0) ids.push(st.view);
        ids.sort(function (a, b) { var la = st.dm[a] && st.dm[a].length ? st.dm[a][st.dm[a].length - 1].at : Date.now(), lb = st.dm[b] && st.dm[b].length ? st.dm[b][st.dm[b].length - 1].at : Date.now(); return lb - la; });
        ids = ids.filter(function (id) { return !blocked(id); });
        $('[data-tabs]').innerHTML = '<button type="button" role="tab" class="chat-tab' + (st.view === 'group' ? ' on' : '') + '" data-tab="group">' + (isPublic() ? 'General Group' : 'Group') + '</button>' + ids.map(function (id) {
          return '<button type="button" role="tab" class="chat-tab' + (st.view === id ? ' on' : '') + '" data-tab="' + esc(id) + '">' + icon('i-lock') + esc(peerName(id)) + (st.unread[id] ? ' <span class="badge-n">' + st.unread[id] + '</span>' : '') + '</button>';
        }).join('');
      }
      function attHTML(m) {
        var a = m.att; if (!a || !m.from) return '';
        var key = m.from + ':' + a.fid, pr = st.prog[key], mt = safeMime(a.mime), img = /^image\//.test(mt), vid = /^video\//.test(mt), med = img || vid;
        var ratio = med && a.w && a.h ? ' style="aspect-ratio:' + a.w + '/' + a.h + '"' : '';
        return '<div class="att' + (img ? ' att-img' : vid ? ' att-img att-vid' : ' att-file') + '" data-att="' + esc(key) + '" data-name="' + esc(a.name) + '" data-mime="' + esc(mt) + '"' + ratio + '>' +
          (vid ? '<span class="att-vlabel">' + icon('i-video') + Math.max(1, Math.round(a.size / 1024)) + ' KB</span>' : img ? '' : icon('i-file') + '<span><b>' + esc(a.name) + '</b><small>' + Math.max(1, Math.round(a.size / 1024)) + ' KB</small></span>') +
          '<small class="att-state">' + (pr != null ? 'Receiving… ' + Math.round(pr * 100) + '%' : 'Loading…') + '</small></div>';
      }
      function msgHTML(m, showName) {
        return '<div class="msg' + (m.me ? ' me' : '') + '"><div class="msg-meta">' + (m.me ? 'You' : (m.from ? '<button type="button" class="msg-who" data-who="' + esc(m.from) + '">' + esc(m.name) + '</button>' : esc(m.name)) + (showName && m.from ? ' · ID ' + C.fleet.shortId(m.from) : '')) + ' · ' + esc(ui.time(m.at)) + (Date.now() - m.at > 86400000 ? ' · ' + esc(ui.date(m.at)) : '') + '</div>' + attHTML(m) + (m.text ? '<div class="msg-text">' + esc(m.text) + '</div>' : '') + '</div>';
      }
      function hydrate() {
        ui.$$('[data-att]', view).forEach(function (el) {
          if (el.dataset.ready) return;
          MEIKO.fleet.fileURL(el.dataset.att).then(function (f) {
            if (!f) { var p = st.prog[el.dataset.att]; el.querySelector('.att-state').textContent = p != null ? 'Receiving… ' + Math.round(p * 100) + '%' : 'Waiting for the file… (needs the sender or a relay that kept it)'; return; }
            el.dataset.ready = '1';
            var md = /^(image|video)\//.test(el.dataset.mime);
            if (/^image\//.test(el.dataset.mime)) { el.innerHTML = '<img alt="' + esc(el.dataset.name) + '" src="' + f.url + '">'; el.querySelector('img').addEventListener('load', function () { var box = $('[data-chat]'); if (box.dataset.stick) box.scrollTop = box.scrollHeight; }); }
            else if (/^video\//.test(el.dataset.mime)) el.innerHTML = '<video controls playsinline preload="metadata" src="' + f.url + '#t=0.1" aria-label="' + esc(el.dataset.name) + '"></video>';
            el.insertAdjacentHTML('beforeend', '<a class="att-dl" href="' + f.url + '" download="' + esc(el.dataset.name) + '">' + icon('i-download') + (md ? '' : 'Save') + '</a>');
            var st0 = el.querySelector('.att-state'); if (st0) st0.remove();
          });
        });
      }
      function paintChat() {
        if (!st.client) return;
        paintTabs();
        var box = $('[data-chat]'), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40, list, dm = st.view !== 'group';
        if (dm) {
          if (st.unread[st.view]) { delete st.unread[st.view]; saveDM(); paintTabs(); paintPeers(); }
          var myPub = st.client.pubkey, code = C.fleet.safetyCode(window.MeikoNostrCrypto, myPub, st.view);
          $('[data-dmhead]').innerHTML = '<div class="dm-head">' + icon('i-lock') + '<div><b>Chat with ' + esc(peerName(st.view)) + '</b>' +
            '<small>Private: only you and ' + esc(peerName(st.view)) + ' can read it.</small>' +
            '<details><summary>Verify (optional)</summary><small>For very sensitive information you can check that you are talking to the right device: both phones show the same number <b class="sc">' + code + '</b> (ID ' + C.fleet.shortId(st.view) + '). Compare it by VHF or phone.</small></details></div></div>';
          list = st.dm[st.view] || [];
          $('[data-msg]').placeholder = 'Private message to ' + peerName(st.view);
        } else {
          list = st.chat.filter(function (m) { return !blocked(m.from); });
          $('[data-msg]').placeholder = isPublic() ? 'Message to everyone in General Group' : 'Message to the whole group';
          $('[data-dmhead]').innerHTML = isPublic() && cfg().general ? '<div class="dm-head gen-head">' + icon('i-chat') + '<div><b>General Group</b><small>Open to every MEIKO user, no code. Not private and not moderated: be polite, and tap a name to block or report a vessel.</small> <button type="button" class="btn btn-ghost btn-sm" data-genleave>Leave General Group</button></div></div>' : '';
        }
        var noGroup = !dm && !groupOn();
        $('[data-chatform]').hidden = noGroup;
        box.classList.toggle('dm', dm);
        if (noGroup) { box.innerHTML = '<div class="gen-join"><p><b>General Group</b>: one chat room for every MEIKO user, no code needed. Anyone online can read what is written there.</p><p class="small muted">For a private chat, tap a vessel on the map or in the list, then <b>Chat</b>.</p><button type="button" class="btn btn-primary" data-genjoin>' + icon('i-check') + 'Join General Group</button></div>'; return; }
        box.innerHTML = list.length ? list.map(function (m) { return msgHTML(m, !dm); }).join('') : '<p class="small muted">' + (dm ? 'No private messages yet.' : 'No messages yet.') + '</p>';
        if (atBottom || list.length && list[list.length - 1].me) { box.scrollTop = box.scrollHeight; box.dataset.stick = '1'; } else delete box.dataset.stick;
        hydrate();
      }
      function openDM(id) { st.view = id; paintChat(); $('[data-msg]').focus({ preventScroll: true }); $('.fleet-chat').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      function initMap() {
        if (fm || !MEIKO.map || !window.L) return;
        var f = st.fix || (MEIKO.gps && MEIKO.gps.last && MEIKO.gps.last());
        fm = MEIKO.map.create($('[data-fmap]'), { markers: false, noRemember: true, center: f ? [f.lat, f.lon] : [-2.5, 118], zoom: f ? 9 : 4 });
        if (fm) { lay = markerLayer(fm, tapVessel); paintMarkers(true); }
      }
      function paintMarkers(fit) { if (lay) lay.paint(fit); }

      var unsub = MEIKO.fleet.subscribe(function (what) {
        if (!alive()) { unsub(); return; }
        if (what === 'all') return paintMode();
        if (what === 'status') { paintStatus(); return; }
        if (what === 'peers') { paintPeers(); paintStatus(); return; }
        if (what === 'chat' || what === 'file') paintChat();
        if (what === 'prog') ui.$$('[data-att]:not([data-ready])', view).forEach(function (el) { var p = st.prog[el.dataset.att], s0 = el.querySelector('.att-state'); if (p != null && s0) s0.textContent = 'Receiving… ' + Math.round(p * 100) + '%'; });
        if (what === 'dm') { paintChat(); paintPeers(); }
      });
      var tick = setInterval(function () { if (!alive()) { clearInterval(tick); return; } paintPeers(); paintStatus(); }, 20000);

      view.addEventListener('click', function (e) {
        if (e.target.closest('[data-genjoin]')) { setGeneral(true); return; }
        if (e.target.closest('[data-unblock]')) { saveCfg({ blocked: [] }); ui.toast('All vessels unblocked'); return; }
        if (e.target.closest('[data-genleave]')) { setGeneral(false); return; }
        var w = e.target.closest('[data-who]'); if (w) tapVessel(w.dataset.who);
      });
      $('[data-pubjoin]').addEventListener('click', function () { saveCfg({ publicOff: false, joined: false }); join(PUB).catch(function (er) { ui.toast(er.message); }); });
      $('[data-new]').addEventListener('click', function () { $('[data-code]').value = C.fleet.newCode(window.MeikoNostrCrypto.randomBytes); });
      $('[data-name]').addEventListener('input', function (e) { saveCfg({ name: e.target.value.trim() }); });
      $('[data-relays]').addEventListener('change', function (e) { saveCfg({ relays: e.target.value.trim() }); if (st.client) join(cfg().code).catch(function (er) { ui.toast(er.message); }); });
      $('[data-join]').addEventListener('click', function () {
        if (!supported()) { ui.toast('This browser cannot run Fleet & Chat.'); return; }
        var btn = this; btn.disabled = true;
        join($('[data-code]').value).then(function () { btn.disabled = false; }, function (e) { btn.disabled = false; ui.toast(e.message); });
      });
      $('[data-leave]').addEventListener('click', function () { if (fm) { try { fm.map.remove(); } catch (e) {} } fm = null; lay = null; leave(); });
      $('[data-ns]').addEventListener('change', function (e) { setNS(e.target.value === '' ? null : +e.target.value); });
      view.addEventListener('click', function (e) { var b = e.target.closest('[data-setns]'); if (b) { setNS(+b.dataset.setns); st.slowSince = 0; st.lastMove = Date.now(); } });
      function setNS(v) { saveCfg({ ns: v }); beat(); paintStatus(); var x = v != null && C.fleet.navStatus(v); ui.toast(x ? 'Status: ' + x.label : 'Status cleared'); }
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
      /* ---- attachments: camera / gallery / document, with permission guidance ---- */
      function permHelp(what) {
        return '<p>Your browser blocked access to the ' + what + ' for MEIKO. To allow it:</p><ul class="small">' +
          '<li><b>Android (Chrome):</b> tap the icon left of the address bar → Permissions → ' + (what === 'camera' ? 'Camera' : 'Files and media') + ' → Allow. If MEIKO is installed, also check Android Settings → Apps → Chrome → Permissions.</li>' +
          '<li><b>iPhone / iPad (Safari):</b> Settings → Safari → ' + (what === 'camera' ? 'Camera' : 'Photos') + ' → Ask or Allow, and Settings → Privacy & Security → ' + (what === 'camera' ? 'Camera' : 'Photos') + '.</li></ul>';
      }
      function pick(kind) {
        var inp = $('[data-pick="' + kind + '"]');
        if ((kind === 'camera' || kind === 'vcam') && navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'camera' }).then(function (r) {
            if (r.state === 'denied') ui.sheet({ title: 'Camera blocked', html: permHelp('camera') + '<div class="actions"><button class="btn btn-ghost" data-close>OK</button></div>' });
            else inp.click();
          }, function () { inp.click(); });
          return;
        }
        inp.click();
      }
      $('[data-attach]').addEventListener('click', function () {
        if (!st.client) return;
        var where = st.view === 'group' ? 'everyone in this group' : peerName(st.view) + ' only (private, end-to-end encrypted)';
        ui.sheet({ title: 'Send a photo, video or file', html:
          '<p class="small muted">To: <b>' + esc(where) + '</b>. Your phone may ask for permission to use the camera or your files. Choose <b>Allow</b>; MEIKO only reads the photo, video or file you pick.</p>' +
          '<div class="att-pick"><button class="btn btn-primary" data-k="camera">' + icon('i-camera') + 'Take photo</button><button class="btn btn-primary" data-k="vcam">' + icon('i-video') + 'Record video</button><button class="btn btn-ghost" data-k="gallery">' + icon('i-image') + 'Photo from gallery</button><button class="btn btn-ghost" data-k="vgallery">' + icon('i-video') + 'Video from gallery</button><button class="btn btn-ghost" data-k="file">' + icon('i-file') + 'Document / file</button></div>' +
          '<p class="small muted mt-12">Photos are compressed to about 300 KB. Videos are cut to the first ' + VIDEO_MAX_S + ' seconds and compressed on this phone to under 1 MB (480p); compressing takes as long as the clip. Other files: up to ' + Math.round(MAX_DOC / 1024) + ' KB. Text typed in the message box is sent as the caption.</p>',
          onMount: function (body, close) { ui.$$('[data-k]', body).forEach(function (b) { b.addEventListener('click', function () { close(); pick(b.dataset.k); }); }); } });
      });
      ui.$$('[data-pick]', view).forEach(function (inp) {
        inp.addEventListener('change', function () {
          var f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
          var to = st.view, msg = $('[data-msg]'), cap = msg.value.trim(), pr = $('[data-sendprog]'), att = $('[data-attach]');
          pr.hidden = false; pr.textContent = 'Preparing ' + (f.name || 'file') + '…'; att.disabled = true;
          sendAttachment(to, f, cap, function (i, n) { pr.textContent = 'Sending… ' + Math.round(i / n * 100) + '% (' + i + '/' + n + ' parts). Keep MEIKO open.'; },
            function (x) { pr.textContent = 'Compressing video… ' + Math.round(x * 100) + '%. Keep MEIKO open.'; })
            .then(function (r) { msg.value = ''; pr.hidden = true; att.disabled = false; if (!r.sent) ui.toast('Not connected to any relay; the file was not delivered.'); else if (r.cut) ui.toast('Video sent (first ' + VIDEO_MAX_S + ' seconds, ' + r.kb + ' KB).'); paintChat(); },
              function (er) { pr.hidden = true; att.disabled = false; ui.sheet({ title: 'Could not send', html: '<p>' + esc(er.message) + '</p><div class="actions"><button class="btn btn-ghost" data-close>OK</button></div>' }); });
        });
      });
      view.addEventListener('click', function (e) {
        var im = e.target.closest('.att-img img'); if (im) { ui.sheet({ title: im.alt || 'Photo', html: '<img class="att-full" src="' + im.src + '" alt="">' }); return; }
        var tb = e.target.closest('[data-tab]'); if (tb) { st.view = tb.dataset.tab; paintChat(); return; }
        var d = e.target.closest('[data-dm]'); if (d) { openDM(d.dataset.dm); return; }
        var b = e.target.closest('[data-peer]'); if (b) tapVessel(b.dataset.peer);
      });
      function tapVessel(id) {
        vesselSheet(id, { onChat: openDM, onMap: function (p) { if (fm) { fm.map.setView([p.pos.lat, p.pos.lon], Math.max(fm.map.getZoom(), 11)); $('[data-fmap]').scrollIntoView({ behavior: 'smooth', block: 'center' }); } } });
      }
      paintMode();
      if (st.focusChat && st.client && st.view !== 'group') { st.focusChat = false; setTimeout(function () { if (alive()) openDM(st.view); }, 150); }
    }
  });
})();
