# Contributing to SkyCast

Thanks for contributing to SkyCast.

SkyCast is intentionally lightweight but separates responsibilities across a small modular frontend: `index.html` contains semantic markup, `styles.css` plus scoped files under `styles/` own presentation, `app.js` controls the main weather/location experience, `air-quality.js` controls atmospheric rendering and cache fallback, and pure domain logic lives under `src/`. PWA behavior lives in `manifest.webmanifest` and `sw.js`.

## Development workflow

1. Fork the repository.
2. Create a focused branch, for example `git checkout -b feature/atmospheric-improvement`.
3. Run the site locally with `python -m http.server 8000`.
4. Run `python -m unittest discover -s tests -v`.
5. Run `node tests/forecast-core.test.js`.
6. Run `node tests/location-core.test.js`.
7. Run `node tests/air-quality-core.test.js`.
8. Test desktop and mobile layouts before committing.
9. When changing caching/PWA behavior, test once online and once after switching the browser offline.
10. Commit with a clear engineering-focused message and open a pull request.

## Module boundaries

- Keep semantic structure in `index.html`; do not move application logic back into inline scripts.
- Keep the main visual system in `styles.css` and feature-specific rules in scoped files under `styles/`.
- Put main weather, location, geolocation, favorites, sharing, and PWA browser behavior in `app.js`.
- Put atmospheric browser behavior and atmospheric cache fallback in `air-quality.js`; a failure there must not break the main weather forecast.
- Put pure forecast logic in `src/forecast-core.js`.
- Put pure location behavior in `src/location-core.js`.
- Put pure atmospheric logic in `src/air-quality-core.js`, including URL construction, AQI/UV bands, pollutant/pollen selection, normalization, and cache-key/TTL logic.
- Add or update the matching Node test whenever a core behavior changes.
- Keep the app dependency-free unless a dependency materially improves the product and is justified in the PR.

## Forecast and visualization changes

When changing weather normalization, derived metrics, hourly cards, or charts:

- Validate the Open-Meteo payload before rendering it.
- Check both Celsius and Fahrenheit modes, including wind and precipitation units.
- Handle missing or unexpected weather codes safely.
- Keep date/time display tied to the forecast location's timezone where possible.
- Avoid hard-coded forecast values in the production interface.
- Keep derived insights explainable from fields in the underlying forecast payload.
- Verify that fast location/unit changes cannot render an older request over a newer selection.
- Keep the last-known forecast cache keyed by coordinates and unit so incompatible data is never mixed.

## Location changes

When changing search, favorites, geolocation, or sharing:

- Keep coordinate validation inside `src/location-core.js`.
- Use Open-Meteo's geocoding endpoint through `buildGeocodingURL`; do not hard-code unescaped user queries into URLs.
- Normalize geocoding results before they reach the DOM.
- Build result/favorite UI with DOM text nodes rather than inserting search-result names through `innerHTML`.
- Keep favorites coordinate-deduplicated and bounded.
- Keep browser geolocation opt-in and initiated by an explicit user action.
- Preserve share-link round-trip tests whenever URL parameters change.

## Air-quality changes

When changing AQI, pollutants, UV, or pollen:

- Use the Open-Meteo Air Quality API through `buildAirQualityURL`.
- Keep European AQI thresholds aligned with the provider/EEA bands and cover boundary values in tests.
- Treat pollen as optional because CAMS pollen variables are seasonal and Europe-only.
- Keep atmospheric requests isolated from the weather request lifecycle so one provider response cannot take down the other dashboard sections.
- Preserve request cancellation and stale-response guards for rapid location changes.
- Keep the atmospheric cache short-lived and coordinate-specific; currently it uses a 3-hour TTL.
- Preserve clear attribution to both Open-Meteo and CAMS ENSEMBLE in the user-facing interface.
- Keep health-oriented copy informational rather than presenting it as medical advice.

## PWA and offline changes

When modifying the application shell:

- Keep `manifest.webmanifest`, `sw.js`, and `assets/app-icon.svg` aligned with the live product.
- Increment `CACHE_VERSION` in `sw.js` whenever boot-critical shell assets change.
- If a new production CSS/JS asset is required to boot the app, add it to `APP_SHELL`.
- Cache only same-origin static GET requests in the service worker unless a deliberate data-caching design is reviewed separately.
- Keep weather fallback data explicitly labeled; forecast data uses a 24-hour TTL and atmospheric data uses a 3-hour TTL.
- Verify the dashboard still loads after the service worker has cached the shell and the network is disabled.

## Quality checks

GitHub Actions runs Python structural/PWA regression tests, JavaScript syntax checks, and Node behavioral tests for forecast, location, and atmospheric cores. New changes should keep all of them green.

## Reporting issues

Please include:

- What you expected to happen
- What actually happened
- Whether the issue happened during search, location permission, air-quality loading, online, offline, or reconnection
- Browser/device information when relevant
- Steps to reproduce
- Screenshots only when they reflect the current dashboard
