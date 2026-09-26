# hailmary-e2e

End-to-end test suite for [hailmary.ro](https://hailmary.ro), a Romanian-language
NFL site built with Next.js. Written in **Playwright + TypeScript**.

> **Status:** actively in progress. This is where I'm moving several years of
> E2E experience with TestCafe over to Playwright. See [Roadmap](#roadmap) for
> what's next.

## What's covered

277 tests across 23 spec files, plus a 4-test smoke suite:

- **Header & navigation**: desktop/mobile menu, breakpoint switch, active section, language switcher
- **Homepage**: composition, heading order, dismissible banner that persists across reloads and browser restarts
- **Schedule**: live, final, scheduled and postponed games, week navigation, timezone handling, degraded mode when live scores fail
- **News**: index and article pages, category/team filters, grid/list view toggle, locale fallback
- **Teams**: all 32 teams, division/conference structure, team-color theming
- **Wiki**: page structure, table of contents, glossary, explainer panel (dialog + focus handling), interactive diagrams
- **Site-wide**: SEO metadata, sitemap and robots.txt, localized 404 pages, footer

## Approach

**Page Object Model, injected through fixtures.** Each page has a class in
`pageObjects/`, and `fixtures/pageTest.ts` provides them to tests via
`test.extend`. Tests ask for `schedulePage` and get a ready instance, with
no setup boilerplate in the specs.

**User-facing locators.** Almost everything resolves by ARIA role and
accessible name, so tests find elements the way a user or screen reader
would. `data-testid` appears only as a masking hook for screenshots, never
as a way to find something.

**Expected text comes from the app's own source.** Team data, UI copy and
domain types are imported from `@hailmary/shared`, the package the app
itself uses, so assertions read the real values instead of a hardcoded
duplicate that silently drifts.

**Test data seeded through the API.** The schedule tests seed game data
through a protected test endpoint, and the fixture clears it again after
each test. Tests control their own data instead of depending on whatever
is live.

**Real-world conditions.** A browser in the `America/New_York` timezone checks
that kickoff times still show in Bucharest time. Storage state is reused to
simulate closing and reopening the browser.

**Accessibility as part of the suite.** axe scans on key pages, keyboard-only
navigation, focus rings, focus management in dialogs, and heading structure.

**Visual regression where it pays off.** Screenshot comparisons at 375 / 768 /
1440 px, limited to stable components and with dynamic content masked.
Snapshots of content that changes constantly were deliberately removed.

**Editorial content is asserted structurally.** The site's articles change, so
only one designated anchor article carries exact assertions. Everything else
checks shape — that a filter narrows without inventing, that categories
partition the index exactly once — which holds no matter what gets published.

**Two configs.** `playwright.config.ts` runs the full suite and requires an
explicit `E2E_BASE_URL`; it seeds data, so it points at a local app or a
deployment that exists to be tested against. `playwright.smoke.config.ts`
runs four read-only checks against production after a deploy.

## Project structure

```
e2e/            test specs, grouped by page area
e2e-smoke/      production smoke tests
pageObjects/    page object classes
fixtures/       custom Playwright fixtures (page objects, seeded data)
api/            helpers for the app's test endpoints
helpers/        shared utilities (axe, viewports, layout checks, focus)
```

## Running

```bash
npm install

# Full suite, against a local app (`next dev` in the hailmary repo)
E2E_BASE_URL=http://localhost:3000 \
E2E_TEST_SECRET=... \
CRON_SECRET=... \
npm run test:e2e

# Smoke suite, against production by default
npm run test:smoke
# or a specific target:
SMOKE_BASE_URL=https://hailmary.lucianstana.com npm run test:smoke
```

`schedule.spec.ts` and `news-index.spec.ts` need `E2E_TEST_SECRET` to seed and
read fixtures via the app's `/api/test/*` routes; the cron route tests need
`CRON_SECRET`. Tests skip themselves when a secret is unset, except the
fixture-dependent ones, which fail outright.

The target needs `E2E_TEST_MODE=true` alongside `E2E_TEST_SECRET`, or the test
routes reject every request. For a deployed target both go in the host's
control panel, unquoted — `.env.local` is gitignored and never ships, and a
value stored with its surrounding quotes fails exactly like a wrong secret.

### Targets

| Target | Suite |
| --- | --- |
| `http://localhost:3000` | Full suite — where it runs today |
| `https://hailmary.lucianstana.com` | Smoke suite (see below) |
| `https://hailmary.ro` | Smoke suite only — production |

The `.com` host exists to be tested against, but a full run trips its bot
challenge partway through: requests begin returning 403 with a "Checking your
browser" interstitial, and Playwright reads *that* page instead of the app.
The result is dozens of failures that look real — empty grids, missing
headings, empty selects — and aren't. **A 403 from that host always means the
edge; the app itself never returns one.**

## Roadmap

- **CI**: run the smoke suite on a schedule (nightly, as monitoring), and the full suite on every deployment
- **Full suite against the test deployment**: blocked on the bot challenge above — needs the runner's IP allowlisted, or the challenge disabled for that hostname
- **Linux snapshot baselines**: current baselines are macOS-only. Generate them in the official Playwright Docker image so they match CI
- **Cross-browser**: add Firefox and WebKit projects, starting with the smoke suite
- **Shared-package drift**: nothing catches it automatically yet when the app and `@hailmary/shared` get out of sync

## Notes

- The suite lives in its own repo, separate from the hailmary app, and tests it
  only over HTTP — against a local dev server or a deployed URL, never by
  importing app code.
- To bump `@hailmary/shared`, update the version in `package.json`'s
  `dependencies`, then `npm install`. That version bump is what keeps this
  suite in sync with the app.
