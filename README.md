# hailmary-e2e

Playwright suite for [hailmary](https://github.com/goaji/hailmary), split
out into its own repo. See `hailmary`'s `E2E-SPLIT-PLAN.md` for why.

No app source lives here — team data, UI copy, and the `Game` type come
from [`@hailmary/shared`](https://github.com/goaji/hailmary-shared), so
assertions read the real source instead of a hardcoded duplicate. A
version bump of that dependency is what keeps this suite in sync with the
app; nothing here catches drift automatically.

## Running

This suite has no local app to spin up — both configs point at a
deployed URL. `schedule.spec.ts` and `news-index.spec.ts` also need
`E2E_TEST_SECRET` (matching the target's `E2E_TEST_SECRET` env var) to
seed/read fixtures via `hailmary`'s `/api/test/*` routes, and the cron
route tests in `schedule.spec.ts` need `CRON_SECRET` — both skip
themselves if unset, except the fixture-dependent tests, which will fail
outright without `E2E_TEST_SECRET`.

```bash
# Full suite, against a deployed preview (e.g. a Vercel PR preview)
E2E_BASE_URL=http://localhost:3000 \
E2E_TEST_SECRET=... \
CRON_SECRET=... \
npm run test:e2e

# Smoke suite, against production by default
npm run test:smoke
# or a specific target:
SMOKE_BASE_URL=https://your-preview-url.vercel.app npm run test:smoke
```

## Bumping `@hailmary/shared`

Update the version in `package.json`'s `dependencies`, then `npm install`.
