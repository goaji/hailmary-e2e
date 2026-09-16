import ro from "@hailmary/shared/messages/ro.json";
import { test, expect } from "../../fixtures/pageTest";

const NAV_LINKS = [
  { name: ro.nav.wiki, href: "/ro/wiki" },
  { name: ro.nav.news, href: "/ro/stiri" },
  { name: ro.nav.schedule, href: "/ro/program" },
  { name: ro.nav.teams, href: "/ro/echipe" },
  { name: ro.nav.glossary, href: "/ro/glosar" },
];

test.use({ viewport: { width: 1440, height: 900 } });

test("shows every nav link without a menu button", async ({ page, siteHeader }) => {
  await page.goto("/ro");

  await expect(siteHeader.menuToggle).toBeHidden();
  for (const link of NAV_LINKS) {
    const navLink = siteHeader.navLink(link.name);
    await expect(navLink).toBeVisible();
    await expect(navLink).toHaveAttribute("href", link.href);
  }
});
