import type { Locator, Page } from "@playwright/test";

export async function getAccent1(page: Page) {
  return page
    .getByRole("banner")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent-1").trim());
}

export async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

// Number of distinct left edges among the items — i.e. how many grid
// columns they're laid out in, independent of the CSS that produces them.
export async function columnCount(items: Locator) {
  const lefts = await items.evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().left)),
  );
  return new Set(lefts).size;
}

// Indexes of items whose box sticks out past either edge of the viewport.
export async function itemsOutsideViewport(items: Locator) {
  return items.evaluateAll((els) => {
    const viewportWidth = document.documentElement.clientWidth;
    return els.flatMap((el, index) => {
      const { left, right } = el.getBoundingClientRect();
      return left < 0 || right > viewportWidth ? [index] : [];
    });
  });
}
