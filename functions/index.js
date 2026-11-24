/*
 * MEIKO — Cloud Functions for email confirmation by a 6-digit code (instead of a link).
 *   sendCode   (callable, signed-in user): makes a code and emails it from the MEIKO Gmail account.
 *   verifyCode (callable, signed-in user): checks the code and marks the account's email as verified.
 * Secrets (Secret Manager): GMAIL_USER, GMAIL_APP_PASSWORD, CODE_SECRET. Deployed by .github/workflows/functions.yml.
 */
'use strict';
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const codes = require('./codes');

admin.initializeApp();
setGlobalOptions({ region: 'asia-southeast2', maxInstances: 5, memory: '256MiB' });
const GMAIL_USER = defineSecret('GMAIL_USER'), GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD'), CODE_SECRET = defineSecret('CODE_SECRET');

function claimsWith(user, vc) { const c = Object.assign({}, user.customClaims || {}); if (vc) c.vc = vc; else delete c.vc; return c; }
function signedIn(req) { if (!req.auth || !req.auth.uid) throw new HttpsError('unauthenticated', 'Please sign in again with your email and password.'); return req.auth.uid; }

exports.sendCode = onCall({ secrets: [GMAIL_USER, GMAIL_APP_PASSWORD, CODE_SECRET] }, async (req) => {
  const uid = signedIn(req), user = await admin.auth().getUser(uid);
  if (user.emailVerified) return { verified: true };
  if (!user.email) throw new HttpsError('failed-precondition', 'This account has no email address.');
  const r = codes.issue(CODE_SECRET.value(), uid, (user.customClaims || {}).vc, Date.now());
  if (r.wait) throw new HttpsError('resource-exhausted', 'Please wait ' + r.wait + ' s before asking for a new code.');
  if (r.limit) throw new HttpsError('resource-exhausted', 'Too many codes today. Try again tomorrow.');
  const m = codes.mail(r.code);
  const tx = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER.value().trim(), pass: GMAIL_APP_PASSWORD.value().replace(/\s+/g, '') } });
  try {
    await tx.sendMail({ from: '"MEIKO" <' + GMAIL_USER.value().trim() + '>', to: user.email, subject: m.subject, text: m.text, html: m.html });
  } catch (e) {
    console.error('sendMail failed', e && e.message);
    throw new HttpsError('unavailable', 'The code email could not be sent right now. Try again in a minute.');
  }
  await admin.auth().setCustomUserClaims(uid, claimsWith(user, r.vc));
  return { sent: true, email: user.email, ttl: codes.TTL / 60000 };
});

exports.verifyCode = onCall({ secrets: [CODE_SECRET] }, async (req) => {
  const uid = signedIn(req), user = await admin.auth().getUser(uid);
  if (user.emailVerified) return { verified: true };
  const vc = (user.customClaims || {}).vc, r = codes.check(CODE_SECRET.value(), uid, vc, (req.data || {}).code, Date.now());
  if (r.ok) {
    await admin.auth().updateUser(uid, { emailVerified: true });
    await admin.auth().setCustomUserClaims(uid, claimsWith(user, null));
    return { verified: true };
  }
  if (r.vc) await admin.auth().setCustomUserClaims(uid, claimsWith(user, r.vc));
  const msg = {
    format: 'Enter the 6-digit code from the email.',
    none: 'No code was sent yet. Tap "Send a new code".',
    expired: 'This code has expired. Tap "Send a new code".',
    tries: 'Too many wrong codes. Tap "Send a new code".',
    wrong: 'Wrong code. ' + r.left + ' tries left.'
  }[r.reason];
  throw new HttpsError('invalid-argument', msg);
});
