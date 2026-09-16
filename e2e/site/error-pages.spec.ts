import { getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";
import { test, expect } from "../../fixtures/pageTest";
import { ACCENT_EXTREME_TEAMS, assertNoAccessibilityViolations } from "../../helpers";

test.describe("catch-all 404", () => {
  test("a genuinely unmatched ro path renders the styled, localized not-found page", async ({
    page,
  }) => {
    const response = await page.goto("/ro/this-path-does-not-exist-anywhere");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: ro.notFoundPage.title })).toBeVisible();
    await expect(page.getByRole("link", { name: ro.notFoundPage.backHome })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  });

  test("a genuinely unmatched en path renders the styled, localized not-found page", async ({
    page,
  }) => {
    const response = await page.goto("/en/this-path-does-not-exist-anywhere");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: en.notFoundPage.title })).toBeVisible();
    await expect(page.getByRole("link", { name: en.notFoundPage.backHome })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("the back-home link actually returns to the homepage", async ({ page }) => {
    await page.goto("/ro/this-path-does-not-exist-anywhere");
    await page.getByRole("link", { name: ro.notFoundPage.backHome }).click();
    await expect(page).toHaveURL(/\/ro$/);
  });
});

test.describe("catch-all 404 accessibility across team accents", () => {
  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    test(`axe clean with ${team.name} selected`, async ({ page, siteHeader }) => {
      await page.goto("/ro/this-path-does-not-exist-anywhere");
      await siteHeader.selectTeam(team.name);

      await assertNoAccessibilityViolations(page);
    });
  }
});
