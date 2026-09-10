# Contributing to SkyCast

Thanks for contributing to SkyCast.

SkyCast is intentionally lightweight but separates responsibilities across a small modular frontend: `index.html` contains semantic markup, `styles.css` and `styles/location.css` own presentation, `app.js` controls browser behavior and rendering, `src/forecast-core.js` contains reusable weather-domain logic, and `src/location-core.js` contains reusable location/search/favorites/share logic. PWA behavior lives in `manifest.webmanifest` and `sw.js`.

## Development workflow

1. Fork the repository.
2. Create a focused branch, for example `git checkout -b feature/location-improvement`.
3. Run the site locally with `python -m http.server 8000`.
4. Run `python -m unittest discover -s tests -v`.
5. Run `node tests/forecast-core.test.js`.
6. Run `node tests/location-core.test.js`.
7. Test desktop and mobile layouts before committing.
8. When changing caching/PWA behavior, test once online and once after switching the browser offline.
9. Commit with a clear engineering-focused message and open a pull request.

## Module boundaries

- Keep semantic structure in `index.html`; do not move application logic back into inline scripts.
- Keep the main visual system in `styles.css` and location/search-specific rules in `styles/location.css`.
- Put DOM rendering, browser events, request lifecycle, geolocation permission flow, localStorage interaction, and Web Share behavior in `app.js`.
- Put pure forecast logic in `src/forecast-core.js` whenever it can run without the DOM. This includes weather API URL construction, payload normalization, WMO mapping, cache-age logic, formatting helpers, and derived forecast insights.
- Put pure location behavior in `src/location-core.js`. This includes geocoding URL construction, coordinate validation, result normalization, location identity, favorite deduplication/limits, and share-query parsing.
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

## PWA and offline changes

When modifying the application shell:

- Keep `manifest.webmanifest`, `sw.js`, and `assets/app-icon.svg` aligned with the live product.
- Increment `CACHE_VERSION` in `sw.js` whenever shell assets change in a way that requires clients to refresh cached files.
- If a new production CSS/JS asset is required to boot the app, add it to `APP_SHELL`.
- Cache only same-origin static GET requests in the service worker unless a deliberate data-caching design is reviewed separately.
- Keep live weather freshness explicit. Forecast fallback data uses a 24-hour TTL and must be labeled as cached when rendered.
- Verify the dashboard still loads after the service worker has cached the shell and the network is disabled.

## Quality checks

GitHub Actions runs Python structural/PWA regression tests, JavaScript syntax checks, and Node behavioral tests for both forecast and location cores. New changes should keep all of them green.

## Reporting issues

Please include:

- What you expected to happen
- What actually happened
- Whether the issue happened during search, location permission, online, offline, or reconnection
- Browser/device information when relevant
- Steps to reproduce
- Screenshots only when they reflect the current dashboard
