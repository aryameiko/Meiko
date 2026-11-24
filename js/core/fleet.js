/*
 * MEIKO core — Fleet & Chat over public Nostr relays (no server of our own, no account).
 *  - A group code is the shared secret. From it we derive (PBKDF2-SHA256) an AES-GCM key and a public
 *    "room tag". Relays only see the tag and ciphertext; positions and messages are readable only with the code.
 *  - Each device has its own random signing key (secp256k1 schnorr, as Nostr requires). It is not an account.
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

  /* -------- payload validation: everything received is untrusted -------- */
  function str(v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : ''; }
  function num(v, lo, hi) { return typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : null; }
  function colour(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null; }
  function sanitize(p) {
    if (!p || typeof p !== 'object') return null;
    var k = p.k;
    if (k !== 'live' && k !== 'chat' && k !== 'bye') return null;
    var out = { k: k, name: str(p.name, 40) || 'Unnamed vessel', callsign: str(p.callsign, 16) };
    var v = p.v && typeof p.v === 'object' ? p.v : null;
    out.vessel = v && VESSEL_TYPES.indexOf(v.type) >= 0 ? { type: v.type, h: colour(v.h), s: colour(v.s), a: colour(v.a) } : null;
    if (k === 'chat') { out.text = str(p.text, 500); if (!out.text) return null; }
    if (k === 'live' && p.pos && typeof p.pos === 'object') {
      var lat = num(p.pos.lat, -90, 90), lon = num(p.pos.lon, -180, 180);
      if (lat != null && lon != null) out.pos = { lat: lat, lon: lon, cog: num(p.pos.cog, 0, 360), sog: num(p.pos.sog, 0, 99), t: num(p.pos.t, 0, 1e13), acc: num(p.pos.acc, 0, 1e6) };
    }
    return out;
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
        ws.send(JSON.stringify(['REQ', subId, { kinds: [KIND_CHAT], '#t': [room.tag], since: since, limit: 200 }, { kinds: [KIND_LIVE], '#t': [room.tag], since: Math.floor(now() / 1000) - 60 }]));
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
        if (p.k === 'chat' && ev.kind === KIND_CHAT) { if (o.onChat) o.onChat(Object.assign(base, p, { id: ev.id })); }
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
      var p = sanitize(payload); if (p && o.onChat) o.onChat(Object.assign({ from: pub, me: true, at: ev.created_at * 1000, id: ev.id, pending: false }, p));
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
      sendChat: function (text, me) { return publish(KIND_CHAT, Object.assign({}, me, { k: 'chat', text: String(text).slice(0, 500) }), CHAT_TTL_S); },
      status: status
    };
  }

  return { KIND_LIVE: KIND_LIVE, KIND_CHAT: KIND_CHAT, DEFAULT_RELAYS: DEFAULT_RELAYS, normCode: normCode, codeOk: codeOk, newCode: newCode,
    deriveRoom: deriveRoom, encrypt: encrypt, decrypt: decrypt, signEvent: signEvent, verifyEvent: verifyEvent, sanitize: sanitize, createClient: createClient };
});
