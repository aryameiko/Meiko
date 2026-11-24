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
