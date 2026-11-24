/*
 * Fleet & Chat tests (async). Uses an in-memory Nostr relay, no network.
 * Run by tests/run-tests.js; can also run alone:  node tests/fleet-tests.js
 */
'use strict';
var assert = require('assert');
var path = require('path');
require(path.join(__dirname, '..', 'js', 'vendor', 'nostr-crypto.js'));
var nc = globalThis.MeikoNostrCrypto || (globalThis.self && globalThis.self.MeikoNostrCrypto);
var fleet = require(path.join(__dirname, '..', 'js', 'core', 'fleet.js'));
var subtle = globalThis.crypto.subtle;

/* Minimal NIP-01 relay: stores non-ephemeral events, forwards all, filters by kinds / #t / since. */
function MockRelay() { this.subs = []; this.stored = []; this.log = []; }
MockRelay.prototype.match = function (f, ev) {
  if (f.kinds && f.kinds.indexOf(ev.kind) < 0) return false;
  if (f['#t'] && !ev.tags.some(function (t) { return t[0] === 't' && f['#t'].indexOf(t[1]) >= 0; })) return false;
  if (f.since && ev.created_at < f.since) return false;
  return true;
};
MockRelay.prototype.socket = function () {
  var relay = this;
  function WS() {
    var ws = this; ws.readyState = 0; ws.subs = {};
    setTimeout(function () { ws.readyState = 1; ws.onopen && ws.onopen(); }, 1);
  }
  WS.prototype.send = function (txt) {
    var ws = this, m = JSON.parse(txt); relay.log.push(m);
    if (m[0] === 'REQ') {
      var filters = m.slice(2); ws.subs[m[1]] = filters; relay.subs.push(ws);
      relay.stored.forEach(function (ev) { if (filters.some(function (f) { return relay.match(f, ev); })) ws.deliver(['EVENT', m[1], ev]); });
    } else if (m[0] === 'EVENT') {
      var ev = m[1];
      if (!(ev.kind >= 20000 && ev.kind < 30000)) relay.stored.push(ev);
      relay.subs.forEach(function (s) { Object.keys(s.subs).forEach(function (id) { if (s.subs[id].some(function (f) { return relay.match(f, ev); })) s.deliver(['EVENT', id, ev]); }); });
    } else if (m[0] === 'CLOSE') delete ws.subs[m[1]];
  };
  WS.prototype.deliver = function (msg) { var ws = this; setTimeout(function () { if (ws.readyState === 1 && ws.onmessage) ws.onmessage({ data: JSON.stringify(msg) }); }, 1); };
  WS.prototype.close = function () { this.readyState = 3; relay.subs = relay.subs.filter(function (s) { return s !== this; }, this); };
  return WS;
};
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function client(relay, code, extra) {
  var got = { live: [], chat: [] };
  var c = fleet.createClient(Object.assign({ relays: ['ws://mock'], code: code, sk: nc.randomBytes(32), WebSocket: relay.socket(), nc: nc, subtle: subtle,
    onLive: function (p) { got.live.push(p); }, onChat: function (m) { got.chat.push(m); } }, extra || {}));
  c.got = got; return c;
}

