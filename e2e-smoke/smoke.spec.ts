import { test, expect } from "@playwright/test";

// Post-deploy sanity check against the live Hostinger deploy — not the PR
// suite. Run with: npm run test:smoke (optionally SMOKE_BASE_URL=... to
// point at a different environment, e.g. a preview deploy).

test.describe("smoke", () => {
  test("homepage renders", async ({ page }) => {
    const response = await page.goto("/ro");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("an article renders", async ({ page }) => {
    // No news index route exists — the homepage's featured hero article
    // (h1) is the one guaranteed article link on the site.
    await page.goto("/ro");
    await page.getByRole("heading", { level: 1 }).getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("/en resolves", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("cron route rejects an unauthenticated call with 401", async ({ request }) => {
    const response = await request.get("/api/cron/sync-scores");
    expect(response.status()).toBe(401);
  });
});
