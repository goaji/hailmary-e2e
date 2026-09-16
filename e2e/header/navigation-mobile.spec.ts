import { devices } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";
import { test, expect } from "../../fixtures/pageTest";
import { assertNoAccessibilityViolations, tabTo } from "../../helpers";
import { SITE_HEADER_AXE_SCOPE } from "../../pageObjects/SiteHeader";

// A real phone profile: touch, mobile viewport and user agent, not just a narrow window.
test.use({ ...devices["Pixel 7"] });

test("tapping the menu button opens the nav and a link closes it", async ({ page, siteHeader }) => {
  await page.goto("/ro");

  await test.step("starts collapsed", async () => {
    await expect(siteHeader.mainNav).toBeHidden();
    await expect(siteHeader.menuToggle).toHaveAttribute("aria-expanded", "false");
  });

  await test.step("tapping the button opens it", async () => {
    await siteHeader.menuToggle.tap();
    await expect(siteHeader.mainNav).toBeVisible();
    await expect(siteHeader.menuToggle).toHaveAttribute("aria-expanded", "true");
  });

  await test.step("following a link navigates and collapses it", async () => {
    await siteHeader.navLink(ro.nav.schedule).tap();
    await expect(page).toHaveURL("/ro/program");
    await expect(siteHeader.mainNav).toBeHidden();
    await expect(siteHeader.menuToggle).toHaveAttribute("aria-expanded", "false");
  });
});

test("menu opens, closes and navigates by keyboard", async ({ page, siteHeader }) => {
  await page.goto("/ro");
  await tabTo(page, siteHeader.menuToggle);

  await test.step("Enter toggles the menu open and shut", async () => {
    await page.keyboard.press("Enter");
    await expect(siteHeader.mainNav).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(siteHeader.mainNav).toBeHidden();
    await expect(siteHeader.menuToggle).toBeFocused();
  });

  await test.step("Tab from the open menu button reaches the first link", async () => {
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(siteHeader.navLink(ro.nav.wiki)).toBeFocused();
  });

  await test.step("Enter follows the link", async () => {
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/ro/wiki");
    await expect(siteHeader.mainNav).toBeHidden();
  });
});

test("open menu has no axe violations", async ({ page, siteHeader }) => {
  await page.goto("/ro");
  await siteHeader.menuToggle.tap();
  await expect(siteHeader.mainNav).toBeVisible();

  await assertNoAccessibilityViolations(page, (builder) => builder.include(SITE_HEADER_AXE_SCOPE));
});
