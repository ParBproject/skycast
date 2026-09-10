# SkyCast — European Weather Dashboard

[![SkyCast quality](https://github.com/ParBproject/skycast/actions/workflows/quality.yml/badge.svg)](https://github.com/ParBproject/skycast/actions/workflows/quality.yml)
[![HTML](https://img.shields.io/badge/HTML5-CSS3-JavaScript-E34F26?logo=html5&logoColor=white)](https://parbproject.github.io/skycast/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f)](https://parbproject.github.io/skycast/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p align="center">
  <a href="https://parbproject.github.io/skycast/">
    <img src="SC/skycast-dashboard-2026.svg" alt="SkyCast redesigned European weather dashboard" width="1000">
  </a>
</p>

<p align="center">
  <strong>A responsive weather intelligence dashboard for major European cities.</strong><br>
  Current conditions • 7-day forecast • Native SVG visualization • No API key required
</p>

<p align="center">
  <a href="https://parbproject.github.io/skycast/"><strong>Open Live Dashboard →</strong></a>
</p>

SkyCast turns live Open-Meteo forecast data into a focused data-product experience with current conditions, seven-day planning, precipitation risk, wind, daylight details, temperature trends, dynamic weather artwork, and forecast-derived insights.

## Product Highlights

- Current modeled conditions for 22 major European cities
- Seven-day high/low temperatures and WMO weather-code summaries
- Precipitation probability, cloud cover, humidity, wind speed, gusts, and apparent temperature
- Local sunrise/sunset details and timezone-aware forecast timestamps
- Celsius/Fahrenheit switching with matching wind and precipitation units
- Native SVG high/low temperature trend chart rendered in the browser
- Dynamic hero artwork for clear, cloudy, rainy, and snowy weather
- Forecast insight cards for warmest, wettest, windiest, and clearer days
- Request cancellation to prevent stale results when users switch cities quickly
- Loading states, API failure handling, persistent preferences, reduced-motion support, and keyboard focus states
- Fully client-side deployment with no framework, backend, API key, or runtime dependency

## Forecast Experience

<p align="center">
  <img src="SC/skycast-forecast-2026.svg" alt="SkyCast seven-day forecast cards and temperature trend" width="1000">
</p>

## Data Architecture

SkyCast uses the Open-Meteo Forecast API directly from the browser. The request includes current conditions and seven-day daily aggregations, then normalizes that payload into a small internal model used by the dashboard components.

```text
Open-Meteo Forecast API
          │
          ▼
     fetch + AbortController
          │
          ▼
    payload validation
          │
          ▼
      normalization
          │
     ┌────┼───────────────┐
     ▼    ▼               ▼
 current  7-day cards   insights
 metrics      │
              ▼
       native SVG chart
```

The app uses WMO weather codes instead of provider-specific condition strings, making the weather presentation more explicit and easier to test.

## Technical Approach

| Area | Implementation |
|---|---|
| Interface | Semantic HTML, responsive CSS, vanilla JavaScript |
| Weather data | Open-Meteo Forecast API |
| Current conditions | Temperature, apparent temperature, humidity, cloud cover, wind, gusts, weather code |
| Daily forecast | High/low temperature, precipitation probability, wind, gusts, sunrise/sunset, weather code |
| Visualization | Native SVG temperature chart generated from live data |
| Visual system | Lightweight local SVG weather scenes |
| State | `localStorage` for selected city and temperature unit |
| Request safety | `AbortController` + sequence guard against stale responses |
| Validation | Python `unittest` regression checks with no third-party dependencies |
| CI | GitHub Actions on pushes, pull requests, and manual runs |
| Deployment | GitHub Pages |
| Runtime | Fully client-side; no build process required |

## Quality Checks

The repository includes a zero-dependency regression suite that verifies:

- Required dashboard regions and controls remain present
- Open-Meteo remains the configured weather provider
- Legacy 7Timer references do not reappear
- Local HTML/SVG asset references resolve
- All four condition-aware hero assets exist
- The 22-city catalog remains complete and duplicate-free
- README preview assets remain valid
- The legacy forecast URL still redirects to the main dashboard

Run the checks locally with:

```bash
python -m unittest discover -s tests -v
```

## Project Structure

```text
skycast/
├── .github/
│   └── workflows/
│       └── quality.yml
├── assets/
│   ├── hero-clear.svg
│   ├── hero-cloud.svg
│   ├── hero-rain.svg
│   └── hero-snow.svg
├── SC/
│   ├── skycast-dashboard-2026.svg
│   └── skycast-forecast-2026.svg
├── tests/
│   └── test_project.py
├── index.html
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

Open `http://localhost:8000` in a browser.

## Skills Demonstrated

API integration, asynchronous JavaScript, payload validation, race-condition prevention, WMO weather-code mapping, SVG data visualization, responsive product UI, local-state persistence, accessibility-aware frontend design, automated regression testing, CI/CD, graceful error handling, and static-site deployment.

## Credits

Weather forecast data is provided by [Open-Meteo](https://open-meteo.com/). Dashboard interface, data normalization, data visualization, tests, and visual assets are maintained in this repository.
