/*
 * MEIKO — Firebase web config (from Firebase console → Project settings → Your apps → Web app).
 * These values identify the project; they are not secrets. Access is controlled by Firebase Auth
 * settings (Email/Password enabled, authorized domain aryameiko.github.io).
 * While this is null, MEIKO uses the device-only email step and registration is not mandatory.
 */
window.MEIKO = window.MEIKO || {};
MEIKO.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDyrItkHzz8QSdig4Q818YpFY_lWRvtT5k',
  authDomain: 'meiko-33002.firebaseapp.com',
  projectId: 'meiko-33002',
  storageBucket: 'meiko-33002.firebasestorage.app',
  messagingSenderId: '130685004974',
  appId: '1:130685004974:web:a8eec9e5bb5fcb2a43d13f',
  /* reCAPTCHA v3 site key for Firebase App Check (bot protection). Public by design; empty = App Check off. */
  appCheckSiteKey: ''
};
