import { DEFAULT_TEAM, PICKER_TEAMS, getTeam } from "@hailmary/shared";
import { test, expect } from "../../fixtures/pageTest";
import { assertNoAccessibilityViolations, reopenBrowser, viewportsWithHeights } from "../../helpers";
import { SITE_HEADER_AXE_SCOPE, SiteHeader } from "../../pageObjects/SiteHeader";

const defaultTeam = getTeam(DEFAULT_TEAM);
const eagles = getTeam("phi");
const cowboys = getTeam("dal");

test.describe("team color switching", () => {
  test("selecting a team updates --accent-1, persists across reload, and is keyboard-navigable", async ({
    page,
    siteHeader,
  }) => {
    const defaultRadio = siteHeader.teamRadio(defaultTeam.name);
    const eaglesRadio = siteHeader.teamRadio(eagles.name);

    await test.step("starts on the default team on first load", async () => {
      await page.goto("/ro");
      await expect.poll(() => siteHeader.accent1()).toBe(defaultTeam.accent1);
    });

    await test.step("clicking a swatch updates the accent and aria-checked", async () => {
      await eaglesRadio.click();

      await expect.poll(() => siteHeader.accent1()).toBe(eagles.accent1);
      await expect(eaglesRadio).toHaveAttribute("aria-checked", "true");
      await expect(defaultRadio).toHaveAttribute("aria-checked", "false");
    });

    await test.step("reload restores the saved team", async () => {
      // Polls until the saved team shows, so a default flash before hydration still passes.
      // Tracked in goaji/hailmary#11, which adds a pre-hydration test.
      await page.reload();
      await expect.poll(() => siteHeader.accent1()).toBe(eagles.accent1);
      await expect(eaglesRadio).toHaveAttribute("aria-checked", "true");
    });

    await test.step("ArrowRight moves focus and selection together", async () => {
      await eaglesRadio.focus();
      await page.keyboard.press("ArrowRight");

      const cowboysRadio = siteHeader.teamRadio(cowboys.name);
      await expect(cowboysRadio).toBeFocused();
      await expect(cowboysRadio).toHaveAttribute("aria-checked", "true");
      await expect(eaglesRadio).toHaveAttribute("aria-checked", "false");
      await expect.poll(() => siteHeader.accent1()).toBe(cowboys.accent1);
    });
  });

  test("the saved team survives closing and reopening the browser", async ({ page, siteHeader, browser }) => {
    await page.goto("/ro");
    await siteHeader.selectTeam(eagles.name);
    await expect.poll(() => siteHeader.accent1()).toBe(eagles.accent1);

    const reopened = await reopenBrowser(browser, page);
    const reopenedHeader = new SiteHeader(reopened);
    await reopened.goto("/ro");
    await expect.poll(() => reopenedHeader.accent1()).toBe(eagles.accent1);
    await expect(reopenedHeader.teamRadio(eagles.name)).toHaveAttribute("aria-checked", "true");

    await reopened.context().close();
  });
});

test.describe("header accessibility across team accents", () => {
  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    test(`header has no axe violations with ${team.name} selected as the active team`, async ({
      page,
      siteHeader,
    }) => {
      await page.goto("/ro");
      await siteHeader.selectTeam(team.name);
      await expect.poll(() => siteHeader.accent1()).toBe(team.accent1);

      // Scoped to the header deliberately: this spec exercises the team
      // picker, which only affects the header. A whole-page axe pass
      // belongs to the homepage's own dedicated a11y test (task 4 step 6),
      // which also needs to handle OriginStrip's phrase animations rather
      // than accidentally scanning them mid-fade.
      await assertNoAccessibilityViolations(page, (builder) => builder.include(SITE_HEADER_AXE_SCOPE));
    });
  }
});

test.describe("header visual regression", () => {
  const viewports = viewportsWithHeights([800, 1024, 900]);

  for (const viewport of viewports) {
    test(`header matches its ${viewport.label}px baseline screenshot`, async ({
      page,
      siteHeader,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/ro");

      await expect(siteHeader.banner).toHaveScreenshot(
        `header-${viewport.label}.png`,
      );
    });
  }
});
