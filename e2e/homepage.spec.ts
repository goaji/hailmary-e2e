import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";

const VIEWPORTS = [
  { label: "375", width: 375, height: 1200 },
  { label: "768", width: 768, height: 1400 },
  { label: "1440", width: 1440, height: 1400 },
];

test.describe("homepage composition", () => {
  test("featured article does not appear in the news grid", async ({ page }) => {
    await page.goto("/ro");

    const heroTitle = await page.getByRole("heading", { level: 1 }).textContent();
    const cardTitles = await page.getByRole("heading", { level: 3 }).allTextContents();

    expect(cardTitles.length).toBeGreaterThan(0);
    expect(cardTitles).not.toContain(heroTitle);
  });

  // News is Romanian-only — content/articles/en has no files, so the en
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

    const cardTitles = await page.getByRole("heading", { level: 3 }).allTextContents();
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

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("prefers-reduced-motion", () => {
  test("origin strip phrases render fully visible with no animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/ro");

    const phrases = page.locator('[class*="phrase"]');
    const count = await phrases.count();
    expect(count).toBeGreaterThan(0);

    const styles = await phrases.evaluateAll((els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        return { animationName: cs.animationName, opacity: cs.opacity };
      }),
    );

    for (const style of styles) {
      expect(style.animationName).toBe("none");
      expect(style.opacity).toBe("1");
    }
  });
});

test.describe("homepage visual regression", () => {
  for (const viewport of VIEWPORTS) {
    test(`full page matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // Reduced motion for a stable capture; the byline is masked because
      // its text can shift from a relative ("acum 2 zile") to an absolute
      // date as real time passes, independent of any code change here.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/ro");

      // nextjs-portal is the dev-only build/route indicator injected by
      // `next dev` (this suite runs against it) — never present in a
      // production build. It's position: fixed, which `mask` doesn't
      // track reliably across a fullPage screenshot's scroll-stitching,
      // so it's hidden outright rather than masked.
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

      await expect(page).toHaveScreenshot(`homepage-${viewport.label}.png`, {
        fullPage: true,
        mask: [page.locator('[class*="byline"]')],
      });
    });
  }
});
