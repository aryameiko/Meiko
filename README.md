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
  - *Save visible area* downloads the visible area into `tiles-saved-v1` and keeps it until it is deleted. It saves a few zoom levels, capped at zoom 16 and 4000 tiles, two requests at a time, which keeps it within the OSM tile usage policy.
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

## Port distance tables (v1.8)

**Port-to-Port** shows the sea distance from two TNI AL distance tables supplied by the user: *Tabel Jarak Pangkalan TNI AL WILBAR* (22 western ports) and the eastern *Tabel Jarak* WILTIM (38 ports). The data are in `js/data/distance-tables.js`, transcribed exactly from the PDFs, and the lookup and routing code is in `js/core/seadist.js`. The straight-line distance and bearings are shown alongside.

- **Errors are shown, not corrected.** Where the table's two directions differ, both figures are shown. A figure shorter than the straight line between the ports is marked *doubtful*. Pairs missing from the tables are estimated by chaining table legs and labelled as estimates.
- **New ports.** 37 ports were added to `ports-data.js` with approximate, unverified coordinates.
- **Unidentified codes.** P. Gundul, BLP, MAS and the eastern table's NATUNA could not be identified, so they have no position.

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
