import { getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import { articleCount } from "../../api/contentApi";
import { ACCENT_EXTREME_TEAMS, ANCHOR_ARTICLE_SLUG, assertNoAccessibilityViolations, columnCount, hasHorizontalOverflow, itemsOutsideViewport, reopenBrowser } from "../../helpers";
import { test, expect } from "../../fixtures/pageTest";
import { NewsIndexPage } from "../../pageObjects/NewsIndexPage";

test.describe("news index", () => {
  test("renders every ro article as a heading link, newest first", async ({ newsIndexPage, request }) => {
    await newsIndexPage.goto();

    await expect(newsIndexPage.title).toBeVisible();

    const titles = await newsIndexPage.cardTitles.allTextContents();
    expect(titles).toHaveLength(await articleCount(request, "ro"));
    expect(new Set(titles).size).toBe(titles.length); // no duplicate cards

    // Newest first, compared as timestamps: publishedAt mixes date-only
    // ("2026-09-09") and full ISO values, matching sortByPublishedAtDesc.
    const publishedAt = await newsIndexPage.publishedTimestamps();
    expect(publishedAt).toHaveLength(titles.length);
    expect(publishedAt).not.toContain(NaN);
    expect(publishedAt).toEqual([...publishedAt].sort((a, b) => b - a));
  });

  test("nav 'Știri' link points at /stiri and reads active there and on an article page", async ({
    page,
    siteHeader,
    newsIndexPage,
  }) => {
    await newsIndexPage.goto();
    const navLink = siteHeader.navLink(ro.nav.news);
    await expect(navLink).toHaveAttribute("href", "/ro/stiri");
    await expect(navLink).toHaveAttribute("aria-current", "page");

    await page.goto(`/ro/stiri/${ANCHOR_ARTICLE_SLUG}`);
    await expect(navLink).toHaveAttribute("aria-current", "page");
  });

  // News is Romanian-only — content/articles/en has no files, so /en/stiri
  // falls back to the ro list with a translated notice, the same
  // ro-fallback contract an individual article page already has.
  test("en locale falls back to the ro articles, with a translated notice", async ({
    page,
    request,
  }) => {
    const enNewsIndexPage = new NewsIndexPage(page, "en");
    await enNewsIndexPage.goto();

    await expect(enNewsIndexPage.title).toBeVisible();
    await expect(enNewsIndexPage.fallbackNotice).toBeVisible();

    const titles = await enNewsIndexPage.cardTitles.allTextContents();
    expect(titles).toHaveLength(await articleCount(request, "ro"));
  });
});

test.describe("news index view toggle", () => {
  test("toggles grid/list layout, persists across reload, and is keyboard-navigable", async ({
    page,
    newsIndexPage,
  }) => {
    const gridRadio = newsIndexPage.gridView;
    const listRadio = newsIndexPage.listView;
    const headings = newsIndexPage.cardTitles;

    await test.step("defaults to grid view, cards laid out side by side", async () => {
      await newsIndexPage.goto();
      await expect(gridRadio).toHaveAttribute("aria-checked", "true");
      await expect(listRadio).toHaveAttribute("aria-checked", "false");

      const first = await headings.nth(0).boundingBox();
      const second = await headings.nth(1).boundingBox();
      expect(Math.abs((first?.x ?? 0) - (second?.x ?? 0))).toBeGreaterThan(10);
    });

    await test.step("clicking 'Listă' re-flows cards into a single stacked column", async () => {
      await newsIndexPage.switchToListView();
      await expect(listRadio).toHaveAttribute("aria-checked", "true");
      await expect(gridRadio).toHaveAttribute("aria-checked", "false");

      const first = await headings.nth(0).boundingBox();
      const second = await headings.nth(1).boundingBox();
      expect(Math.abs((first?.x ?? 0) - (second?.x ?? 0))).toBeLessThan(5);
      expect(second?.y ?? 0).toBeGreaterThan(first?.y ?? 0);
    });

    await test.step("reload restores the saved view", async () => {
      // Retries until list shows, so a grid flash before hydration still passes.
      // Tracked in goaji/hailmary#11, which adds a pre-hydration test.
      await page.reload();
      await expect(listRadio).toHaveAttribute("aria-checked", "true");
    });

    await test.step("ArrowLeft moves focus and selection together, back to grid", async () => {
      await listRadio.focus();
      await page.keyboard.press("ArrowLeft");

      await expect(gridRadio).toBeFocused();
      await expect(gridRadio).toHaveAttribute("aria-checked", "true");
      await expect(listRadio).toHaveAttribute("aria-checked", "false");
    });

    await test.step("clicking 'Grilă' restores side-by-side cards and saves grid", async () => {
      await newsIndexPage.switchToListView();
      await expect.poll(() => newsIndexPage.storedView()).toBe("list");
      await newsIndexPage.switchToGridView();
      await expect(gridRadio).toHaveAttribute("aria-checked", "true");

      const first = await headings.nth(0).boundingBox();
      const second = await headings.nth(1).boundingBox();
      expect(Math.abs((first?.x ?? 0) - (second?.x ?? 0))).toBeGreaterThan(10);

      // Grid is also the pre-hydration default, so a reload can't prove it was saved.
      await expect.poll(() => newsIndexPage.storedView()).toBe("grid");
    });
  });

  test("the saved view survives closing and reopening the browser", async ({ page, newsIndexPage, browser }) => {
    await newsIndexPage.goto();
    await newsIndexPage.switchToListView();
    await expect(newsIndexPage.listView).toHaveAttribute("aria-checked", "true");

    const reopened = await reopenBrowser(browser, page);
    const reopenedNewsIndex = new NewsIndexPage(reopened);
    await reopenedNewsIndex.goto();
    await expect(reopenedNewsIndex.listView).toHaveAttribute("aria-checked", "true");

    await reopened.context().close();
  });

  test("axe clean on /stiri with list view active", async ({ page, newsIndexPage }) => {
    await newsIndexPage.goto();
    await newsIndexPage.switchToListView();
    await expect(newsIndexPage.listView).toHaveAttribute("aria-checked", "true");

    await assertNoAccessibilityViolations(page);
  });
});

test.describe("news index accessibility across team accents", () => {
  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    test(`axe clean on /stiri with ${team.name} selected`, async ({ page, siteHeader, newsIndexPage }) => {
      await newsIndexPage.goto();
      await siteHeader.selectTeam(team.name);

      await assertNoAccessibilityViolations(page);
    });
  }
});

