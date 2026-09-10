# Contributing to SkyCast

Thanks for contributing to SkyCast.

SkyCast is intentionally lightweight: the production dashboard lives in `index.html`, live weather data comes from Open-Meteo, forecast visuals are generated client-side, and reusable scene artwork lives in `assets/`.

## Development workflow

1. Fork the repository.
2. Create a focused branch, for example `git checkout -b feature/forecast-improvement`.
3. Run the site locally with `python -m http.server 8000`.
4. Run `python -m unittest discover -s tests -v`.
5. Test desktop and mobile layouts before committing.
6. Commit your changes with a clear engineering-focused message.
7. Push the branch and open a pull request.

## Project conventions

- Keep the app dependency-free unless a new dependency materially improves the product.
- Keep production HTML, CSS, and JavaScript in `index.html` unless the project grows enough to justify a build system.
- Put reusable weather artwork in `assets/` as optimized SVG where practical.
- Put README showcase images in `SC/` and keep them representative of the current interface.
- Use Open-Meteo/WMO weather codes as the canonical weather condition model.
- Preserve request cancellation and stale-response protection when changing data fetching.
- Preserve graceful API-error states and responsive behavior.
- Prefer accessible labels, semantic markup, keyboard-friendly controls, and reduced-motion support.
- Update the regression suite whenever a structural requirement changes intentionally.

## Data and visualization changes

When changing weather normalization, derived metrics, or charts:

- Validate the Open-Meteo payload before rendering it.
- Check both Celsius and Fahrenheit modes, including wind and precipitation units.
- Handle missing or unexpected weather codes safely.
- Keep date/time display tied to the forecast location's timezone where possible.
- Avoid hard-coded forecast values in the production interface.
- Keep derived insights explainable from fields in the underlying forecast payload.
- Verify that fast city/unit changes cannot render an older request over a newer selection.

## Quality checks

The GitHub Actions workflow runs the same standard-library regression suite used locally. New changes should keep these checks green and should not introduce missing local assets or stale provider references.

## Reporting issues

Please include:

- What you expected to happen
- What actually happened
- Browser/device information when relevant
- Steps to reproduce
- Screenshots only when they reflect the current dashboard
