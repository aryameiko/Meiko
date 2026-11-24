/*
 * MEIKO — email confirmation code logic (no Firebase here, so it can be unit-tested).
 * The code itself is never stored: only an HMAC of uid + code + expiry, keyed by the CODE_SECRET
 * secret, kept in the user's custom claims as vc = { h, e, n, s, d, c }.
 *   h hash, e expiry (ms), n wrong tries, s last send (ms), d day (yyyymmdd), c sends that day.
 */
'use strict';
const crypto = require('crypto');
const TTL = 10 * 60 * 1000, MAX_TRIES = 5, RESEND_MS = 60 * 1000, MAX_PER_DAY = 10;

function day(now) { return Number(new Date(now).toISOString().slice(0, 10).replace(/-/g, '')); }
function hash(secret, uid, code, exp) { return crypto.createHmac('sha256', secret).update(uid + ':' + code + ':' + exp).digest('hex'); }
function newCode() { return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }

/** Make a new code. Returns { code, vc } or { wait: seconds } / { limit: true } when sending again too soon. */
function issue(secret, uid, old, now) {
  old = old || {};
  if (old.s && now - old.s < RESEND_MS) return { wait: Math.ceil((RESEND_MS - (now - old.s)) / 1000) };
  const d = day(now), c = old.d === d ? (old.c || 0) : 0;
  if (c >= MAX_PER_DAY) return { limit: true };
  const code = newCode(), e = now + TTL;
  return { code: code, vc: { h: hash(secret, uid, code, e), e: e, n: 0, s: now, d: d, c: c + 1 } };
}

/** Check a typed code. Returns { ok: true } or { ok: false, reason: 'none'|'expired'|'tries'|'wrong'|'format', left?, vc? }. */
function check(secret, uid, vc, code, now) {
  code = String(code == null ? '' : code).replace(/\D/g, '');
  if (code.length !== 6) return { ok: false, reason: 'format' };
  if (!vc || !vc.h) return { ok: false, reason: 'none' };
  if (now > vc.e) return { ok: false, reason: 'expired' };
  if ((vc.n || 0) >= MAX_TRIES) return { ok: false, reason: 'tries' };
  const a = Buffer.from(hash(secret, uid, code, vc.e), 'hex'), b = Buffer.from(String(vc.h), 'hex');
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return { ok: true };
  const n = (vc.n || 0) + 1;
  return { ok: false, reason: n >= MAX_TRIES ? 'tries' : 'wrong', left: MAX_TRIES - n, vc: Object.assign({}, vc, { n: n }) };
}

function mail(code) {
  const subject = 'Kode verifikasi MEIKO: ' + code;
  const text = 'Kode verifikasi MEIKO Anda:\n\n    ' + code + '\n\nMasukkan kode ini di aplikasi MEIKO. Kode berlaku 10 menit.\nJika Anda tidak mendaftar di MEIKO, abaikan email ini.\n\n— Your MEIKO confirmation code is ' + code + ' (valid for 10 minutes).';
  const html = '<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#0b1f3a">' +
    '<h2 style="margin:0 0 12px">MEIKO</h2><p>Kode verifikasi Anda:</p>' +
    '<p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:12px 0;background:#f2f4f8;border-radius:10px;padding:12px;text-align:center">' + code + '</p>' +
    '<p>Masukkan kode ini di aplikasi MEIKO. Kode berlaku <b>10 menit</b>.</p>' +
    '<p style="color:#667;font-size:13px">Jika Anda tidak mendaftar di MEIKO, abaikan email ini.<br>Your MEIKO confirmation code (valid for 10 minutes).</p></div>';
  return { subject: subject, text: text, html: html };
}

module.exports = { issue, check, mail, day, TTL, MAX_TRIES, RESEND_MS, MAX_PER_DAY };
