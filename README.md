# SkyCast — Weather Intelligence Dashboard

[![SkyCast quality](https://github.com/ParBproject/skycast/actions/workflows/quality.yml/badge.svg)](https://github.com/ParBproject/skycast/actions/workflows/quality.yml)
[![HTML](https://img.shields.io/badge/HTML5-CSS3-JavaScript-E34F26?logo=html5&logoColor=white)](https://parbproject.github.io/skycast/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://parbproject.github.io/skycast/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f)](https://parbproject.github.io/skycast/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p align="center">
  <a href="https://parbproject.github.io/skycast/">
    <img src="SC/skycast-dashboard-2026.svg" alt="SkyCast searchable weather intelligence dashboard" width="1000">
  </a>
</p>

<p align="center">
  <strong>An installable, resilient weather and atmospheric intelligence dashboard with global location discovery.</strong><br>
  Search + geolocation • Air quality + UV + pollen • Favorites • Shareable forecasts • Hourly + 7-day outlook • Offline fallback
</p>

<p align="center">
  <a href="https://parbproject.github.io/skycast/"><strong>Open Live Dashboard →</strong></a>
</p>

SkyCast turns live Open-Meteo forecast, geocoding, and atmospheric data into a focused client-side data product. It combines global city/postal-code discovery, browser geolocation, European AQI interpretation, particulate and ozone readings, UV exposure, seasonal pollen, current weather, a 12-hour outlook, seven-day planning, native visualization, installability, and explicit last-known-data fallback without a framework, backend, or API key.

## Product Highlights

- Global city and postal-code search through the Open-Meteo Geocoding API
- Browser geolocation for one-click local forecasts
- 22 curated European presets for fast exploration
- Favorite locations stored locally with coordinate-based deduplication and an eight-location cap
- Shareable forecast URLs that preserve latitude, longitude, display name, and temperature unit
- Current modeled conditions plus next-12-hours temperature, condition, precipitation probability, and wind
- Seven-day high/low temperatures, WMO weather-code summaries, rain risk, wind, gusts, and daylight details
- European Air Quality Index interpretation with Good → Extremely poor bands
- PM2.5, PM10, ozone, UV index, dominant AQI pollutant, and highest available seasonal pollen signal
- Independent short-lived atmospheric cache so weather remains usable if air-quality data fails
- Native SVG high/low temperature trend chart rendered in the browser
- Dynamic hero artwork for clear, cloudy, rainy, and snowy conditions
- Installable Progressive Web App with a versioned offline application shell
- 24-hour last-successful weather cache per location/unit and 3-hour atmospheric cache per coordinate
- Request cancellation and sequence guards against stale async responses
- Modular frontend architecture with independently tested forecast, location, and atmospheric domains
- Behavioral Node tests plus Python structural/PWA regression tests
- Fully client-side deployment with no framework, backend, API key, or runtime dependency

## Forecast Experience

<p align="center">
  <img src="SC/skycast-forecast-2026.svg" alt="SkyCast seven-day forecast cards and temperature trend" width="1000">
</p>

## Architecture

SkyCast keeps browser responsibilities thin and isolates logic that can be tested without a DOM.

```text
Open-Meteo Forecast API   Open-Meteo Geocoding API   Open-Meteo Air Quality API
          │                         │                           │
          ▼                         ▼                           ▼
src/forecast-core.js       src/location-core.js       src/air-quality-core.js
weather URL + validation   search + coordinates       AQI/UV bands + validation
normalization + WMO        favorites + share state    pollutant/pollen derivation
cache helpers + insights   geocoding normalization    atmospheric cache rules
          │                         │                           │
          └──────────────┬──────────┘                 ┌─────────┘
                         ▼                            ▼
                      app.js                   air-quality.js
          weather/location controller          isolated air controller
                         │                            │
                         └───────────┬────────────────┘
                                     ▼
                    index.html + scoped CSS modules
                                     │
                                     ▼
                         service worker + manifest
                         installable / offline shell
```

The three pure core modules are loaded directly by the browser and imported by Node tests. Atmospheric loading is intentionally isolated from the main weather controller so a failed CAMS/Open-Meteo air-quality request cannot take down the core forecast experience.

## Data Flow and Reliability

Weather requests return current, hourly, and daily Open-Meteo forecast data. `forecast-core.js` validates and normalizes that payload into a compact model used by the renderers and 24-hour last-known weather cache.

Location discovery is separate: `location-core.js` validates queries and coordinates, normalizes geocoding results, deduplicates favorites, and encodes/decodes shareable URL state. Selecting a search result, preset, favorite, or browser location feeds the same forecast pipeline.

Atmospheric data comes from the Open-Meteo Air Quality API backed by CAMS. `air-quality-core.js` interprets European AQI bands, selects the dominant pollutant component, summarizes the highest available pollen type, classifies UV exposure, and normalizes particulate/ozone values. The browser controller maintains a coordinate-specific three-hour atmospheric cache and falls back to it independently of weather data.

Both live domains use request cancellation and stale-response protection. Network-derived information is never silently presented as fresh: weather and atmospheric fallback states are explicitly labeled.

## Progressive Web App

SkyCast includes:

- `manifest.webmanifest` for standalone installation metadata
- `assets/app-icon.svg` as the application icon
- `sw.js` with versioned application-shell caching
- install-prompt handling in supported browsers
- cache cleanup when a new shell version activates
- offline navigation fallback to the cached dashboard shell
- separate application-level weather and atmospheric data caches with different TTLs

The service worker caches only same-origin application assets. Forecast, geocoding, and air-quality requests remain under the application data layer so dynamic data freshness stays explicit.

## Technical Approach

| Area | Implementation |
|---|---|
| Application shell | Semantic `index.html` |
| Styling | Responsive `styles.css` + scoped feature styles |
| Main controller | `app.js` for weather rendering, search, geolocation, favorites, sharing, and PWA events |
| Air controller | `air-quality.js` for atmospheric requests, cancellation, rendering, and fallback |
| Forecast domain | `src/forecast-core.js` shared by browser and Node tests |
| Location domain | `src/location-core.js` shared by browser and Node tests |
| Atmospheric domain | `src/air-quality-core.js` shared by browser and Node tests |
| Weather data | Open-Meteo Forecast API |
| Location discovery | Open-Meteo Geocoding API / GeoNames-backed location data |
| Atmospheric data | Open-Meteo Air Quality API / CAMS ENSEMBLE |
| Air-quality model | European AQI + component indices, PM2.5, PM10, ozone, UV and pollen |
| Visualization | Native SVG temperature chart generated from live data |
| User state | `localStorage` for location, unit, favorites, and last-successful caches |
| Share state | URL query parameters for coordinates, location label, and unit |
| Request safety | `AbortController` + sequence guards per live data domain |
| Offline shell | Versioned Service Worker + Cache Storage |
| Unit testing | Node built-in `assert`, no third-party test framework |
| Structural/PWA tests | Python standard-library `unittest` |
| CI | GitHub Actions on pushes, pull requests, and manual runs |
| Deployment | GitHub Pages |

## Quality Checks

The CI pipeline runs structural regression checks, JavaScript syntax validation, and behavioral unit tests.

Python checks verify required dashboard/search/atmospheric regions, local asset integrity, modular architecture, provider wiring, curated city coverage, PWA contracts, CAMS attribution, offline isolation, README previews, and legacy routing.

Forecast-core Node tests cover seven-day normalization, the 12-hour slice, malformed payload rejection, Celsius/Fahrenheit request parameters, WMO fallback, compass/time formatting, cache TTL boundaries, and derived weekly insights.

Location-core Node tests cover coordinate bounds, geocoding request construction, result normalization, duplicate suppression, favorite add/remove behavior, favorites limits, and share-link round trips.

Air-quality-core Node tests cover API URL construction, invalid coordinates, European AQI thresholds, UV bands, dominant pollutant selection, pollen handling, payload normalization, coordinate-specific cache keys, and TTL boundaries.

Run all checks locally with:

```bash
python -m unittest discover -s tests -v
node tests/forecast-core.test.js
node tests/location-core.test.js
node tests/air-quality-core.test.js
```

## Project Structure

```text
skycast/
├── .github/workflows/quality.yml
├── assets/
│   ├── app-icon.svg
│   └── hero-{clear,cloud,rain,snow}.svg
├── SC/
│   ├── skycast-dashboard-2026.svg
│   └── skycast-forecast-2026.svg
├── src/
│   ├── forecast-core.js
│   ├── location-core.js
│   └── air-quality-core.js
├── styles/
│   ├── location.css
│   └── air-quality.css
├── tests/
│   ├── forecast-core.test.js
│   ├── location-core.test.js
│   ├── air-quality-core.test.js
│   ├── test_project.py
│   ├── test_pwa.py
│   └── test_air_quality.py
├── app.js
├── air-quality.js
├── styles.css
├── index.html
├── manifest.webmanifest
├── sw.js
├── european_weather_forecast.html
├── CONTRIBUTING.md
└── LICENSE
```

## Run Locally

```bash
git clone https://github.com/ParBproject/skycast.git
cd skycast
python -m http.server 8000
```

Open `http://localhost:8000` in a browser. Service workers and geolocation are available in supported browsers on `localhost`; production is served over HTTPS by GitHub Pages.

## Skills Demonstrated

API integration, multi-source data products, geocoding, browser geolocation, URL state design, asynchronous JavaScript, modular frontend architecture, payload validation, data normalization, AQI interpretation, environmental-data modeling, race-condition prevention, WMO weather-code mapping, SVG data visualization, responsive product UI, PWA architecture, service workers, browser caching, offline fallback design, local-state persistence, accessibility-aware frontend design, unit testing, regression testing, CI/CD, and static-site deployment.

## Credits

Weather forecasts and geocoding are provided through [Open-Meteo](https://open-meteo.com/); geocoding location data is based on GeoNames. Air-quality and pollen data are provided through Open-Meteo from the Copernicus Atmosphere Monitoring Service (CAMS) ENSEMBLE. Dashboard interface, normalization, caching strategy, visualization, tests, and visual assets are maintained in this repository.
