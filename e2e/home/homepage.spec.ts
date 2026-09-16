import ro from "@hailmary/shared/messages/ro.json";
import { articleCount } from "../../api/contentApi";
import { test, expect } from "../../fixtures/pageTest";
import {
  assertNoAccessibilityViolations,
  columnCount,
  hasHorizontalOverflow,
  hrefs,
  itemsOutsideViewport,
  reopenBrowser,
  viewportsWithHeights,
} from "../../helpers";
import { HomePage } from "../../pageObjects/HomePage";

const VIEWPORTS = viewportsWithHeights([1200, 1400, 1400]);

// The app's GRID_SIZE in app/[locale]/page.tsx.
const GRID_SIZE = 4;

test.describe("homepage composition", () => {
  test("featured article does not appear in the news grid", async ({ homePage }) => {
    await homePage.goto();

    const heroTitle = await homePage.heroTitle.textContent();
    const cardTitles = await homePage.cardTitles.allTextContents();

    expect(cardTitles.length).toBeGreaterThan(0);
    expect(cardTitles).not.toContain(heroTitle);
  });

  // News is Romanian-only for now — content/articles/en has no files, so the en
  // homepage falls back to the ro hero/grid with a translated notice,
  // the same ro-fallback contract an individual article page has.
  test("en locale falls back to the ro hero/grid, with a translated notice", async ({ page }) => {
    const enHomePage = new HomePage(page, "en");
    await enHomePage.goto();

    await expect(enHomePage.fallbackNotice).toBeVisible();

    // lang lives on HeroArticle's own container (article.servedLocale), not the h1 itself.
    const heroLang = await enHomePage.heroTitle.evaluate((el) => el.closest("[lang]")?.getAttribute("lang"));
    expect(heroLang).toBe("ro");

    const cardTitles = await enHomePage.cardTitles.allTextContents();
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

  test("dismissing the origin strip survives a reload", async ({ page, homePage }) => {
    await homePage.goto();

    await expect(homePage.originStripDismiss).toBeVisible();
    await homePage.dismissOriginStrip();
    await expect(homePage.originStripDismiss).toBeHidden();

    await page.reload();
    await expect(homePage.originStripDismiss).toBeHidden();
  });

  test("dismissing the origin strip survives closing and reopening the browser", async ({
    page,
    homePage,
    browser,
  }) => {
    await homePage.goto();
    await homePage.dismissOriginStrip();
    await expect(homePage.originStripDismiss).toBeHidden();

    // The strip is server-rendered, so it only stays hidden if the saved dismissal is read back.
    const reopened = await reopenBrowser(browser, page);
    const reopenedHomePage = new HomePage(reopened);
    await reopenedHomePage.goto();
    await expect(reopenedHomePage.originStripDismiss).toBeHidden();

    await reopened.context().close();
  });

  test("the news grid shows up to four articles besides the featured one", async ({ homePage, request }) => {
    await homePage.goto();

    const expected = Math.min(GRID_SIZE, (await articleCount(request, "ro")) - 1);
    await expect(homePage.cards).toHaveCount(expected);
  });
});

test.describe("homepage links", () => {
  test("the featured title opens its article", async ({ page, homePage }) => {
    await homePage.goto();
    const title = (await homePage.heroTitle.textContent()) ?? "";

    await homePage.heroLink.click();
    await expect(page).toHaveURL(/^[^?#]*\/ro\/stiri\/[^/?#]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  });

  // Checked on /ro only: the wiki has no en pages, so /en's wiki links 404 (accepted for now).
  test("every card, beginner-guide and origin-strip link keeps the locale and resolves", async ({
    homePage,
    request,
  }) => {
    await homePage.goto();
    await expect(homePage.cardLinks).toHaveCount(await homePage.cards.count());
    await expect(homePage.beginnerGuideLinks).not.toHaveCount(0);

    const targets = [
      ...(await hrefs(homePage.cardLinks)),
      ...(await hrefs(homePage.beginnerGuideLinks)),
      ...(await hrefs(homePage.originStripLink)),
    ];
    for (const href of new Set(targets)) {
      expect(href).toMatch(/^\/ro\//);
      const [path, anchor] = href.split("#");
      const response = await request.get(path);
      expect(response.status(), `${href} status`).toBe(200);
      if (anchor) {
        expect(await response.text(), `${href} anchor`).toContain(`id="${anchor}"`);
      }
    }
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
  test("origin strip phrases render fully visible with no animation", async ({ page, homePage }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await homePage.goto();

    const strip = homePage.originStrip;
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
    { width: 375, height: 900, newsColumns: 1, sidebarBesideGrid: false, heroSideBySide: false, cardImagesVisible: false },
    { width: 768, height: 900, newsColumns: 2, sidebarBesideGrid: true, heroSideBySide: true, cardImagesVisible: true },
    { width: 1440, height: 900, newsColumns: 2, sidebarBesideGrid: true, heroSideBySide: true, cardImagesVisible: true },
  ];

  for (const layout of LAYOUTS) {
    test(`reflows without horizontal overflow at ${layout.width}px`, async ({ page, homePage }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await homePage.goto();

      const cards = homePage.cards;
      await expect(cards.first()).toBeVisible();

      expect(await hasHorizontalOverflow(page)).toBe(false);
      expect(await itemsOutsideViewport(cards)).toEqual([]);
      expect(await columnCount(cards)).toBe(Math.min(layout.newsColumns, await cards.count()));

      const gridBox = await homePage.newsGrid.boundingBox();
      const sidebarBox = await homePage.beginnerGuide.boundingBox();
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

    test(`${layout.heroSideBySide ? "puts the featured image beside" : "stacks the featured image above"} its title at ${layout.width}px`, async ({
      page,
      homePage,
    }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await homePage.goto();

      const titleBox = await homePage.heroTitle.boundingBox();
      const imageBox = await homePage.heroImage.boundingBox();
      if (!titleBox || !imageBox) {
        throw new Error("featured title or image is not rendered");
      }

      if (layout.heroSideBySide) {
        expect(imageBox.x).toBeGreaterThanOrEqual(titleBox.x + titleBox.width);
        expect(imageBox.y).toBeLessThan(titleBox.y + titleBox.height);
      } else {
        // The image comes after the h1 in the DOM but renders above it on mobile.
        expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(titleBox.y);
      }
    });

    test(`${layout.cardImagesVisible ? "shows" : "hides"} card images at ${layout.width}px`, async ({
      page,
      homePage,
    }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await homePage.goto();

      await expect(homePage.cards).not.toHaveCount(0);
      await expect(homePage.cardImages).toHaveCount(await homePage.cards.count());
      for (const image of await homePage.cardImages.all()) {
        if (layout.cardImagesVisible) {
          await expect(image).toBeVisible();
        } else {
          await expect(image).toBeHidden();
        }
      }
    });
  }
});
