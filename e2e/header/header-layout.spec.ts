import { test, expect } from "../../fixtures/pageTest";
import { hasHorizontalOverflow, itemsOutsideViewport, VIEWPORT_WIDTHS } from "../../helpers";

// Below this width the menu button replaces the full nav.
const MD_BREAKPOINT = 768;

for (const width of VIEWPORT_WIDTHS) {
  test(`header fits at ${width}px with every control on screen`, async ({ page, siteHeader }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ro");

    if (width < MD_BREAKPOINT) {
      await siteHeader.menuToggle.click();
    }
    await expect(siteHeader.mainNav).toBeVisible();

    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(await itemsOutsideViewport(siteHeader.controls)).toEqual([]);
  });
}

test("one pixel below the breakpoint the menu button takes over", async ({ page, siteHeader }) => {
  await page.setViewportSize({ width: MD_BREAKPOINT - 1, height: 1024 });
  await page.goto("/ro");

  await expect(siteHeader.menuToggle).toBeVisible();
  await expect(siteHeader.mainNav).toBeHidden();
});
