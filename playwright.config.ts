import { defineConfig, devices } from "@playwright/test";

// The app lives in another repo, so it's started separately (next dev, or the CI job).
// No production fallback: this suite seeds data.
const baseURL = process.env.E2E_BASE_URL;

if (!baseURL) {
  throw new Error(
    "E2E_BASE_URL must point at a running app (e.g. http://localhost:3000) — this suite seeds data, so it has no production fallback."
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries exist to capture a trace; a test that only passes on retry still fails the run.
  failOnFlakyTests: !!process.env.CI,
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