// Layout checks instead of full-page screenshots: the news index is
// editorial content, so a screenshot baseline breaks with every published
// article.
test.describe("news index layout", () => {
  const LAYOUTS = [
    { width: 375, height: 900, gridColumns: 1 },
    { width: 768, height: 900, gridColumns: 2 },
    { width: 1440, height: 900, gridColumns: 3 },
  ];

  for (const layout of LAYOUTS) {
    test(`grid view reflows to ${layout.gridColumns} column(s) at ${layout.width}px`, async ({
      page,
      newsIndexPage,
    }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await newsIndexPage.goto();

      const cards = newsIndexPage.cards;
      await expect(cards.first()).toBeVisible();

      expect(await hasHorizontalOverflow(page)).toBe(false);
      expect(await itemsOutsideViewport(cards)).toEqual([]);
      expect(await columnCount(cards)).toBe(Math.min(layout.gridColumns, await cards.count()));
    });

    test(`list view stacks one card per row at ${layout.width}px`, async ({ page, newsIndexPage }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await newsIndexPage.goto();

      await newsIndexPage.switchToListView();
      await expect(newsIndexPage.listView).toHaveAttribute("aria-checked", "true");

      const cards = newsIndexPage.cards;
      expect(await hasHorizontalOverflow(page)).toBe(false);
      expect(await itemsOutsideViewport(cards)).toEqual([]);
      expect(await columnCount(cards)).toBe(1);
    });
  }
});
