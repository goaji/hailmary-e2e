import { getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import { articleCount } from "../../api/contentApi";
import { ACCENT_EXTREME_TEAMS, ANCHOR_ARTICLE_SLUG, assertNoAccessibilityViolations, columnCount, hasHorizontalOverflow, itemsOutsideViewport } from "../../helpers";
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
    { width: 768, height: 900, gridColumns: 3 },
    { width: 1440, height: 900, gridColumns: 3 },
  ];

  for (const layout of LAYOUTS) {
    test(`reflows to ${layout.gridColumns} column(s) at ${layout.width}px`, async ({
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
  }
});
