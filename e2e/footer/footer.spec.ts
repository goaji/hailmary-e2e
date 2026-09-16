import { DEFAULT_TEAM, getTeam } from "@hailmary/shared";
import { test, expect } from "../../fixtures/pageTest";
import { focusRing, hasHorizontalOverflow, hexToRgb, itemsOutsideViewport, tabTo, VIEWPORT_WIDTHS } from "../../helpers";

// Content and focus don't change with width; the layout test sets its own sizes.
test.use({ viewport: { width: 1440, height: 900 } });

test("shows this year's copyright and a contact link to its own address", async ({ page, siteFooter }) => {
  await page.goto("/ro");

  await expect(siteFooter.copyright(String(new Date().getFullYear()))).toBeVisible();

  const address = await siteFooter.contactLink.textContent();
  expect(address).toMatch(/^\S+@\S+\.\S+$/);
  await expect(siteFooter.contactLink).toHaveAttribute("href", `mailto:${address}`);
});

test("the contact link shows an accent focus ring when tabbed to", async ({ page, siteFooter }) => {
  // The 404 page has few Tab stops before the footer; the homepage has dozens.
  await page.goto("/ro/this-path-does-not-exist-anywhere");
  await tabTo(page, siteFooter.contactLink);

  const accent = hexToRgb(getTeam(DEFAULT_TEAM).accent1);
  expect(await focusRing(siteFooter.contactLink)).toEqual({
    focusVisible: true,
    style: "solid",
    width: "2px",
    color: accent,
  });
});

for (const width of VIEWPORT_WIDTHS) {
  test(`footer fits at ${width}px with every line on screen`, async ({ page, siteFooter }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ro");
    await expect(siteFooter.contactLink).toBeVisible();

    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(await siteFooter.lines.count()).toBeGreaterThan(0);
    expect(await itemsOutsideViewport(siteFooter.lines)).toEqual([]);
  });
}
