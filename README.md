# MEIKO — Navigate • Calculate • Explore

Maritime navigation and everyday utility tools as an installable, offline-capable Progressive Web App.
Plain HTML/CSS/JavaScript, no build step, no dependencies, no backend, no API keys.

## Run it

Any static web server works. Location, compass and offline mode need **https** or **localhost**.

```bash
cd meiko
python3 -m http.server 8080      # then open http://localhost:8080
node tests/run-tests.js           # 63 calculation tests
```

To use it on a tablet, host the folder on any static https host (GitHub Pages, Netlify Drop, Cloudflare Pages),
open it in Safari/Chrome, then **Add to Home Screen** / **Install app**. After the first visit it works offline.

## Tools

| Category | Tools |
|---|---|
| Navigation | Distance (great circle + WGS-84 Vincenty), Port-to-Port, Rhumb Line, Course & Bearing, ETA, Speed·Distance·Time, Coordinate Converter (DD/DDM/DMS, also LU/LS/BT/BB) |
| Calculator | Everyday calculator with %, parentheses, history, keyboard support |
| Unit Converter | Maritime, speed, length, time, angle, temperature |
| Astronomy | Merpass / Local Apparent Noon (with EoT, declination, noon altitude), Sunrise & Sunset (+ civil/nautical twilight) |
| Prayer Tools | Maghrib (Kemenag, MWL, Umm al-Qura, ISNA, Egypt, Jafari, Tehran, custom), Qibla Finder with live compass |
| Position & GPS | Phone/tablet GPS **or an external GPS receiver** (NMEA 0183), accuracy, satellites/HDOP, tracking, NMEA monitor, copy in 3 formats, saved positions |
| Settings | Theme, units, time format, coordinate format, time zone, saved locations, install, about |

## GPS sources (v1.2)

Choose under **Settings → GPS source** or on **Position & GPS**: *Auto* (external receiver when connected and fixed, otherwise phone), *Phone / tablet*, or *External receiver*. Every tool's GPS button uses the selected source.

| Source | How | Works in |
|---|---|---|
| Phone / tablet GPS | Geolocation API. Also covers external receivers the OS already uses (receivers that feed iOS Location Services; Android "mock location" apps fed by a Bluetooth GPS). | All modern browsers |
| USB / serial receiver | Web Serial, NMEA 0183 (GGA, RMC, GLL, VTG), 4800–115200 baud | Chrome / Edge (desktop, Chromebook; Android depends on Chrome version) |
| Bluetooth LE receiver | Web Bluetooth, Nordic UART Service (NUS) | Chrome / Edge on Android and desktop |
| Network (Wi-Fi) | WebSocket from a Signal K server (`wss://host:3443/signalk/v1/stream?subscribe=self`) or a gateway sending NMEA lines. Must be **wss://** when MEIKO runs on https. | All browsers, **including Safari on iPhone/iPad** |
| NMEA test input | Paste sentences, replayed every second | All browsers |

Not supported directly: USB/Bluetooth in Safari/iOS and Firefox (Apple and Mozilla do not implement Web Serial / Web Bluetooth),
classic Bluetooth SPP receivers (use the phone-GPS route), and raw NMEA over TCP/UDP (browsers cannot open raw sockets; use a WebSocket/Signal K bridge).

