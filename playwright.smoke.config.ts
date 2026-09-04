import { defineConfig, devices } from "@playwright/test";

// Separate from playwright.config.ts on purpose: this suite runs against a
// real deployed URL after a deploy, not a locally-spawned dev server, and
// must never run as part of the PR suite (`npm run test:e2e`).
export default defineConfig({
  testDir: "./e2e-smoke",
  fullyParallel: true,
  retries: 1,
  reporter: "html",
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "https://hailmary.ro",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
