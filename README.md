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
deployed URL.

```bash
# Full suite, against a deployed preview (e.g. a Vercel PR preview)
E2E_BASE_URL=https://your-preview-url.vercel.app npm run test:e2e

# Smoke suite, against production by default
npm run test:smoke
# or a specific target:
SMOKE_BASE_URL=https://your-preview-url.vercel.app npm run test:smoke
```

## Bumping `@hailmary/shared`

Update the version in `package.json`'s `dependencies`, then `npm install`.
