import { defineConfig, devices } from "@playwright/test";

// No app source lives in this repo, so there's no local dev server to spawn
// (unlike playwright.smoke.config.ts, this suite has no production fallback
// either — it's a pre-merge gate against a specific deployed preview).
const baseURL = process.env.E2E_BASE_URL;

if (!baseURL) {
  throw new Error(
    "E2E_BASE_URL must point at a deployed target (e.g. a Vercel PR preview) — this suite has no local app to run against."
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
