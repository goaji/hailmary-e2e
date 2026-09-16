import ro from "@hailmary/shared/messages/ro.json";
import { DEFAULT_TEAM, getTeam } from "@hailmary/shared";
import { test, expect } from "../../fixtures/pageTest";
import { tabTo } from "../../helpers";

function hexToRgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

// Same behaviour at every width; desktop so the nav links are tabbable without opening the menu.
test.use({ viewport: { width: 1440, height: 900 } });

test("marks the section of a child route as current", async ({ page, siteHeader }) => {
  await page.goto("/ro/echipe/kc");

  await expect(siteHeader.navLink(ro.nav.teams)).toHaveAttribute("aria-current", "page");
  await expect(siteHeader.currentNavLinks()).toHaveCount(1);
});

test("every header control shows an accent focus ring when tabbed to", async ({ page, siteHeader }) => {
  await page.goto("/ro");
  // A fresh visit shows the default team; its radio is the picker's only Tab stop.
  const defaultTeam = getTeam(DEFAULT_TEAM);
  const accent = hexToRgb(defaultTeam.accent1);
  const controls = [
    siteHeader.homeLink,
    siteHeader.navLink(ro.nav.news),
    siteHeader.teamRadio(defaultTeam.name),
    siteHeader.languageLink("en"),
  ];

  for (const control of controls) {
    await tabTo(page, control);
    const ring = await control.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        focusVisible: el.matches(":focus-visible"),
        style: style.outlineStyle,
        width: style.outlineWidth,
        color: style.outlineColor,
      };
    });
    expect(ring).toEqual({ focusVisible: true, style: "solid", width: "2px", color: accent });
  }
});
