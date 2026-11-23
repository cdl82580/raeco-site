# Rae+Co Hair Studio site

Single-page static site (`index.html` + `img/`). No build step.

## Preview

```bash
npx serve .
```

## Tests

Playwright suite: static checks, E2E (desktop, mobile, WebKit) and axe accessibility scans.

```bash
npm install
npx playwright install chromium webkit   # first time only
npm test
```

The test server starts automatically on port 4173. Third-party hosts (fonts, map, Vagaro) are blocked during tests.

| Command | What it does |
| --- | --- |
| `npm test` | Full suite |
| `npm run test:static` | File-level checks only (fast, no browser) |
| `npm run test:ui` | Playwright UI mode |
| `npx playwright test --project=mobile` | One project: `static`, `desktop`, `mobile`, `webkit` |
| `npx playwright test -g "lightbox"` | Tests matching a name |
| `npx playwright show-report` | Open the last HTML report |

### Layout

- `tests/static.spec.js`: metadata, image files, ids, anchors, link safety, phone numbers
- `tests/site.spec.js`: nav, team, pricing tabs, gallery, form, theming
- `tests/mobile.spec.js`: burger menu, sticky bar, overflow, tap targets
- `tests/a11y.spec.js`: axe WCAG A/AA (light and dark), keyboard

### Maintenance notes

- Gallery images need their pixel size in the `GDIM` list in `index.html`; adding or swapping one means updating it.
- Every file in `img/` must be referenced and under 2MB, or the static tests fail.
- The form's `mailto:` navigation can't be intercepted, so tests verify the encoding code rather than the built URL.

## CI

`.github/workflows/test.yml` runs the full suite on every push and pull request and uploads the HTML report as an artifact.
