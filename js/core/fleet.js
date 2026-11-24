/*
 * MEIKO core — Fleet & Chat over public Nostr relays (no server of our own, no account).
 *  - A group code is the shared secret. From it we derive (PBKDF2-SHA256) an AES-GCM key and a public
 *    "room tag". Relays only see the tag and ciphertext; positions and messages are readable only with the code.
 *  - Each device has its own random signing key (secp256k1 schnorr, as Nostr requires). It is not an account.
 *  - Private chat (k:'dm'): the text is first encrypted for one vessel with a key only the two of them can
 *    compute (secp256k1 ECDH of their device keys → HKDF-SHA256 → AES-GCM), then wrapped in the group layer.
 *    The recipient is not written anywhere: each vessel tries the key it shares with the sender. Other group
 *    members can see that the sender sent a private message, not to whom or what it says.
 *  - Positions/presence use an ephemeral kind (relays forward, do not store). Chat uses a regular kind with a
 *    NIP-40 expiration tag so relays that store it can hand recent messages to someone who joins later.
 * Works in browsers and in Node (tests): pass { WebSocket, crypto: MeikoNostrCrypto, subtle } to createClient.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.MeikoCore = root.MeikoCore || {}; root.MeikoCore.fleet = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var KIND_LIVE = 20777, KIND_CHAT = 4777;
  var DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net', 'wss://offchain.pub'];
  var CHAT_TTL_S = 3 * 86400, HISTORY_S = 2 * 86400;
  var VESSEL_TYPES = ['sailboat', 'pinisi', 'speedboat', 'passenger', 'cargo', 'tanker', 'fishing', 'tug'];
  var CHUNK = 16000, MAX_FILE = 512 * 1024, MAX_PARTS = Math.ceil(MAX_FILE / CHUNK);
  var CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function normCode(code) { return String(code || '').trim().toUpperCase().replace(/\s+/g, ''); }
  function codeOk(code) { return normCode(code).length >= 8; }
  function newCode(rand) {
    var b = rand(8), s = '';
    for (var i = 0; i < 8; i++) { s += CODE_ALPHA[b[i] % CODE_ALPHA.length]; if (i === 3) s += '-'; }
    return 'MEIKO-' + s;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64')); }
  function unb64(s) { var bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); var u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function hex(u8) { return Array.prototype.map.call(u8, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }

  /** Derive { tag, key } from a group code. */
  function deriveRoom(code, subtle) {
    var c = normCode(code);
    return subtle.importKey('raw', utf8(c), 'PBKDF2', false, ['deriveBits']).then(function (base) {
      return subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: utf8('meiko-fleet-v1'), iterations: 150000 }, base, 512);
    }).then(function (bits) {
      var all = new Uint8Array(bits), keyBytes = all.slice(0, 32), tagBytes = all.slice(32, 48);
      return subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']).then(function (key) {
        return { tag: 'meiko-' + hex(tagBytes), key: key };
      });
    });
  }
  function encrypt(subtle, key, obj, rand) {
    var iv = rand(12);
    return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, utf8(JSON.stringify(obj))).then(function (ct) {
      var out = new Uint8Array(12 + ct.byteLength); out.set(iv, 0); out.set(new Uint8Array(ct), 12); return b64(out);
    });
  }
  function decrypt(subtle, key, content) {
    var u; try { u = unb64(content); } catch (e) { return Promise.resolve(null); }
    if (u.length < 29) return Promise.resolve(null);
    return subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12)).then(function (pt) {
      try { return JSON.parse(new TextDecoder().decode(pt)); } catch (e) { return null; }
    }, function () { return null; });
  }

  function eventId(nc, ev) { return nc.bytesToHex(nc.sha256(utf8(JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content])))); }
  function signEvent(nc, sk, ev) {
    ev.pubkey = nc.bytesToHex(nc.schnorr.getPublicKey(sk));
    ev.id = eventId(nc, ev);
    ev.sig = nc.bytesToHex(nc.schnorr.sign(nc.hexToBytes(ev.id), sk));
    return ev;
  }
  function verifyEvent(nc, ev) {
    try {
      if (!ev || typeof ev.id !== 'string' || typeof ev.sig !== 'string' || typeof ev.pubkey !== 'string' || typeof ev.content !== 'string') return false;
      if (eventId(nc, ev) !== ev.id) return false;
      return nc.schnorr.verify(nc.hexToBytes(ev.sig), nc.hexToBytes(ev.id), nc.hexToBytes(ev.pubkey));
    } catch (e) { return false; }
  }

  /* -------- private (pairwise) keys -------- */
  /** AES-GCM key shared by exactly two device keys. Same result on both sides. */
  function pairKey(nc, subtle, sk, peerPubHex) {
    var shared = nc.getSharedSecret(sk, nc.hexToBytes('02' + peerPubHex), true).slice(1);
    var myPub = nc.bytesToHex(nc.schnorr.getPublicKey(sk)), pair = [myPub, peerPubHex].sort().join(':');
    return subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']).then(function (base) {
      return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: utf8('meiko-dm-v1'), info: utf8(pair) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  /** Safety code for two keys: 20 digits, identical on both phones. Compare by VHF/phone/in person. */
  function safetyCode(nc, pubA, pubB) {
    var h = nc.sha256(utf8('meiko-safety-v1:' + [pubA, pubB].sort().join(':'))), out = [];
    for (var i = 0; i < 5; i++) { var n = ((h[i * 3] << 16) | (h[i * 3 + 1] << 8) | h[i * 3 + 2]) % 10000; out.push(('000' + n).slice(-4)); }
    return out.join(' ');
  }
  /** Short ID shown next to a name so two vessels with the same name can be told apart. */
  function shortId(pub) { return String(pub || '').slice(0, 4).toUpperCase() + '·' + String(pub || '').slice(4, 8).toUpperCase(); }

  /* -------- payload validation: everything received is untrusted -------- */
  function str(v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : ''; }
  function num(v, lo, hi) { return typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : null; }
  function colour(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null; }
  function sanitize(p) {
    if (!p || typeof p !== 'object') return null;
    var k = p.k;
    if (k !== 'live' && k !== 'chat' && k !== 'bye' && k !== 'dm' && k !== 'part') return null;
    if (k === 'dm') return typeof p.c === 'string' && p.c.length < 120000 ? { k: 'dm', c: p.c } : null;
    if (k === 'part') return sanitizePart(p);
    var out = { k: k, name: str(p.name, 40) || 'Unnamed vessel', callsign: str(p.callsign, 16) };
    var v = p.v && typeof p.v === 'object' ? p.v : null;
    out.vessel = v && VESSEL_TYPES.indexOf(v.type) >= 0 ? { type: v.type, h: colour(v.h), s: colour(v.s), a: colour(v.a) } : null;
    if (k === 'chat') { out.text = str(p.text, 500); out.att = sanitizeAtt(p.att); if (!out.text && !out.att) return null; }
    if (k === 'live' && p.pos && typeof p.pos === 'object') {
      var lat = num(p.pos.lat, -90, 90), lon = num(p.pos.lon, -180, 180);
      if (lat != null && lon != null) out.pos = { lat: lat, lon: lon, cog: num(p.pos.cog, 0, 360), sog: num(p.pos.sog, 0, 99), t: num(p.pos.t, 0, 1e13), acc: num(p.pos.acc, 0, 1e6) };
    }
    return out;
  }

  function sanitizeAtt(a) {
    if (!a || typeof a !== 'object') return null;
    if (typeof a.fid !== 'string' || !/^[0-9a-f]{16}$/.test(a.fid)) return null;
    var size = num(a.size, 1, MAX_FILE), n = num(a.n, 1, MAX_PARTS);
    if (size == null || n == null || size % 1 || n !== Math.ceil(size / CHUNK)) return null;
    var mime = typeof a.mime === 'string' && /^[a-z0-9.+-]{1,40}\/[a-z0-9.+-]{1,60}$/i.test(a.mime) ? a.mime.toLowerCase() : 'application/octet-stream';
    var name = str(a.name, 80).replace(/[\\/:*?"<>|]/g, '_') || 'file';
    var w = num(a.w, 1, 10000), h = num(a.h, 1, 10000);
    return { fid: a.fid, name: name, mime: mime, size: size, n: n, w: w, h: h };
  }
  function sanitizePart(p) {
    if (typeof p.fid !== 'string' || !/^[0-9a-f]{16}$/.test(p.fid)) return null;
    var i = num(p.i, 0, MAX_PARTS - 1);
    if (i == null || i % 1 || typeof p.d !== 'string' || p.d.length > 22000 || !/^[A-Za-z0-9+/=]*$/.test(p.d)) return null;
    return { k: 'part', fid: p.fid, i: i, d: p.d };
  }

  /**
   * createClient(opts): opts = { relays, code, sk (Uint8Array 32), WebSocket, nc (MeikoNostrCrypto), subtle,
   *   now(): ms, onLive(peer), onChat(msg), onStatus(status) }
   * Returns { start(): Promise, stop(), sendLive(payload), sendChat(text, me), status(), pubkey }.
   */
  function createClient(o) {
    var nc = o.nc, subtle = o.subtle, now = o.now || Date.now;
    var rand = o.rand || function (n) { return nc.randomBytes(n); };
    var relays = (o.relays && o.relays.length ? o.relays : DEFAULT_RELAYS).slice(0, 8);
    var pub = nc.bytesToHex(nc.schnorr.getPublicKey(o.sk));
    var pairs = {};
    function pk(peer) { return pairs[peer] || (pairs[peer] = pairKey(nc, subtle, o.sk, peer)); }
    var files = {};
    /** Collect header + parts; when complete, hand the bytes to onFile once. */
    function filePiece(key, from, peer, meta, part) {
      var f = files[key] || (files[key] = { parts: {}, got: 0, meta: null, done: false, from: from, peer: peer });
      if (f.done) return;
      if (meta) f.meta = meta;
      if (part && f.parts[part.i] == null) { f.parts[part.i] = part.d; f.got++; }
      if (o.onFileProgress && f.meta) o.onFileProgress({ fid: f.meta.fid, from: from, peer: peer, got: f.got, n: f.meta.n });
      if (!f.meta || f.got < f.meta.n) return;
      var chunks = [], total = 0;
      for (var i = 0; i < f.meta.n; i++) { if (f.parts[i] == null) return; var u; try { u = unb64(f.parts[i]); } catch (e) { return; } chunks.push(u); total += u.length; }
      f.done = true; f.parts = {};
      if (total !== f.meta.size) return;
      var bytes = new Uint8Array(total), off = 0; chunks.forEach(function (c) { bytes.set(c, off); off += c.length; });
      if (o.onFile) o.onFile({ fid: f.meta.fid, from: from, peer: peer, meta: f.meta, bytes: bytes });
    }
    var room = null, socks = {}, seen = {}, seenN = 0, stopped = false, subId = 'meiko' + hex(rand(4));
    function status() {
      var open = 0; relays.forEach(function (u) { var s = socks[u]; if (s && s.ws && s.ws.readyState === 1) open++; });
      return { relays: relays.length, connected: open, tag: room && room.tag };
    }
    function emitStatus() { if (o.onStatus) o.onStatus(status()); }
    function remember(id) { if (seen[id]) return false; seen[id] = 1; if (++seenN > 5000) { seen = {}; seenN = 0; } return true; }
    function connect(url) {
      if (stopped) return;
      var s = socks[url] || (socks[url] = { tries: 0, ws: null, timer: null });
      var ws; try { ws = new o.WebSocket(url); } catch (e) { retry(url); return; }
      s.ws = ws;
      ws.onopen = function () {
        s.tries = 0;
        var since = Math.floor(now() / 1000) - HISTORY_S;
        ws.send(JSON.stringify(['REQ', subId, { kinds: [KIND_CHAT], '#t': [room.tag], since: since, limit: 1000 }, { kinds: [KIND_LIVE], '#t': [room.tag], since: Math.floor(now() / 1000) - 60 }]));
        emitStatus();
      };
      ws.onmessage = function (m) {
        var d; try { d = JSON.parse(typeof m.data === 'string' ? m.data : String(m.data)); } catch (e) { return; }
        if (!Array.isArray(d) || d[0] !== 'EVENT' || !d[2]) return;
        handle(d[2]);
      };
      ws.onclose = function () { if (s.ws === ws) { s.ws = null; emitStatus(); retry(url); } };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    }
    function retry(url) {
      if (stopped) return;
      var s = socks[url]; s.tries++;
      var wait = Math.min(60000, 2000 * Math.pow(2, Math.min(5, s.tries - 1)));
      clearTimeout(s.timer); s.timer = setTimeout(function () { connect(url); }, wait);
    }
    function handle(ev) {
      if (!ev || (ev.kind !== KIND_LIVE && ev.kind !== KIND_CHAT) || !Array.isArray(ev.tags)) return;
      var tagged = ev.tags.some(function (t) { return Array.isArray(t) && t[0] === 't' && t[1] === room.tag; });
      if (!tagged || typeof ev.id !== 'string' || !remember(ev.id)) return;
      if (!verifyEvent(nc, ev)) return;
      decrypt(subtle, room.key, ev.content).then(function (raw) {
        var p = sanitize(raw); if (!p || stopped) return;
        var base = { from: ev.pubkey, me: ev.pubkey === pub, at: Math.min(ev.created_at * 1000, now() + 60000) };
        if (p.k === 'dm' && ev.kind === KIND_CHAT) {
          if (base.me) return; // own private messages are kept on the device when sent
          pk(ev.pubkey).then(function (key) { return decrypt(subtle, key, p.c); }).then(function (inner) {
            if (!inner || stopped) return; // not for us
            if (inner.part) { var pp = sanitizePart(inner.part); if (pp) filePiece('dm:' + ev.pubkey + ':' + pp.fid, ev.pubkey, ev.pubkey, null, pp); return; }
            var q = sanitize({ k: 'chat', text: inner.text, name: inner.name, callsign: inner.callsign, att: inner.att });
            if (!q) return;
            if (o.onDM) o.onDM(Object.assign(base, { name: q.name, callsign: q.callsign, text: q.text, att: q.att, id: ev.id, peer: ev.pubkey, to: pub }));
            if (q.att) filePiece('dm:' + ev.pubkey + ':' + q.att.fid, ev.pubkey, ev.pubkey, q.att, null);
          }, function () {});
          return;
        }
        if (p.k === 'part' && ev.kind === KIND_CHAT) { filePiece('g:' + ev.pubkey + ':' + p.fid, ev.pubkey, null, null, p); return; }
        if (p.k === 'chat' && ev.kind === KIND_CHAT) {
          if (o.onChat) o.onChat(Object.assign(base, p, { id: ev.id }));
          if (p.att) filePiece('g:' + ev.pubkey + ':' + p.att.fid, ev.pubkey, null, p.att, null);
        }
        else if (ev.kind === KIND_LIVE && (p.k === 'live' || p.k === 'bye')) { if (o.onLive) o.onLive(Object.assign(base, p)); }
      });
    }
    function publish(kind, payload, ttl) {
      if (!room) return Promise.reject(new Error('Not joined'));
      return encrypt(subtle, room.key, payload, rand).then(function (content) {
        var t = Math.floor(now() / 1000), tags = [['t', room.tag]];
        if (ttl) tags.push(['expiration', String(t + ttl)]);
        var ev = signEvent(nc, o.sk, { created_at: t, kind: kind, tags: tags, content: content });
        var msg = JSON.stringify(['EVENT', ev]), sent = 0;
        relays.forEach(function (u) { var s = socks[u]; if (s && s.ws && s.ws.readyState === 1) { try { s.ws.send(msg); sent++; } catch (e) {} } });
        if (kind === KIND_CHAT) { remember(ev.id); handle2(ev, payload); }
        return { sent: sent, id: ev.id };
      });
    }
    function handle2(ev, payload) { // show own chat immediately
      if (payload.k !== 'chat') return;
      var p = sanitize(payload); if (p && o.onChat) o.onChat(Object.assign({ from: pub, me: true, at: ev.created_at * 1000, id: ev.id, pending: false }, p));
    }
    function sendDM(peer, text, me, att) {
      if (!/^[0-9a-f]{64}$/.test(peer)) return Promise.reject(new Error('Unknown vessel'));
      text = String(text || '').slice(0, 500);
      return pk(peer).then(function (key) { return encrypt(subtle, key, { text: text, name: me && me.name, callsign: me && me.callsign, att: att || undefined }, rand); })
        .then(function (c) {
          return publish(KIND_CHAT, { k: 'dm', c: c }, CHAT_TTL_S).then(function (r) { if (o.onDM) o.onDM({ from: pub, me: true, peer: peer, to: peer, at: now(), id: r.id, text: text, att: att || null, name: me && me.name }); return r; });
        });
    }
    return {
      pubkey: pub,
      start: function () {
        stopped = false;
        return deriveRoom(o.code, subtle).then(function (r) { room = r; relays.forEach(connect); emitStatus(); return r.tag; });
      },
      stop: function () {
        stopped = true;
        Object.keys(socks).forEach(function (u) { var s = socks[u]; clearTimeout(s.timer); if (s.ws) { try { s.ws.send(JSON.stringify(['CLOSE', subId])); } catch (e) {} try { s.ws.close(); } catch (e) {} s.ws = null; } });
        emitStatus();
      },
      sendLive: function (p) { p.k = p.k || 'live'; return publish(KIND_LIVE, p, 0); },
      sendDM: function (peer, text, me, att) { return sendDM(peer, text, me, att); },
      /**
       * Send a file to the group (to = 'group') or privately (to = peer pubkey): one header message, then
       * the bytes in CHUNK-sized encrypted parts. meta = { name, mime, w?, h? }. Returns { fid, sent }.
       */
      sendFile: function (to, bytes, meta, caption, me, onProgress) {
        if (!bytes || !bytes.length) return Promise.reject(new Error('Empty file'));
        if (bytes.length > MAX_FILE) return Promise.reject(new Error('File too large (max ' + Math.round(MAX_FILE / 1024) + ' KB)'));
        var fid = meta.fid && /^[0-9a-f]{16}$/.test(meta.fid) ? meta.fid : hex(rand(8)), n = Math.ceil(bytes.length / CHUNK), dm = to !== 'group';
        var att = sanitizeAtt({ fid: fid, name: meta.name, mime: meta.mime, size: bytes.length, n: n, w: meta.w, h: meta.h });
        var head = dm ? sendDM(to, caption || '', me, att) : publish(KIND_CHAT, Object.assign({}, me, { k: 'chat', text: String(caption || '').slice(0, 500), att: att }), CHAT_TTL_S);
        var minSent = Infinity, delay = o.partDelay == null ? 300 : o.partDelay;
        function part(i) {
          if (i >= n) return Promise.resolve();
          var d = b64(bytes.subarray(i * CHUNK, Math.min(bytes.length, (i + 1) * CHUNK)));
          var pr = dm ? pk(to).then(function (key) { return encrypt(subtle, key, { part: { fid: fid, i: i, d: d } }, rand); }).then(function (c) { return publish(KIND_CHAT, { k: 'dm', c: c }, CHAT_TTL_S); })
            : publish(KIND_CHAT, { k: 'part', fid: fid, i: i, d: d }, CHAT_TTL_S);
          return pr.then(function (r) { minSent = Math.min(minSent, r.sent); if (onProgress) onProgress(i + 1, n); return new Promise(function (res) { setTimeout(res, delay); }); }).then(function () { return part(i + 1); });
        }
        return head.then(function (r) { minSent = r.sent; return part(0); }).then(function () { return { fid: fid, att: att, sent: minSent }; });
      },
      sendChat: function (text, me) { return publish(KIND_CHAT, Object.assign({}, me, { k: 'chat', text: String(text).slice(0, 500) }), CHAT_TTL_S); },
      status: status
    };
  }

  return { KIND_LIVE: KIND_LIVE, KIND_CHAT: KIND_CHAT, CHUNK: CHUNK, MAX_FILE: MAX_FILE, DEFAULT_RELAYS: DEFAULT_RELAYS, normCode: normCode, codeOk: codeOk, newCode: newCode,
    deriveRoom: deriveRoom, pairKey: pairKey, safetyCode: safetyCode, shortId: shortId, encrypt: encrypt, decrypt: decrypt, signEvent: signEvent, verifyEvent: verifyEvent, sanitize: sanitize, createClient: createClient };
});
