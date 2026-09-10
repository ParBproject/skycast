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
  <strong>An installable, resilient weather intelligence dashboard with global location discovery.</strong><br>
  Search + geolocation • Favorites • Shareable forecasts • Next 12 hours • 7-day outlook • Offline fallback
</p>

<p align="center">
  <a href="https://parbproject.github.io/skycast/"><strong>Open Live Dashboard →</strong></a>
</p>

SkyCast turns live Open-Meteo data into a focused weather data product. It combines global city/postal-code search, browser geolocation, favorite locations, shareable URL state, current conditions, a 12-hour outlook, seven-day planning, native visualization, installability, and explicit last-known-data fallback in a dependency-free client-side application.

## Product Highlights

- Global city and postal-code search through the Open-Meteo Geocoding API
- Browser geolocation for one-click local forecasts
- 22 curated European presets for fast exploration
- Favorite locations stored locally with coordinate-based deduplication and an eight-location cap
- Shareable forecast URLs that preserve latitude, longitude, display name, and temperature unit
- Current modeled conditions plus next-12-hours temperature, condition, precipitation probability, and wind
- Seven-day high/low temperatures, WMO weather-code summaries, rain risk, wind, gusts, and daylight details
- Celsius/Fahrenheit switching with matching wind and precipitation units
- Native SVG high/low temperature trend chart rendered in the browser
- Dynamic hero artwork for clear, cloudy, rainy, and snowy conditions
- Installable Progressive Web App with a versioned offline application shell
- 24-hour last-successful-forecast cache per location/unit
- Request cancellation and sequence guards against stale async forecast responses
- Modular frontend architecture with separate markup, styling, controller, forecast-domain, and location-domain logic
- Behavioral Node tests plus Python structural/PWA regression tests
- Fully client-side deployment with no framework, backend, API key, or runtime dependency

## Forecast Experience

<p align="center">
  <img src="SC/skycast-forecast-2026.svg" alt="SkyCast seven-day forecast cards and temperature trend" width="1000">
</p>

## Architecture

SkyCast keeps browser responsibilities thin and isolates logic that can be tested without a DOM.

```text
Open-Meteo Forecast API             Open-Meteo Geocoding API
          │                                   │
          ▼                                   ▼
src/forecast-core.js                 src/location-core.js
URL construction                     query construction
payload validation                    coordinate validation
normalization                         result normalization
WMO mapping                           favorites / deduplication
cache helpers                         share-link parsing
          │                                   │
          └───────────────┬───────────────────┘
                          ▼
                       app.js
        fetch lifecycle • AbortController • rendering
      localStorage • geolocation • favorites • URL state
                  PWA install / offline state
                          │
                 ┌────────┴────────┐
                 ▼                 ▼
             index.html        styles.css +
             semantic UI      styles/location.css
                 │
                 ▼
          service worker + manifest
          installable / offline shell
```

Both pure core modules are loaded directly by the browser and imported by Node tests. The project therefore stays framework-free while still having testable domain boundaries.

## Data Flow and Reliability

A forecast request returns current, hourly, and daily Open-Meteo weather data. `forecast-core.js` validates and normalizes that payload into a compact model used by the renderers and last-known forecast cache.

Location search is separate: `location-core.js` validates queries and coordinates, normalizes Open-Meteo geocoding results, deduplicates favorites, and encodes/decodes shareable URL state. Selecting a search result, preset, favorite, or browser location feeds the same forecast pipeline.

The controller protects against rapid forecast changes with `AbortController` and a request-sequence guard. Live weather responses are not silently cached by the service worker; fallback data is explicitly labeled as cached and includes its age.

## Progressive Web App

SkyCast includes:

- `manifest.webmanifest` for standalone installation metadata
- `assets/app-icon.svg` as the application icon
- `sw.js` with versioned application-shell caching
- install-prompt handling in supported browsers
- cache cleanup when a new shell version activates
- offline navigation fallback to the cached dashboard shell
- a separate normalized forecast cache with a 24-hour TTL