module.exports = function run(test) {
  var tests = [];
  function t(name, fn) { tests.push([name, fn]); }

  t('Fleet: group code normalises and generates readable codes', function () {
    assert.strictEqual(fleet.normCode('  meiko-ab 12  '), 'MEIKO-AB12');
    var c = fleet.newCode(nc.randomBytes);
    assert.ok(/^MEIKO-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(c), c);
    assert.ok(!fleet.codeOk('abc'));
  });
  t('Fleet: same code gives same room tag; different code differs; tag does not reveal the code', function () {
    return Promise.all([fleet.deriveRoom('meiko-test-1', subtle), fleet.deriveRoom('MEIKO-TEST-1 ', subtle), fleet.deriveRoom('MEIKO-TEST-2', subtle)]).then(function (r) {
      assert.strictEqual(r[0].tag, r[1].tag); assert.notStrictEqual(r[0].tag, r[2].tag);
      assert.ok(/^meiko-[0-9a-f]{32}$/.test(r[0].tag)); assert.ok(r[0].tag.toUpperCase().indexOf('TEST') < 0);
    });
  });
  t('Fleet: encrypt/decrypt round trip; wrong key gives null', function () {
    return Promise.all([fleet.deriveRoom('MEIKO-AAAA-BBBB', subtle), fleet.deriveRoom('MEIKO-CCCC-DDDD', subtle)]).then(function (r) {
      return fleet.encrypt(subtle, r[0].key, { k: 'chat', text: 'halo' }, nc.randomBytes).then(function (ct) {
        assert.ok(ct.indexOf('halo') < 0);
        return Promise.all([fleet.decrypt(subtle, r[0].key, ct), fleet.decrypt(subtle, r[1].key, ct)]);
      }).then(function (d) { assert.deepStrictEqual(d[0], { k: 'chat', text: 'halo' }); assert.strictEqual(d[1], null); });
    });
  });
  t('Fleet: event signature verifies; tampered content fails', function () {
    var sk = nc.randomBytes(32);
    var ev = fleet.signEvent(nc, sk, { created_at: 1700000000, kind: fleet.KIND_CHAT, tags: [['t', 'x']], content: 'abc' });
    assert.ok(fleet.verifyEvent(nc, ev));
    assert.ok(!fleet.verifyEvent(nc, Object.assign({}, ev, { content: 'abd' })));
  });
  t('Fleet: untrusted payloads are cleaned (bad colours, types, ranges, long text)', function () {
    var p = fleet.sanitize({ k: 'live', name: 'A\u0000B' + 'x'.repeat(80), v: { type: 'cargo', h: 'red"><script>', s: '#ffffff', a: '#000000' }, pos: { lat: 95, lon: 10 } });
    assert.strictEqual(p.name.length, 40); assert.strictEqual(p.name.indexOf('\u0000'), -1);
    assert.strictEqual(p.vessel.h, null); assert.strictEqual(p.pos, undefined);
    assert.strictEqual(fleet.sanitize({ k: 'live', v: { type: '<svg>' } }).vessel, null);
    assert.strictEqual(fleet.sanitize({ k: 'evil' }), null);
    assert.strictEqual(fleet.sanitize({ k: 'chat', text: '   ' }), null);
    assert.strictEqual(fleet.sanitize({ k: 'chat', text: 'y'.repeat(900) }).text.length, 500);
  });
  t('Fleet: two vessels in the same group see each other\'s position and chat; another group sees nothing', function () {
    var relay = new MockRelay();
    var a = client(relay, 'MEIKO-SAME-0001'), b = client(relay, 'meiko-same-0001'), x = client(relay, 'MEIKO-OTHR-0002');
    return Promise.all([a.start(), b.start(), x.start()]).then(function () { return wait(20); }).then(function () {
      return a.sendLive({ name: 'KM Bahari', v: { type: 'pinisi', h: '#7A4A2A', s: '#F3E9D2', a: '#C9A227' }, pos: { lat: -6.1, lon: 106.9, cog: 45, sog: 6.5, t: Date.now() } });
    }).then(function (r) { assert.strictEqual(r.sent, 1); return a.sendChat('Selamat pagi', { name: 'KM Bahari' }); })
      .then(function () { return wait(40); }).then(function () {
        assert.strictEqual(b.got.live.length, 1); var p = b.got.live[0];
        assert.strictEqual(p.name, 'KM Bahari'); assert.strictEqual(p.pos.lat, -6.1); assert.strictEqual(p.pos.sog, 6.5); assert.strictEqual(p.vessel.type, 'pinisi');
        assert.strictEqual(b.got.chat.length, 1); assert.strictEqual(b.got.chat[0].text, 'Selamat pagi'); assert.strictEqual(b.got.chat[0].me, false);
        assert.strictEqual(a.got.chat.length, 1, 'own message shown once'); assert.strictEqual(a.got.chat[0].me, true);
        assert.strictEqual(x.got.live.length + x.got.chat.length, 0);
        relay.log.filter(function (m) { return m[0] === 'EVENT'; }).forEach(function (m) { assert.ok(m[1].content.indexOf('Bahari') < 0, 'relay sees plaintext'); });
        [a, b, x].forEach(function (c) { c.stop(); });
      });
  });
  t('Fleet: someone joining later gets recent chat (stored) but not old positions (ephemeral)', function () {
    var relay = new MockRelay(), a = client(relay, 'MEIKO-LATE-0003');
    return a.start().then(function () { return wait(10); })
      .then(function () { return a.sendLive({ name: 'A', pos: { lat: 1, lon: 100 } }); })
      .then(function () { return a.sendChat('ada orang?', { name: 'A' }); })
      .then(function () { var c = client(relay, 'MEIKO-LATE-0003'); return c.start().then(function () { return wait(40); }).then(function () { return c; }); })
      .then(function (c) { assert.strictEqual(c.got.chat.length, 1); assert.strictEqual(c.got.chat[0].text, 'ada orang?'); assert.strictEqual(c.got.live.length, 0); c.stop(); a.stop(); });
  });
  t('Fleet: forged event (bad signature) is ignored', function () {
    var relay = new MockRelay(), b = client(relay, 'MEIKO-FORG-0004');
    return b.start().then(function () { return wait(10); }).then(function () { return fleet.deriveRoom('MEIKO-FORG-0004', subtle); }).then(function (room) {
      return fleet.encrypt(subtle, room.key, { k: 'chat', text: 'palsu' }, nc.randomBytes).then(function (ct) {
        var ev = fleet.signEvent(nc, nc.randomBytes(32), { created_at: Math.floor(Date.now() / 1000), kind: fleet.KIND_CHAT, tags: [['t', room.tag]], content: ct });
        ev.sig = ev.sig.replace(/^./, ev.sig[0] === 'a' ? 'b' : 'a');
        var W = relay.socket(), w = new W(); return wait(5).then(function () { w.send(JSON.stringify(['EVENT', ev])); return wait(30); });
      });
    }).then(function () { assert.strictEqual(b.got.chat.length, 0); b.stop(); });
  });

  t('Fleet: private chat — only the recipient can read it; a third member with the group code cannot', function () {
    var relay = new MockRelay(), dms = { a: [], b: [], x: [] };
    var a = client(relay, 'MEIKO-PRIV-0005', { onDM: function (m) { dms.a.push(m); } });
    var b = client(relay, 'MEIKO-PRIV-0005', { onDM: function (m) { dms.b.push(m); } });
    var x = client(relay, 'MEIKO-PRIV-0005', { onDM: function (m) { dms.x.push(m); } });
    return Promise.all([a.start(), b.start(), x.start()]).then(function () { return wait(20); })
      .then(function () { return a.sendDM(b.pubkey, 'Kode dermaga: 7-B', { name: 'KM Bahari' }); })
      .then(function () { return wait(60); }).then(function () {
        assert.strictEqual(dms.b.length, 1); assert.strictEqual(dms.b[0].text, 'Kode dermaga: 7-B'); assert.strictEqual(dms.b[0].peer, a.pubkey); assert.strictEqual(dms.b[0].name, 'KM Bahari');
        assert.strictEqual(dms.a.length, 1); assert.ok(dms.a[0].me); assert.strictEqual(dms.a[0].peer, b.pubkey);
        assert.strictEqual(dms.x.length, 0, 'third member read a private message');
        assert.strictEqual(x.got.chat.length + b.got.chat.length, 0, 'private message leaked into group chat');
        var ev = relay.log.filter(function (m) { return m[0] === 'EVENT'; }).pop()[1];
        assert.ok(JSON.stringify(ev).indexOf(b.pubkey) < 0, 'recipient visible in the event');
        [a, b, x].forEach(function (c) { c.stop(); });
      });
  });
  t('Fleet: safety code is the same on both sides and differs for another pair', function () {
    var p1 = nc.bytesToHex(nc.schnorr.getPublicKey(nc.randomBytes(32))), p2 = nc.bytesToHex(nc.schnorr.getPublicKey(nc.randomBytes(32))), p3 = nc.bytesToHex(nc.schnorr.getPublicKey(nc.randomBytes(32)));
    assert.strictEqual(fleet.safetyCode(nc, p1, p2), fleet.safetyCode(nc, p2, p1));
    assert.ok(/^\d{4}( \d{4}){4}$/.test(fleet.safetyCode(nc, p1, p2)));
    assert.notStrictEqual(fleet.safetyCode(nc, p1, p2), fleet.safetyCode(nc, p1, p3));
  });
  t('Fleet: pairwise key works for odd-y keys (both directions derive the same key)', function () {
    var tries = [], i;
    for (i = 0; i < 6; i++) tries.push([nc.randomBytes(32), nc.randomBytes(32)]);
    return Promise.all(tries.map(function (k) {
      var pa = nc.bytesToHex(nc.schnorr.getPublicKey(k[0])), pb = nc.bytesToHex(nc.schnorr.getPublicKey(k[1]));
      return Promise.all([fleet.pairKey(nc, subtle, k[0], pb), fleet.pairKey(nc, subtle, k[1], pa)]).then(function (keys) {
        return fleet.encrypt(subtle, keys[0], { x: 1 }, nc.randomBytes).then(function (ct) { return fleet.decrypt(subtle, keys[1], ct); }).then(function (d) { assert.deepStrictEqual(d, { x: 1 }); });
      });
    }));
  });

  t('Fleet: a photo/file sent to the group arrives complete; another group gets nothing', function () {
    var relay = new MockRelay(), files = { b: [], x: [] };
    var a = client(relay, 'MEIKO-FILE-0006', { partDelay: 0 }), b = client(relay, 'MEIKO-FILE-0006', { onFile: function (f) { files.b.push(f); } }), x = client(relay, 'MEIKO-FILE-9999', { onFile: function (f) { files.x.push(f); } });
    var data = nc.randomBytes(40000);
    return Promise.all([a.start(), b.start(), x.start()]).then(function () { return wait(20); })
      .then(function () { return a.sendFile('group', data, { name: 'foto.jpg', mime: 'image/jpeg', w: 800, h: 600 }, 'Cuaca di sini', { name: 'KM Bahari' }); })
      .then(function (r) { assert.strictEqual(r.att.n, 3); return wait(80); }).then(function () {
        assert.strictEqual(files.b.length, 1); assert.deepStrictEqual(Array.from(files.b[0].bytes), Array.from(data));
        assert.strictEqual(files.b[0].meta.name, 'foto.jpg'); assert.strictEqual(files.b[0].meta.w, 800);
        var head = b.got.chat.filter(function (m) { return m.att; })[0]; assert.ok(head); assert.strictEqual(head.text, 'Cuaca di sini');
        assert.strictEqual(files.x.length, 0);
        relay.log.filter(function (m) { return m[0] === 'EVENT'; }).forEach(function (m) { assert.ok(JSON.stringify(m).length < 60000, 'event too large for public relays: ' + JSON.stringify(m).length); });
        [a, b, x].forEach(function (c) { c.stop(); });
      });
  });
  t('Fleet: a private file reaches only the recipient (third member gets nothing) and stays under relay size limits', function () {
    var relay = new MockRelay(), got = { b: [], x: [] }, dmB = [];
    var a = client(relay, 'MEIKO-PFIL-0007', { partDelay: 0 });
    var b = client(relay, 'MEIKO-PFIL-0007', { onFile: function (f) { got.b.push(f); }, onDM: function (m) { dmB.push(m); } });
    var x = client(relay, 'MEIKO-PFIL-0007', { onFile: function (f) { got.x.push(f); } });
    var data = nc.randomBytes(50000);
    return Promise.all([a.start(), b.start(), x.start()]).then(function () { return wait(20); })
      .then(function () { return a.sendFile(b.pubkey, data, { name: 'manifest.pdf', mime: 'application/pdf' }, '', { name: 'KM Bahari' }); })
      .then(function () { return wait(120); }).then(function () {
        assert.strictEqual(got.b.length, 1); assert.deepStrictEqual(Array.from(got.b[0].bytes), Array.from(data)); assert.strictEqual(got.b[0].peer, a.pubkey);
        assert.strictEqual(dmB.length, 1); assert.strictEqual(dmB[0].att.name, 'manifest.pdf');
        assert.strictEqual(got.x.length, 0);
        relay.log.filter(function (m) { return m[0] === 'EVENT'; }).forEach(function (m) { assert.ok(JSON.stringify(m).length < 64000, 'event too large: ' + JSON.stringify(m).length); });
        [a, b, x].forEach(function (c) { c.stop(); });
      });
  });
  t('Fleet: oversized files are refused; forged parts from another member cannot corrupt a file', function () {
    var relay = new MockRelay(), files = [];
    var a = client(relay, 'MEIKO-SIZE-0008', { partDelay: 0 }), b = client(relay, 'MEIKO-SIZE-0008', { onFile: function (f) { files.push(f); } }), m = client(relay, 'MEIKO-SIZE-0008', { partDelay: 0 });
    return Promise.all([a.start(), b.start(), m.start()]).then(function () { return wait(20); })
      .then(function () { return a.sendFile('group', new Uint8Array(fleet.MAX_FILE + 1), { name: 'big.bin', mime: 'application/octet-stream' }, '', {}).then(function () { throw new Error('accepted'); }, function (e) { assert.ok(/too large/.test(e.message)); }); })
      .then(function () { return a.sendFile('group', new Uint8Array(20000).fill(7), { name: 'ok.bin', mime: 'application/octet-stream' }, '', {}); })
      .then(function (r) { return m.sendFile('group', new Uint8Array(20000).fill(9), { name: 'evil.bin', mime: 'application/octet-stream' }, '', {}).then(function () { return r; }); })
      .then(function () { return wait(80); }).then(function () {
        var ok = files.filter(function (f) { return f.meta.name === 'ok.bin'; })[0];
        assert.ok(ok); assert.ok(Array.prototype.every.call(ok.bytes, function (v) { return v === 7; }));
        [a, b, m].forEach(function (c) { c.stop(); });
      });
  });

  t('Fleet: navigational status travels with the live message; invalid codes are dropped', function () {
    assert.strictEqual(fleet.sanitize({ k: 'live', ns: 1 }).ns, 1);
    assert.strictEqual(fleet.sanitize({ k: 'live', ns: 8 }).ns, 8);
    assert.strictEqual(fleet.sanitize({ k: 'live', ns: 15 }).ns, null);
    assert.strictEqual(fleet.sanitize({ k: 'live', ns: '1' }).ns, null);
    assert.strictEqual(fleet.navStatus(1).label, 'At anchor');
    var relay = new MockRelay(), a = client(relay, 'MEIKO-STAT-0009'), b = client(relay, 'MEIKO-STAT-0009');
    return Promise.all([a.start(), b.start()]).then(function () { return wait(20); })
      .then(function () { return a.sendLive({ name: 'A', ns: 7 }); }).then(function () { return wait(40); })
      .then(function () { assert.strictEqual(b.got.live[0].ns, 7); a.stop(); b.stop(); });
  });

  return tests.reduce(function (p, tc) {
    return p.then(function () { return test(tc[0], tc[1]); });
  }, Promise.resolve());
};

if (require.main === module) {
  var passed = 0, failed = 0;
  module.exports(function (name, fn) {
    return Promise.resolve().then(fn).then(function () { passed++; console.log('  ✓ ' + name); }, function (e) { failed++; console.log('  ✗ ' + name + '\n      ' + e.message); });
  }).then(function () { console.log('\n' + passed + ' passed, ' + failed + ' failed\n'); process.exit(failed ? 1 : 0); });
}
