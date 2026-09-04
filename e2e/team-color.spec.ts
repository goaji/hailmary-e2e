import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PICKER_TEAMS, getTeam } from "@hailmary/shared";

// --accent-1 inherits from the TeamColorProvider wrapper to every
// descendant, so reading it off the header landmark (already reachable by
// role) avoids needing a testid for a non-interactive styling passthrough.
// <body> itself won't work — it's the wrapper's ancestor, not a descendant.
async function getAccent1(page: Page) {
  return page
    .getByRole("banner")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent-1").trim());
}

test.describe("team color switching", () => {
  test("selecting a team updates --accent-1, persists across reload, and is keyboard-navigable", async ({
    page,
  }) => {
    const chiefsRadio = page.getByRole("radio", { name: "Kansas City Chiefs" });
    const eaglesRadio = page.getByRole("radio", {
      name: "Philadelphia Eagles",
    });

    await test.step("defaults to the Chiefs on first load", async () => {
      await page.goto("/ro");
      await expect.poll(() => getAccent1(page)).toBe(getTeam("kc").accent1);
    });

    await test.step("clicking a swatch updates the accent and aria-checked", async () => {
      await eaglesRadio.click();

      await expect.poll(() => getAccent1(page)).toBe(getTeam("phi").accent1);
      await expect(eaglesRadio).toHaveAttribute("aria-checked", "true");
      await expect(chiefsRadio).toHaveAttribute("aria-checked", "false");
    });

    await test.step("reload rehydrates the persisted team with no flash of the default", async () => {
      // No page.waitForTimeout() before this assertion: if the persisted
      // team flashed the default before applying, this poll would catch it.
      await page.reload();
      await expect.poll(() => getAccent1(page)).toBe(getTeam("phi").accent1);
      await expect(eaglesRadio).toHaveAttribute("aria-checked", "true");
    });

    await test.step("ArrowRight moves focus and selection together", async () => {
      await eaglesRadio.focus();
      await page.keyboard.press("ArrowRight");

      const cowboysRadio = page.getByRole("radio", { name: "Dallas Cowboys" });
      await expect(cowboysRadio).toBeFocused();
      await expect(cowboysRadio).toHaveAttribute("aria-checked", "true");
      await expect(eaglesRadio).toHaveAttribute("aria-checked", "false");
      await expect.poll(() => getAccent1(page)).toBe(getTeam("dal").accent1);
    });
  });
});

test.describe("header accessibility across team accents", () => {
  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    test(`header has no axe violations with ${team.name} selected as the active team`, async ({
      page,
    }) => {
      await page.goto("/ro");
      await page.getByRole("radio", { name: team.name }).click();
      await expect.poll(() => getAccent1(page)).toBe(team.accent1);

      // Scoped to the header deliberately: this spec exercises the team
      // picker, which only affects the header. A whole-page axe pass
      // belongs to the homepage's own dedicated a11y test (task 4 step 6),
      // which also needs to handle OriginStrip's phrase animations rather
      // than accidentally scanning them mid-fade.
      const results = await new AxeBuilder({ page }).include("header").analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("header visual regression", () => {
  const viewports = [
    { label: "375", width: 375, height: 800 },
    { label: "768", width: 768, height: 1024 },
    { label: "1440", width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`header matches its ${viewport.label}px baseline screenshot`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/ro");

      await expect(page.getByRole("banner")).toHaveScreenshot(
        `header-${viewport.label}.png`,
      );
    });
  }
});