The service worker caches same-origin application assets, including both core modules and location-specific styles. Live forecast and geocoding requests stay under the application data layer so network-derived information is never silently presented as fresh.

## Technical Approach

| Area | Implementation |
|---|---|
| Application shell | Semantic `index.html` |
| Styling | Responsive `styles.css` + `styles/location.css` |
| Controller | `app.js` for DOM rendering, requests, browser state, favorites, sharing, and PWA events |
| Forecast domain | `src/forecast-core.js` shared by browser and Node tests |
| Location domain | `src/location-core.js` shared by browser and Node tests |
| Weather data | Open-Meteo Forecast API |
| Location discovery | Open-Meteo Geocoding API / GeoNames-backed location data |
| Current conditions | Temperature, apparent temperature, humidity, cloud cover, wind, gusts, weather code |
| Hourly forecast | Next 12 hours of temperature, apparent temperature, rain probability, condition, and wind |
| Daily forecast | High/low temperature, precipitation probability, wind, gusts, sunrise/sunset, weather code |
| Visualization | Native SVG temperature chart generated from live data |
| User state | `localStorage` for location, unit, favorites, and last-successful forecast cache |
| Share state | URL query parameters for coordinates, location label, and unit |
| Request safety | `AbortController` + sequence guard |
| Offline shell | Versioned Service Worker + Cache Storage |
| Unit testing | Node built-in `assert`, no third-party test framework |
| Structural/PWA tests | Python standard-library `unittest` |
| CI | GitHub Actions on pushes, pull requests, and manual runs |
| Deployment | GitHub Pages |

## Quality Checks

The CI pipeline runs structural regression checks, JavaScript syntax validation, and behavioral unit tests.

Python checks verify that required dashboard/search controls remain present, local assets resolve, the modular architecture stays intact, Open-Meteo remains the production provider, the curated city catalog remains complete, PWA/offline contracts stay connected, README previews exist, and the legacy URL still redirects correctly.

Forecast-core Node tests cover seven-day normalization, the 12-hour slice, malformed payload rejection, Celsius/Fahrenheit request parameters, WMO fallback, compass/time formatting, cache TTL boundaries, and derived weekly insights.

Location-core Node tests cover coordinate bounds, geocoding request construction, result normalization, duplicate suppression, favorite add/remove behavior, favorites limits, and share-link round trips.

Run all checks locally with:

```bash
python -m unittest discover -s tests -v
node tests/forecast-core.test.js
node tests/location-core.test.js
```

## Project Structure

```text
skycast/
├── .github/
│   └── workflows/
│       └── quality.yml
├── assets/
│   ├── app-icon.svg
│   ├── hero-clear.svg
│   ├── hero-cloud.svg
│   ├── hero-rain.svg
│   └── hero-snow.svg
├── SC/
│   ├── skycast-dashboard-2026.svg
│   └── skycast-forecast-2026.svg
├── src/
│   ├── forecast-core.js
│   └── location-core.js
├── styles/
│   └── location.css
├── tests/
│   ├── forecast-core.test.js
│   ├── location-core.test.js
│   ├── test_project.py
│   └── test_pwa.py
├── app.js
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

API integration, geocoding, browser geolocation, URL state design, asynchronous JavaScript, modular frontend architecture, payload validation, data normalization, race-condition prevention, WMO weather-code mapping, SVG data visualization, responsive product UI, PWA architecture, service workers, browser caching, offline fallback design, local-state persistence, accessibility-aware frontend design, unit testing, regression testing, CI/CD, and static-site deployment.

## Credits

Weather forecasts and geocoding are provided through [Open-Meteo](https://open-meteo.com/); geocoding location data is based on GeoNames. Dashboard interface, normalization, caching strategy, visualization, tests, and visual assets are maintained in this repository.
