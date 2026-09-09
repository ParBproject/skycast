# Contributing to SkyCast

Thanks for contributing to SkyCast.

SkyCast is intentionally lightweight: the production dashboard lives in `index.html`, forecast visuals are generated client-side, and reusable scene artwork lives in `assets/`.

## Development workflow

1. Fork the repository.
2. Create a focused branch, for example `git checkout -b feature/forecast-improvement`.
3. Run the site locally with `python -m http.server 8000`.
4. Test desktop and mobile layouts before committing.
5. Commit your changes with a clear engineering-focused message.
6. Push the branch and open a pull request.

## Project conventions

- Keep the app dependency-free unless a new dependency materially improves the product.
- Keep production HTML, CSS, and JavaScript in `index.html` unless the project grows enough to justify a build system.
- Put reusable weather artwork in `assets/` as optimized SVG where practical.
- Put README showcase images in `SC/` and keep them representative of the current interface.
- Do not reintroduce the legacy image-first 7Timer forecast layout as the primary dashboard.
- Preserve graceful API-error states and responsive behavior.
- Prefer accessible labels, semantic markup, and keyboard-friendly controls.

## Data and visualization changes

When changing forecast aggregation or charts:

- Verify daily grouping across multiple API timepoints.
- Check metric and imperial units.
- Handle missing or unexpected condition values safely.
- Avoid hard-coded forecast values in the production interface.
- Keep derived metrics explainable from the underlying 7Timer data.

## Reporting issues

Please include:

- What you expected to happen
- What actually happened
- Browser/device information when relevant
- Steps to reproduce
- Screenshots only when they reflect the current dashboard
