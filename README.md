# SkyCast — European Weather Dashboard

[![HTML](https://img.shields.io/badge/HTML5-CSS3-JavaScript-E34F26?logo=html5&logoColor=white)](https://parbproject.github.io/skycast/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f)](https://parbproject.github.io/skycast/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p align="center">
  <a href="https://parbproject.github.io/skycast/">
    <img src="SC/skycast-dashboard-2026.svg" alt="SkyCast redesigned European weather dashboard" width="1000">
  </a>
</p>

<p align="center">
  <strong>A modern, responsive weather dashboard for major European cities.</strong><br>
  Live forecast aggregation • Native SVG visualization • Condition-aware artwork • No API key required
</p>

<p align="center">
  <a href="https://parbproject.github.io/skycast/"><strong>Open Live Dashboard →</strong></a>
</p>

SkyCast turns public 7Timer! forecast data into a polished data-product experience with seven-day summaries, temperature trends, forecast metrics, condition-aware visuals, persistent preferences, and responsive layouts.

## Product Highlights

- Seven-day forecasts for 22 major European cities
- Metric and imperial temperature switching
- Native temperature high/low trend chart rendered from forecast data
- Current-condition summary with humidity, wind, daily range, and dominant conditions
- Dynamic hero artwork that changes for clear, cloudy, rainy, and snowy forecasts
- Weekly insight cards derived from the forecast instead of static copy
- Loading states, API failure handling, and persistent city/unit preferences
- Responsive desktop, tablet, and mobile dashboard
- Fully client-side deployment with no framework, backend, or API key

## Forecast Experience

<p align="center">
  <img src="SC/skycast-forecast-2026.svg" alt="SkyCast seven-day forecast cards and temperature trend" width="1000">
</p>

## What Was Modernized

The original version centered a legacy 7Timer-generated PNG diagram and relied on outdated screenshots. The current dashboard replaces that presentation with native UI components and local visual assets so the live forecast itself drives the interface.

- Replaced the image-first forecast layout with a structured dashboard
- Replaced outdated screenshots with current 2026 repository previews
- Added local SVG scene assets instead of missing/external icon dependencies
- Added native data visualization generated in JavaScript
- Improved hierarchy, spacing, cards, controls, responsive behavior, and accessibility states
- Retained the lightweight static-site architecture and public weather API integration

## Technical Approach

| Area | Implementation |
|---|---|
| Interface | Semantic HTML, responsive CSS, vanilla JavaScript |
| Weather data | 7Timer! public civil forecast API |
| Aggregation | Client-side grouping of forecast timepoints into daily summaries |
| Visualization | Native SVG temperature chart generated from forecast data |
| Visual system | Lightweight local SVG weather scenes |
| State | `localStorage` for selected city and temperature unit |
| Deployment | GitHub Pages |
| Runtime | Fully client-side; no build process required |

## Project Structure

```text
skycast/
├── assets/
│   ├── hero-clear.svg
│   ├── hero-cloud.svg
│   ├── hero-rain.svg
│   └── hero-snow.svg
├── SC/
│   ├── skycast-dashboard-2026.svg
│   └── skycast-forecast-2026.svg
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

API integration, asynchronous JavaScript, forecast-data aggregation, SVG data visualization, responsive product UI, local-state persistence, graceful error handling, and static-site deployment.

## Credits

Weather data is provided by [7Timer!](https://www.7timer.info/). Dashboard interface, data visualization, and visual assets are maintained in this repository.
