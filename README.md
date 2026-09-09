# SkyCast — European Weather Dashboard

[![HTML](https://img.shields.io/badge/HTML5-CSS3-JavaScript-E34F26?logo=html5&logoColor=white)](https://parbproject.github.io/skycast/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f)](https://parbproject.github.io/skycast/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

SkyCast is a responsive, client-side weather dashboard for major European cities. It turns public 7Timer! forecast data into a cleaner product experience with daily summaries, temperature trends, forecast metrics, condition-aware artwork, and fast weekly insights.

## Live Application

**[Open SkyCast](https://parbproject.github.io/skycast/)**

## Dashboard Preview

<p align="center">
  <img src="SC/skycast-dashboard-2026.svg" alt="SkyCast redesigned European weather dashboard" width="900">
</p>

<p align="center">
  <img src="SC/skycast-forecast-2026.svg" alt="SkyCast seven-day forecast and temperature trend" width="900">
</p>

## What Changed

- Rebuilt the page as a professional data dashboard instead of centering the legacy 7Timer PNG diagram
- Added condition-aware hero artwork for clear, cloudy, rainy, and snowy forecasts
- Added a native seven-day temperature trend visualization generated in JavaScript
- Added current forecast summary, humidity, wind-level, daily high/low, and weekly insights
- Replaced external/missing weather icon dependencies with an integrated condition presentation
- Added loading states, clearer API failure handling, persistent city/unit preferences, and improved mobile layouts
- Replaced outdated repository screenshots with current 2026 dashboard previews

## Core Features

- Seven-day forecasts for 22 major European cities
- Metric and imperial temperature switching
- Dominant daily weather condition summaries
- Temperature high/low trend chart
- Condition-aware dashboard artwork
- Weather metrics and weekly insight cards
- Responsive desktop, tablet, and mobile interface
- Client-side API integration with no key or backend required

## Technical Approach

| Area | Implementation |
|---|---|
| Interface | Semantic HTML, responsive CSS, vanilla JavaScript |
| Weather data | 7Timer! public civil forecast API |
| Visualization | Native SVG chart generated from aggregated forecast data |
| Visual system | Lightweight local SVG weather scenes |
| State | `localStorage` for selected city and temperature unit |
| Deployment | GitHub Pages |
| Runtime | Fully client-side; no framework or build process |

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

API integration, asynchronous JavaScript, data aggregation, SVG data visualization, responsive product UI, local-state persistence, graceful error handling, and static-site deployment.

## Credits

Weather data is provided by [7Timer!](https://www.7timer.info/). The dashboard interface and visual assets are maintained in this repository.
