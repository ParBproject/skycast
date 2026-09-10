# SkyCast — European Weather Dashboard

[![SkyCast quality](https://github.com/ParBproject/skycast/actions/workflows/quality.yml/badge.svg)](https://github.com/ParBproject/skycast/actions/workflows/quality.yml)
[![HTML](https://img.shields.io/badge/HTML5-CSS3-JavaScript-E34F26?logo=html5&logoColor=white)](https://parbproject.github.io/skycast/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://parbproject.github.io/skycast/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f)](https://parbproject.github.io/skycast/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p align="center">
  <a href="https://parbproject.github.io/skycast/">
    <img src="SC/skycast-dashboard-2026.svg" alt="SkyCast redesigned European weather dashboard" width="1000">
  </a>
</p>

<p align="center">
  <strong>An installable, resilient weather intelligence dashboard for major European cities.</strong><br>
  Current conditions • Next 12 hours • 7-day forecast • Offline fallback • Tested forecast core
</p>

<p align="center">
  <a href="https://parbproject.github.io/skycast/"><strong>Open Live Dashboard →</strong></a>
</p>

SkyCast turns live Open-Meteo forecast data into a focused weather data product. It combines current conditions, a 12-hour outlook, seven-day planning, precipitation and wind signals, daylight details, temperature trends, dynamic weather artwork, installability, and last-known-data fallback in a dependency-free client-side application.

## Product Highlights

- Current modeled conditions for 22 major European cities
- Next-12-hours forecast with temperature, condition, precipitation probability, and wind
- Seven-day high/low temperatures and WMO weather-code summaries
- Precipitation probability, cloud cover, humidity, wind speed, gusts, and apparent temperature
- Local sunrise/sunset details and timezone-aware forecast timestamps
- Celsius/Fahrenheit switching with matching wind and precipitation units
- Native SVG high/low temperature trend chart rendered in the browser
- Dynamic hero artwork for clear, cloudy, rainy, and snowy weather
- Forecast insight cards for warmest, wettest, windiest, and clearer days
- Installable Progressive Web App with versioned offline shell
- 24-hour last-successful-forecast cache per city/unit
- Request cancellation and sequence guards against stale async responses
- Modular frontend architecture with separate HTML, CSS, controller, and forecast-domain logic
- Behavioral Node tests for normalization, cache expiry, API URL construction, weather mapping, and insight derivation
- Fully client-side deployment with no framework, backend, API key, or runtime dependency

## Forecast Experience

<p align="center">
  <img src="SC/skycast-forecast-2026.svg" alt="SkyCast seven-day forecast cards and temperature trend" width="1000">
</p>

## Architecture

SkyCast keeps the browser runtime lightweight while separating responsibilities so the data logic can be tested independently of the DOM.

```text
Open-Meteo Forecast API
          │
          ▼
src/forecast-core.js
URL construction • validation • normalization • WMO mapping
cache helpers • derived insights • formatting
          │
          ▼
       app.js
fetch lifecycle • AbortController • localStorage • rendering
PWA install flow • online/offline state
          │
     ┌────┴────┐
     ▼         ▼
index.html   styles.css
semantic UI  responsive visual system
     │
     ▼
service worker + manifest
installable shell / offline startup
```

The same pure forecast module is loaded by the browser and imported directly by Node tests. This keeps core weather behavior testable without adding a framework or build system.

## Data Flow and Reliability

One Open-Meteo request returns current, hourly, and daily weather data. `forecast-core.js` validates and normalizes the payload into a compact model used by the renderers and the explicit last-known forecast cache.

The browser controller protects against rapid city/unit changes with `AbortController` and a request sequence guard. Live forecast responses are not silently cached by the service worker; when SkyCast falls back to stored forecast data, the UI explicitly labels it as cached and shows its age.

## Progressive Web App

SkyCast includes:

- `manifest.webmanifest` for standalone installation metadata
- `assets/app-icon.svg` as the application icon
- `sw.js` with versioned application-shell caching
- install-prompt handling in supported browsers
- cache cleanup when a new shell version activates
- offline navigation fallback to the cached dashboard shell
- a separate application-level forecast cache with a 24-hour TTL

The service worker caches same-origin application assets, including the modular CSS and JavaScript files. Weather freshness remains controlled by the application data layer.

## Technical Approach

| Area | Implementation |
|---|---|
| Application shell | Semantic `index.html` |
| Styling | Responsive `styles.css` |
| Controller | `app.js` for DOM rendering, requests, local state, and PWA events |
| Forecast domain | `src/forecast-core.js` shared by browser and Node tests |
| Weather data | Open-Meteo Forecast API |
| Current conditions | Temperature, apparent temperature, humidity, cloud cover, wind, gusts, weather code |
| Hourly forecast | Next 12 hours of temperature, apparent temperature, rain probability, condition, and wind |
| Daily forecast | High/low temperature, precipitation probability, wind, gusts, sunrise/sunset, weather code |
| Visualization | Native SVG temperature chart generated from live data |
| State | `localStorage` for city, unit, and last-successful forecast cache |
| Request safety | `AbortController` + sequence guard |
| Offline shell | Versioned Service Worker + Cache Storage |
| Unit testing | Node built-in `assert`, no third-party test framework |
| Structural/PWA tests | Python standard-library `unittest` |
| CI | GitHub Actions on pushes, pull requests, and manual runs |
| Deployment | GitHub Pages |

## Quality Checks

The CI pipeline runs both structural regression checks and behavioral JavaScript unit tests.

Python checks verify:

- required dashboard regions and controls remain present
- HTML references resolve to real local assets
- the application remains modular instead of regressing to inline CSS/logic
- Open-Meteo remains the production provider
- all four condition-aware hero assets exist
- the 22-city catalog stays complete and duplicate-free
- README preview assets remain valid
- manifest/service-worker/offline contracts remain connected
- the legacy forecast URL still redirects to the main dashboard

Node tests verify:

- seven-day normalization stays capped correctly
- the hourly model returns the correct 12-hour window
- incomplete payloads are rejected
- Celsius/Fahrenheit request parameters are generated correctly
- WMO code fallback remains safe
- compass-direction and local-time formatting remain stable
- forecast cache TTL boundaries are enforced
- warmest/wettest/windiest/clear-day insights are derived correctly

Run all checks locally with:

```bash
python -m unittest discover -s tests -v
node tests/forecast-core.test.js
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
│   └── forecast-core.js
├── tests/
│   ├── forecast-core.test.js
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

Open `http://localhost:8000` in a browser. Service workers are available on `localhost`; production is served over HTTPS by GitHub Pages.

## Skills Demonstrated

API integration, asynchronous JavaScript, modular frontend architecture, payload validation, hourly/daily weather normalization, race-condition prevention, WMO weather-code mapping, SVG data visualization, responsive product UI, PWA architecture, service workers, browser caching, offline fallback design, local-state persistence, accessibility-aware frontend design, unit testing, regression testing, CI/CD, and static-site deployment.

## Credits

Weather forecast data is provided by [Open-Meteo](https://open-meteo.com/). Dashboard interface, data normalization, caching strategy, data visualization, tests, and visual assets are maintained in this repository.
