# Contributing to SkyCast

Thanks for contributing to SkyCast.

SkyCast is intentionally lightweight: the production dashboard lives in `index.html`, live weather data comes from Open-Meteo, forecast visuals are generated client-side, the installable application shell is managed by `manifest.webmanifest` and `sw.js`, and reusable artwork lives in `assets/`.

## Development workflow

1. Fork the repository.
2. Create a focused branch, for example `git checkout -b feature/forecast-improvement`.
3. Run the site locally with `python -m http.server 8000`.
4. Run `python -m unittest discover -s tests -v`.
5. Test desktop and mobile layouts before committing.
6. When changing caching/PWA behavior, test once online and once after switching the browser offline.
7. Commit your changes with a clear engineering-focused message.
8. Push the branch and open a pull request.

## Project conventions

- Keep the app dependency-free unless a new dependency materially improves the product.
- Keep production HTML, CSS, and JavaScript in `index.html` unless the project grows enough to justify a build system.
- Put reusable weather artwork in `assets/` as optimized SVG where practical.
- Put README showcase images in `SC/` and keep them representative of the current interface.
- Use Open-Meteo/WMO weather codes as the canonical weather condition model.
- Preserve request cancellation and stale-response protection when changing data fetching.
- Preserve graceful API-error states, cached-data fallback, and responsive behavior.
- Prefer accessible labels, semantic markup, keyboard-friendly controls, and reduced-motion support.
- Update the regression suite whenever a structural requirement changes intentionally.

## Data and visualization changes

When changing weather normalization, derived metrics, hourly cards, or charts:

- Validate the Open-Meteo payload before rendering it.
- Check both Celsius and Fahrenheit modes, including wind and precipitation units.
- Handle missing or unexpected weather codes safely.
- Keep date/time display tied to the forecast location's timezone where possible.
- Avoid hard-coded forecast values in the production interface.
- Keep derived insights explainable from fields in the underlying forecast payload.
- Verify that fast city/unit changes cannot render an older request over a newer selection.
- Keep the last-known forecast cache keyed by city and unit so incompatible data is never mixed.

## PWA and offline changes

When modifying the application shell:

- Keep `manifest.webmanifest`, `sw.js`, and `assets/app-icon.svg` aligned with the live product.
- Increment `CACHE_VERSION` in `sw.js` when shell assets change in a way that requires clients to refresh cached files.
- Cache only same-origin static GET requests in the service worker unless a deliberate data-caching design is reviewed separately.
- Keep live weather freshness explicit. The current design stores normalized forecast data in `localStorage` with a 24-hour TTL and labels it as cached when used.
- Verify the dashboard still loads after the service worker has cached the shell and the network is disabled.

## Quality checks

The GitHub Actions workflow runs the same standard-library regression suite used locally. New changes should keep these checks green and should not introduce missing local assets, stale provider references, invalid manifest entries, or broken service-worker shell paths.

## Reporting issues

Please include:

- What you expected to happen
- What actually happened
- Whether the issue happened online, offline, or while reconnecting
- Browser/device information when relevant
- Steps to reproduce
- Screenshots only when they reflect the current dashboard
