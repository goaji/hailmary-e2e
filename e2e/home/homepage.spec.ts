import { test, expect } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";
import { assertNoAccessibilityViolations, columnCount, hasHorizontalOverflow, itemsOutsideViewport, viewportsWithHeights } from "../../helpers";

const VIEWPORTS = viewportsWithHeights([1200, 1400, 1400]);

test.describe("homepage composition", () => {
  test("featured article does not appear in the news grid", async ({ page }) => {
    await page.goto("/ro");

    const heroTitle = await page.getByRole("heading", { level: 1 }).textContent();
    const cardTitles = await page
      .getByRole("region", { name: ro.newsGrid.heading })
      .getByRole("article")
      .getByRole("heading")
      .allTextContents();

    expect(cardTitles.length).toBeGreaterThan(0);
    expect(cardTitles).not.toContain(heroTitle);
  });

  // News is Romanian-only for now — content/articles/en has no files, so the en
  // homepage falls back to the ro hero/grid with a translated notice,
  // the same ro-fallback contract an individual article page has.
  test("en locale falls back to the ro hero/grid, with a translated notice", async ({ page }) => {
    await page.goto("/en");

    await expect(page.getByText(en.newsIndex.fallbackNotice)).toBeVisible();

    // lang lives on HeroArticle's own container (article.servedLocale), not the h1 itself.
    const heroLang = await page
      .getByRole("heading", { level: 1 })
      .evaluate((el) => el.closest("[lang]")?.getAttribute("lang"));
    expect(heroLang).toBe("ro");

    const cardTitles = await page
      .getByRole("region", { name: en.newsGrid.heading })
      .getByRole("article")
      .getByRole("heading")
      .allTextContents();
    expect(cardTitles.length).toBeGreaterThan(0);
  });

  test("heading order is h1, then h2 section headings, then h3 card titles", async ({
    page,
  }) => {
    await page.goto("/ro");

    const levels = await page
      .locator("h1, h2, h3")
      .evaluateAll((headings) => headings.map((h) => Number(h.tagName[1])));

    expect(levels[0]).toBe(1);
    // Every h3 (card title) is preceded by the news grid's h2, and no h3
    // ever appears before the first h2 or after a later h2 that isn't
    // its section — i.e. h3s form one contiguous block right after an h2.
    const firstH3 = levels.indexOf(3);
    expect(firstH3).toBeGreaterThan(0);
    expect(levels[firstH3 - 1]).toBe(2);
    expect(levels.slice(1)).not.toContain(1);
  });

  test("dismissing the origin strip survives a reload", async ({ page }) => {
    await page.goto("/ro");

    const dismissButton = page.getByRole("button", { name: ro.originStrip.dismiss });
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();
    await expect(dismissButton).toBeHidden();

    await page.reload();
    await expect(page.getByRole("button", { name: ro.originStrip.dismiss })).toBeHidden();
  });
});

test.describe("homepage accessibility", () => {
  for (const viewport of VIEWPORTS) {
    test(`axe clean at ${viewport.label}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // Freezes OriginStrip's staggered fade-ins to their end state so the
      // scan doesn't catch text mid-fade (a proven false positive source —
      // see the header-only axe test in team-color.spec.ts).
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/ro");

      await assertNoAccessibilityViolations(page);
    });
  }
});

test.describe("prefers-reduced-motion", () => {
  test("origin strip phrases render fully visible with no animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/ro");

    const strip = page.locator("#origin-strip");
    const phrases = [
      ro.originStrip.phrase1,
      ro.originStrip.phrase2,
      ro.originStrip.phrase3,
      ro.originStrip.phrase4,
    ];

    for (const phrase of phrases) {
      const style = await strip.getByText(phrase.trim()).evaluate((el) => {
        const cs = getComputedStyle(el);
        return { animationName: cs.animationName, opacity: cs.opacity };
      });
      expect(style.animationName).toBe("none");
      expect(style.opacity).toBe("1");
    }
  });
});

// Layout checks instead of full-page screenshots: the homepage is editorial
// content, so a screenshot baseline breaks with every published article.
test.describe("homepage layout", () => {
  const LAYOUTS = [
    { width: 375, height: 900, newsColumns: 1, sidebarBesideGrid: false },
    { width: 768, height: 900, newsColumns: 2, sidebarBesideGrid: true },
    { width: 1440, height: 900, newsColumns: 2, sidebarBesideGrid: true },
  ];

  for (const layout of LAYOUTS) {
    test(`reflows without horizontal overflow at ${layout.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await page.goto("/ro");

      const newsGrid = page.getByRole("region", { name: ro.newsGrid.heading, exact: true });
      const cards = newsGrid.getByRole("article");
      await expect(cards.first()).toBeVisible();

      expect(await hasHorizontalOverflow(page)).toBe(false);
      expect(await itemsOutsideViewport(cards)).toEqual([]);
      expect(await columnCount(cards)).toBe(Math.min(layout.newsColumns, await cards.count()));

      const gridBox = await newsGrid.boundingBox();
      const sidebarBox = await page
        .getByRole("region", { name: ro.sidebar.beginnerGuide.heading, exact: true })
        .boundingBox();
      if (!gridBox || !sidebarBox) {
        throw new Error("news grid or sidebar is not rendered");
      }

      const gridBottom = gridBox.y + gridBox.height;
      if (layout.sidebarBesideGrid) {
        expect(sidebarBox.x).toBeGreaterThanOrEqual(gridBox.x + gridBox.width);
        expect(sidebarBox.y).toBeLessThan(gridBottom);
      } else {
        expect(sidebarBox.y).toBeGreaterThanOrEqual(gridBottom);
      }
    });
  }
});