**iPad / iPhone:** use a receiver that supports iOS Location Services (e.g. Bad Elf, Garmin GLO 2, Dual XGPS — check the maker's iOS support)
with GPS source on Auto/Phone, or the Network (Wi-Fi) source. Wi-Fi-only iPads have no GPS chip.
The **Location permission** panel (Position & GPS and Settings) shows the permission state, asks for access, and gives step-by-step
instructions for iOS (Settings → Privacy & Security → Location Services → Safari Websites), Android and desktop when access is blocked.
External accuracy is estimated as HDOP × 5 m. Checksums are verified; bad sentences are shown as rejected in the NMEA monitor.

## Map (v1.3)

`js/modules/map.js` uses Leaflet 1.9.4, bundled in `assets/vendor/leaflet/`, with no API key.

- **Layers:**
  - Street map: OpenStreetMap
  - Satellite: Esri World Imagery, plus a place-name overlay
  - Sea marks: OpenSeaMap
  - Offline: a world outline that ships with the app (Natural Earth 1:50m, public domain; via world-atlas, rendered with topojson-client)
- **Picking a point:** tap the map to see the point in DD, DDM and DMS. From there you can copy it, save it, open it in Google Maps or Google Earth (links only), or send it to Distance, Rhumb, Course, Coordinates, Qibla, Sun, Merpass or Maghrib. Every coordinate field also has a **Map** chip that opens a picker sheet.
- **Route mode:** tap waypoints to see each leg's great-circle distance and initial course, plus the total.
- **GPS:** shows the current fix with its accuracy circle. It uses the same sources as the rest of the app: phone or external receiver.
- **Offline:**
  - The service worker keeps tiles as you view them (`tiles-seen-v1`, newest ~2000).
  - *Save visible area* downloads the visible satellite area (plus sea marks if on) into `tiles-saved-v1` and keeps it until it is deleted. It saves a few zoom levels, capped at zoom 16 and 4000 tiles, two requests at a time. Since v1.12 the OpenStreetMap street map is never bulk-saved, because the OSMF tile usage policy forbids "download for offline" on tile.openstreetmap.org; OSM tiles saved by older versions are purged once.
  - With no signal the built-in outline is always available.
- **Provider hook:** `MEIKO.map.addBaseLayer({ id, label, create(L) })` adds another base layer, for example Google Map Tiles once a key exists.
- **Terms:** check the Esri imagery and OSM tile terms before commercial or high-traffic use. Self-hosted or paid tiles may be needed then.

## Track planner (v1.4)

The Track planner is the `track` tool in Navigation, which is also the Map's **Track** mode. The UI is in `js/modules/track.js` and the maths and GPX handling are in `js/core/track.js`.

- **Waypoints:**
  - Add them by tapping the map, typing coordinates, using the GPS fix, or with "Add to track" from Pick point.
  - Drag them on the map.
  - Rename, edit, move up or down, insert, delete, or reverse the order.
- **Per leg:**
  - Shows the true course, magnetic course, distance, time and ETA from speed and departure.
  - Legs are rhumb lines (constant course, the default) or great circles, which show the initial and final course.
  - Leg labels are drawn on the map.
- **Magnetic variation:**
  - By default it comes from the World Magnetic Model 2025 (`js/core/wmm.js`, NOAA/BGS coefficients, valid 2025–2029). It is checked against the official WMM2025 test values to within 0.005°.
  - It can also be entered by hand from a chart.
  - Deviation and local anomalies are not included.
- **Storage:**
  - Saved tracks are stored on the device under `tracks`, and the track being edited is kept as a draft under `track:draft`. Both work offline.
  - GPX 1.1 export uses `<rte>`. GPX import reads routes, tracks (thinned to 500 points) and waypoints.

## My Vessel (v1.5)

The vessel avatar is in `js/modules/vessel.js`, in the Settings category. Users choose from 8 vessel types: sailboat, pinisi, speedboat, passenger ship, container ship, tanker, fishing boat and tug. The drawings are original flat SVGs in two views: a side profile and a top view used as the map marker.

- **Customising:** hull, superstructure or sails, and accent colours, from a palette or a custom colour picker. Users also set a name, and optionally a call sign and home port.
- **Storage:** saved on the device only, under the storage key `vessel`.
- **Dashboard:** the hero shows the avatar and name, or a "Create your vessel" link if none is set.
- **Map:** the vessel is the own-ship GPS marker, rotated to course over ground when the fix has a heading and the speed is above 0.5 m/s. Otherwise it shows a side-view badge.

## Live navigation (v1.6)

The live navigation panel sits under the map, on both the Map page and the Track Planner. The UI is `js/modules/livenav.js` and the maths is `js/core/livenav.js`, which has unit tests.

- **Start GPS:** continuous GPS from the phone or an external receiver, with the screen kept awake (Wake Lock) where supported. It shows:
  - COG and SOG in knots, smoothed over about 5 s. COG is a speed-weighted vector average, so it handles the 359°/001° wrap and is held when stopped.
  - The position.
  - If the fix has no speed or course, they are derived from consecutive fixes.
- **Following a track:** start it with *Navigate* in the Track Planner, or *Follow a track* in the panel. It shows:
  - Next waypoint, BRG, DTW, and XTE (+ means right of track), with steering hints.
  - VMG.
  - ETA to the next and the last waypoint, from live SOG, or the planned speed when SOG is under 0.5 kn.
  - Distance to the end.
- **Waypoint advance:** automatic on arrival, inside the arrival radius (default 0.05 NM) or once past the perpendicular at the waypoint, with a toast and a vibration. There are also manual previous/next buttons.
- **Signal loss:** the panel keeps showing the last fix and keeps trying.
- **Saved state:** the route being followed is stored under `nav:active`, so it survives reloads and works offline.

## Stars & constellations (v1.7)

Three tools under **Astronomy**, all offline:

- **Star Photo · Identify & Position.** Take or choose a night-sky photo. MEIKO detects the stars, matches triangle shapes against an offline Hipparcos catalogue (`js/core/platesolve.js`), and overlays constellation lines and names (with Indonesian names such as Gubuk Penceng, Waluku, Biduk, Kalajengking). It marks the celestial pole, or shows an arrow toward it: the horizon point below the pole is true north or south, and finding it needs no time or position. With the photo time (read from EXIF when present) and an approximate position, it also gives the camera bearing. If the sea horizon is in the photo, the user taps it at two points. Each star then becomes an altitude, corrected for dip and refraction, and a least-squares fix gives a **rough** position (tens of NM).
  - A match is accepted only when far more catalogue stars land on detections than chance would allow. Random points are rejected rather than guessed.
  - Planets and the Moon are not identified.
- **Sky Chart · Constellations.** A polar chart of the sky for a given time and position, plus the navigational stars with their altitude and bearing, and cues from Polaris and Crux.
- **Star Sight Reduction · Fix.** Enter sextant Hs, time, IE and height of eye for 2 to 8 stars. MEIKO gives Ho, Hc, Zn and the intercept for each, a least-squares fix and a plot of the lines of position.

Star positions use GMST (IAU 1982) and precession (IAU 1976). Nutation, aberration and proper motion are ignored, which leaves an error of about 1′. Data come from d3-celestial (BSD-3, HYG/Hipparcos); see `js/data/LICENSE-d3-celestial`.

## Registration with Firebase (v1.9.7)

Paste the Firebase web config into `js/firebase-config.js` (`MEIKO.FIREBASE_CONFIG = {...}`). With a config present, onboarding becomes **mandatory**: create an account with email + password (Firebase sends a verification link) or sign in, confirm the email, then nickname and vessel avatar. Firebase Auth (app + auth only) is bundled in `js/vendor/firebase-auth.js`, so no CDN is used. Sign-in needs internet once; afterwards the gate only checks the profile saved on the device, so MEIKO opens offline. *Settings → Account* shows the email, lets users change their nickname and sign out. Without a config the screens stay a device-only preview.

## First-run onboarding (v1.9.6, preview)

`js/onboarding.js` adds Welcome → Email → Nickname → Vessel avatar → Done. It is **not mandatory yet** (`REQUIRED = false`) while the login method is decided; preview it with `?welcome` or `#/welcome`. Registration goes through `js/auth.js` (`MEIKO.auth`): today the `local` provider only checks the email format and stores it on the device (no verification email); a provider such as Firebase Auth can be plugged in with `MEIKO.auth.use({...})` without changing the screens. The nickname is used as the name in Fleet & Chat; the email is never shared there.

## Fleet & Chat (v1.9.0)

**Fleet & Chat** (Navigation menu) lets vessels that enter the same group code see each other on a map (name, vessel avatar, COG/SOG, last seen) and chat. There is no MEIKO server and no account: messages go through free public Nostr relays (`wss://relay.damus.io`, `nos.lol`, `relay.primal.net`, `offchain.pub`; editable under *How it works*).

- **Privacy.** A key is derived from the group code (PBKDF2-SHA-256) and everything is encrypted with AES-GCM, so relays only see a random-looking tag and ciphertext. Anyone with the code can read the group. Position sharing is off until the user switches it on.
- **Private chat (v1.9.1, simplified in v1.9.4).** Tap a vessel icon on the map (or its row in the list) to see its data (type, call sign, position, COG/SOG, distance and bearing from you, last seen) with a **Chat** button that opens the one-to-one chat; no extra code is needed. The text is encrypted again with a key only those two devices can compute (secp256k1 ECDH of the device keys → HKDF-SHA-256 → AES-GCM) and then wrapped in the group layer. The recipient is not written in the message; each device tries the key it shares with the sender, so other members cannot read it or see who it is for. An optional *Verify* number (identical on both phones) can be compared by VHF or phone for very sensitive information. Limits: relays and members can see that someone sent a private message and when; there is no forward secrecy (the device key does not rotate); an unlocked phone shows its messages.
- **Navigational status (v1.9.5).** Each user sets *My status* (AIS codes: under way using engine, under way sailing, at anchor, moored/in port, engaged in fishing, restricted manoeuvrability, constrained by draught, not under command, aground). It is sent with every live message and shown as a coloured badge on the map label, in the vessel list and in the vessel sheet. While sharing, MEIKO suggests *At anchor / Moored* after 5 minutes without moving, and *Under way / Sailing* when moving above 2 kn with a stationary status; it never changes the status by itself.
- **Photos and files (v1.9.2).** The paperclip offers *Take photo* (camera), *Photo from gallery* and *Document / file*; the phone's own permission prompt appears, and a blocked camera shows how to re-allow it. Photos are compressed to ≤1280 px / about 300 KB JPEG; other files up to 512 KB. Files are sent as 16 KB encrypted parts (group key, or the private key for private chats), so every relay event stays under about 40 KB; the receiver checks size and order and keeps the file in IndexedDB. Relays may rate-limit or drop parts, so large files are less reliable than text.
- **Behaviour.** Positions are sent every 30 s while MEIKO is open and are not stored by relays. Chat is stored by relays for up to 2 days (NIP-40 expiry) so late joiners can read it, and the last 100 messages stay on the device. Online = heard from in the last 3 minutes.
- **Limits.** Both sides need internet; public relays can be slow or down; phones pause web apps in the background. It is not a safety or distress system: use VHF/DSC and AIS. A commercial version with guaranteed delivery and history would need a proper backend (for example Firebase or Supabase under the owner's account).
- **Code.** Protocol and crypto in `js/core/fleet.js` (tests in `tests/fleet-tests.js` with an in-memory relay), UI in `js/modules/fleet.js`, signing library bundled in `js/vendor/nostr-crypto.js` (@noble/curves + @noble/hashes, MIT).

## Languages, country & language at sign-up (v1.14.0)
- UI in Bahasa Indonesia, English, Bahasa Melayu, Filipino, Tiếng Việt, ไทย and 简体中文. The language is picked on the welcome screen or in Settings → Appearance (default: the phone's language).
- The code stays in English; `js/i18n.js` translates the page text as it is drawn. Translations live in `i18n/en.txt` (English, one string per line) and `i18n/translations.txt` (`n|id|ms|tl|vi|th|zh`, empty = keep English). Run `node tools/i18n-build.js` to regenerate `js/lang/*.js`, then bump `CACHE_VERSION`.
- Privacy Policy and Terms stay in Indonesian (the official version); other languages show a note.
- Sign-up asks for country (or "Prefer not to say") and language. They are saved on the device and in Firestore `users/{uid}` (country, language, createdAt, updatedAt only). Existing accounts are asked once. Each user writes only their own document; the owner sees "Users by country" in Settings → Account once the Firestore rules allow it.

## Public fleet (v1.13.0)

- **Online vessels see each other without a code.** After sign-in MEIKO joins the *public fleet* automatically (`PUBLIC_CODE` in `js/core/fleet.js`, same relays and protocol). Other online vessels show in Fleet & Chat **and on the main Map**; tap one for its data and **Chat** (private, end-to-end encrypted as before).
- **Position shared by default** (Meiko's choice). The first time, a notice *"Kapal Anda terlihat di peta"* says so, with *Sembunyikan posisi saya*. *Go offline* leaves the public fleet (`publicOff`).
- **General Group**: the public fleet's group chat, opt-in (`cfg.general`, *Join General Group*). Not private (public key), not moderated: tap a name → **Block** (`cfg.blocked`, hides vessel and messages on this phone) or **Report** (prefilled GitHub issue with the vessel ID). Private groups with a code still exist.
- Privacy Policy and Terms updated (version `2026-11-24.2`); signed-in users are asked to agree once more.

## Security (v1.13.2)

- **Content-Security-Policy** in `index.html` (and the legal pages): scripts only from MEIKO itself and Google sign-in (`apis.google.com`, `www.google.com`, `www.gstatic.com`), no inline scripts (the theme pre-paint script moved to `js/theme-boot.js`), no plugins, no `<base>` change. Images/tiles only from the map hosts, `data:` and `blob:`; network only to Firebase Auth, the map hosts and `ws:`/`wss:` (Nostr relays, network GPS). When you add a new outside service, add its host to the policy or it is blocked.
- **Service worker:** only a good copy of the app page itself is kept as the offline page (before, opening `privacy.html` or getting an error page could replace it). Only same-origin, successful responses are cached.
- **Fleet & Chat:** names and file names lose invisible direction / zero-width characters (they could disguise `photo\u202Egpj.apk` as `photokpa.jpg`); events with a non-numeric time are ignored. Saving a received file that is not a photo or video asks first, with a strong warning for program files (`.apk`, `.exe`, `.html`, `.svg`, …): MEIKO cannot scan files for viruses.
- Fleet page: a tap no longer opens two sheets after you leave and return to Fleet & Chat (click listeners from earlier visits now ignore clicks).
- **Public fleet key only for MEIKO accounts.** The public fleet's key is no longer in the code (anyone can download that). After sign-in the app reads it from Firestore (`config/fleet`, field `key`, REST call with the user's Firebase ID token, `MEIKO.auth.fleetKey`), keeps it on the device for offline restarts and checks for a new one every 6 hours. Firestore rules: `match /config/fleet { allow read: if request.auth != null; allow write: if false; }`. To change the key (e.g. if it leaked), edit the field in the Firebase console; apps move to the new key within 6 hours. Without a key the app does not join the public fleet and shows why. `PUBLIC_CODE` in `js/core/fleet.js` is now used only by the tests.
- **Bot protection (Firebase App Check + reCAPTCHA Enterprise / Google Cloud Fraud Defense).** `js/vendor/firebase-auth.js` now also bundles `firebase/app-check` (firebase@11.10.0, esbuild). Set `appCheckSiteKey` in `js/firebase-config.js` to the reCAPTCHA Enterprise key ID (Google Cloud console → Security → reCAPTCHA, project meiko-33002, score-based web key for aryameiko.github.io) to switch it on; `appCheckProvider: 'v3'` would use the deprecated classic v3. Free without billing up to 10,000 assessments a month (then requests fail until the next month, which would block sign-in while enforced); Auth then sends App Check tokens automatically and the Firestore key request sends `X-Firebase-AppCheck`. Enforcement is switched on per service in the Firebase console (App Check → APIs → Authentication, Cloud Firestore), only after the new version is live. The reCAPTCHA badge is hidden and the sign-in screen shows Google's notice instead. Terms forbid bots/automated accounts; Privacy Policy lists reCAPTCHA/App Check and Firestore (legal version `2026-11-25.1`, users agree once more).
- Vendor files checked against npm: `leaflet@1.9.4` (js, css) and `topojson-client@3.1.0` are byte-identical to the official packages.

## Fixes (v1.13.1)

- **Fleet flood guard:** the public fleet is open to everyone, so at most 8 messages per vessel per minute are accepted (group and private); more are dropped.
- **Storage:** photos, videos and files received in Fleet & Chat are deleted from the phone after 3 days (the relays drop chat after the same time). Vessels not heard from for 6 hours are removed from the list.

## Fixes (v1.12.1)

- **GPS source Auto:** a running GPS watch (live navigation, *Track*, Fleet sharing) now moves to an external receiver when it is connected, and falls back to the phone GPS when the receiver is unplugged, instead of stopping. Changing the GPS source in Settings restarts a running watch on the new source.
- **My Position → Track** keeps tracking through a short loss of GPS signal (like live navigation), instead of stopping on the first timeout.
- **Fleet & Chat:** reconnects to the relays as soon as MEIKO is opened again after the phone slept (before, it could wait up to a minute); a lost GPS signal is reported once instead of every 30 s; files received from other vessels are only shown as photo or video when they really are one, anything else is a plain download (a received web page can never run inside MEIKO).
- **Sign-in:** after signing out and back in with the same account, the nickname is remembered on this device. Going online or offline on the sign-in screen no longer clears the typed password.
- **Settings → Clear all local data** now also signs out and returns to the welcome screen (it deleted the registration but left the app open).

## Fixes (v1.9.3)

- **GPS shared between tools.** Several tools can now watch the GPS at once. Before, pressing *Stop GPS* in live navigation, or leaving *My Position*, switched the GPS off for everyone, so Fleet & Chat position sharing silently stopped. Sharing off now also switches the GPS off again.
- **Live navigation:** the *Planned speed* and *Arrival radius* fields no longer reset while you type (the panel was redrawn on every GPS fix).
- **Qibla live compass:** if the variation field is empty, the magnetic Qibla uses the built-in World Magnetic Model 2025 (works offline). The permission message now covers Chrome as well as Safari.
- **Map:** leaving the map while *Save visible area* was still downloading no longer causes an error.

## Course & Bearing map (v1.8.5)

**Course & Bearing** has a map under the two positions. Tap the map to set A (departure) and then B (destination), or type the positions. The map shows the great circle (solid, with direction arrows), the rhumb line (dashed), the initial course at A and the final bearing at B. It works offline on the bundled outline map.

## Port distance tables (v1.8)

**Port-to-Port** shows an estimated sea distance from distance tables supplied by the user: the 2026 combined update (54 ports, `.xlsx`, used first), then the older western (22 ports) and eastern (38 ports) PDF tables for pairs the update does not cover. The UI deliberately shows no table names (the app is for public use). The data are in `js/data/distance-tables.js`, transcribed exactly from the PDFs, and the lookup and routing code is in `js/core/seadist.js`. The straight-line distance and bearings are shown alongside.

- **Errors are shown, not corrected.** Where the table's two directions differ, both figures are shown. A figure shorter than the straight line between the ports is marked *doubtful*. Pairs missing from the tables are estimated by chaining table legs and labelled as estimates.
- **Port positions (v1.8.4).** Positions are taken from published harbour points, in this order: the SMDG Terminal Code List, the Kemenhub/Dephub port point datasets, then the NGA World Port Index (1′ precision). Each record's `source` names where its position came from. Ranai, Teluk Ratai, Miangas and Dili have no source point and remain MEIKO estimates (`source: null`). A test checks that no port lies more than 4 km inland of the Natural Earth 10 m coastline (river ports such as Palembang, Pontianak and Banjarmasin are exempt). The offline base map is coarse, so at low zoom a harbour can still appear to sit on land.
- **Unidentified codes.** P. Gundul, BLP, MAS and the eastern table's NATUNA could not be identified, so they have no position.

## Privacy, terms and licences (v1.12)

- `privacy.html` (Kebijakan Privasi, written against UU PDP No. 27/2022) and `terms.html` (Syarat Penggunaan) are plain public pages, so they can be linked from the Google OAuth consent screen. The app shows the same text from those files (`js/modules/legal.js`, tools `privacy`, `terms`, `licenses` under Settings). Both are in Bahasa Indonesia.
- Onboarding requires a consent tick (age 18+ or parental consent, policy, terms, storage in Firebase outside Indonesia) before Google or email sign-up. It is saved in the profile as `consent: { v, at, age18 }`. When `MEIKO.legal.VERSION` changes, signed-in users must agree again.
- Settings → Account → **Delete account** re-authenticates (password or Google), deletes the Firebase user (`deleteUser`), and wipes local storage, the Fleet file store and saved map tiles. The Firebase bundle now also exports `deleteUser`, `reauthenticateWithCredential`, `reauthenticateWithPopup` and `EmailAuthProvider`.
- Not legal advice. Owner actions still open: PSE registration (Komdigi/OSS) if required, a contact email in the policy, the policy URL in the Google OAuth consent screen, Esri terms for satellite tiles, and confirming the TNI AL distance tables may be published.

## Accuracy & data status

- **Port coordinates: sample / unverified.** Approximate harbour positions; each record has `verified: false`. Verify against official charts / port authority data, then set `verified: true` and `source`.
- **Kemenag RI parameters: unverified.** Maghrib = sunset + 2 min ihtiyat (commonly cited). Not yet checked against an official Kemenag publication.
- Kaaba: 21.4225° N, 39.8262° E (approximate, as specified).
- Solar: NOAA/Meeus equations, solved iteratively. Sunrise/sunset ±1 min (lat < 72°); merpass within seconds. Use the Nautical Almanac for celestial navigation.
- Distances are straight-line geographic distances, **not** navigable routes.

MEIKO is a calculation aid. It does not replace official nautical charts, approved navigation systems,
official nautical publications or professional navigational judgement.

## Structure

```
index.html  manifest.json  service-worker.js
css/style.css
assets/icons/            SVG logo + PNG app icons
js/core/                 pure, tested maths (geo, coords, units, navcalc, solar, prayer, qibla, calc, nmea)
js/data/ports-data.js    port database (easy to extend)
js/i18n.js storage.js settings.js features.js ui.js gps.js app.js
js/modules/              one file per feature area (UI only)
tests/run-tests.js       node tests for the core modules
```

## Ready for later

- `features.js`: every tool has a `tier`; `entitlements.canUse()` is the single hook for a future Pro version.
- `i18n.js`: English + Indonesian category labels; add strings and a language selector to localise.
- `storage.js`: namespaced, versioned keys and a change listener for future cloud sync.
- Core maths is DOM-free and runs in Node, so it can be reused for PDF export or a server.

When you change any file, bump `CACHE_VERSION` in `service-worker.js` so installed copies update.
