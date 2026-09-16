import { expect, type Browser, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// configure: for scans narrowed to part of the page, e.g. (b) => b.include(SITE_HEADER_AXE_SCOPE).
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

// The one article whose exact content tests may assert; editing it means updating those tests.
export const ANCHOR_ARTICLE_SLUG = "chiefs-al-treilea-titlu-consecutiv";

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

// Tabs forward until the target has focus, so tests don't hard-code the tab order.
export async function tabTo(page: Page, target: Locator, maxPresses = 30): Promise<void> {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press("Tab");
    const focused = await target.evaluate((el) => el === document.activeElement);
    if (focused) return;
  }
  throw new Error(`Tab never reached ${target} in ${maxPresses} presses`);
}

// Simulates closing and reopening the browser: keeps saved storage, drops session cookies.
// The caller closes the returned page's context.
export async function reopenBrowser(browser: Browser, page: Page): Promise<Page> {
  const state = await page.context().storageState();
  const cookies = state.cookies.filter((cookie) => cookie.expires !== -1);
  const context = await browser.newContext({ storageState: { ...state, cookies } });
  const reopened = await context.newPage();
  return reopened;
}

export function hexToRgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

export type FocusRing = { focusVisible: boolean; style: string; width: string; color: string };

// The outline a focused element draws, plus whether the browser treats the focus as keyboard focus.
export async function focusRing(target: Locator): Promise<FocusRing> {
  const ring = await target.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      focusVisible: el.matches(":focus-visible"),
      style: style.outlineStyle,
      width: style.outlineWidth,
      color: style.outlineColor,
    };
  });
  return ring;
}

export type HeadMetadata = { canonical: string | null; alternates: Record<string, string>; ogImage: string | null };

// Canonical, hreflang links and og:image. Reads the whole document, since Next may stream metadata into <body>.
export async function headMetadata(page: Page): Promise<HeadMetadata> {
  const metadata = await page.evaluate(() => {
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
    const links = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'));
    const alternates = Object.fromEntries(links.map((link) => [link.getAttribute("hreflang") ?? "", link.getAttribute("href") ?? ""]));
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null;
    return { canonical, alternates, ogImage };
  });
  return metadata;
}
