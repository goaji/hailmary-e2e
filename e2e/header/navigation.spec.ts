import ro from "@hailmary/shared/messages/ro.json";
import { DEFAULT_TEAM, getTeam } from "@hailmary/shared";
import { test, expect } from "../../fixtures/pageTest";
import { focusRing, hexToRgb, tabTo } from "../../helpers";

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
    expect(await focusRing(control)).toEqual({ focusVisible: true, style: "solid", width: "2px", color: accent });
  }
});
