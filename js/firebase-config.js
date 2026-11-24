/*
 * MEIKO — Firebase web config (from Firebase console → Project settings → Your apps → Web app).
 * These values identify the project; they are not secrets. Access is controlled by Firebase Auth
 * settings (Email/Password enabled, authorized domain aryameiko.github.io).
 * While this is null, MEIKO uses the device-only email step and registration is not mandatory.
 */
window.MEIKO = window.MEIKO || {};
MEIKO.FIREBASE_CONFIG = null;
