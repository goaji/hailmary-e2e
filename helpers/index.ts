import { expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// configure: for scans narrowed to part of the page, e.g. (b) => b.include('[data-testid="site-header"]').
export async function assertNoAccessibilityViolations(
  page: Page,
  configure: (builder: AxeBuilder) => AxeBuilder = (builder) => builder,
) {
  const results = await configure(new AxeBuilder({ page })).analyze();
  expect(results.violations).toEqual([]);
}

// The two ends of PICKER_TEAMS' accent luminance (Packers gold 0.55,
// Patriots red 0.22) — where an accent-contrast bug shows first. Pages whose
// own risk is accent contrast (header, team identity band) still scan all six.
export const ACCENT_EXTREME_TEAMS = ["gb", "ne"] as const;

export const VIEWPORT_WIDTHS = [375, 768, 1440] as const;

// Heights stay per-spec: they set the capture area of existing baselines.
export function viewportsWithHeights(heights: readonly [number, number, number]) {
  return VIEWPORT_WIDTHS.map((width, index) => ({
    label: String(width),
    width,
    height: heights[index],
  }));
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
