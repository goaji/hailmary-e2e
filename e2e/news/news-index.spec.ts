import { getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";
import { articleCount } from "../../api/contentApi";
import { ACCENT_EXTREME_TEAMS, assertNoAccessibilityViolations, columnCount, hasHorizontalOverflow, itemsOutsideViewport } from "../../helpers";
import { test, expect } from "../../fixtures/pageTest";

test.describe("news index", () => {
  test("renders every ro article as a heading link, newest first", async ({ page, request }) => {
    await page.goto("/ro/stiri");

    await expect(page.getByRole("heading", { level: 1, name: ro.newsIndex.title })).toBeVisible();

    const titles = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(titles).toHaveLength(await articleCount(request, "ro"));
    expect(new Set(titles).size).toBe(titles.length); // no duplicate cards

    // Newest first, compared as timestamps: publishedAt mixes date-only
    // ("2026-09-09") and full ISO values, matching sortByPublishedAtDesc.
    const publishedAt = await page
      .getByRole("article")
      .getByRole("time")
      .evaluateAll((els) => els.map((el) => Date.parse(el.getAttribute("datetime") ?? "")));
    expect(publishedAt).toHaveLength(titles.length);
    expect(publishedAt).not.toContain(NaN);
    expect(publishedAt).toEqual([...publishedAt].sort((a, b) => b - a));
  });

  test("nav 'Știri' link points at /stiri and reads active there and on an article page", async ({
    page,
  }) => {
    await page.goto("/ro/stiri");
    const navLink = page
      .getByRole("navigation", { name: ro.nav.mainLabel })
      .getByRole("link", { name: ro.nav.news });
    await expect(navLink).toHaveAttribute("href", "/ro/stiri");
    await expect(navLink).toHaveAttribute("aria-current", "page");

    await page.goto("/ro/stiri/chiefs-al-treilea-titlu-consecutiv");
    await expect(navLink).toHaveAttribute("aria-current", "page");
  });

  // News is Romanian-only — content/articles/en has no files, so /en/stiri
  // falls back to the ro list with a translated notice, the same
  // ro-fallback contract an individual article page already has.
  test("en locale falls back to the ro articles, with a translated notice", async ({
    page,
    request,
  }) => {
    await page.goto("/en/stiri");

    await expect(page.getByRole("heading", { level: 1, name: en.newsIndex.title })).toBeVisible();
    await expect(page.getByText(en.newsIndex.fallbackNotice)).toBeVisible();

    const titles = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(titles).toHaveLength(await articleCount(request, "ro"));
  });
});

test.describe("news index view toggle", () => {
  test("toggles grid/list layout, persists across reload, and is keyboard-navigable", async ({
    page,
  }) => {
    const gridRadio = page.getByRole("radio", { name: ro.newsIndex.gridView });
    const listRadio = page.getByRole("radio", { name: ro.newsIndex.listView });
    const headings = page.getByRole("heading", { level: 2 });

    await test.step("defaults to grid view, cards laid out side by side", async () => {
      await page.goto("/ro/stiri");
      await expect(gridRadio).toHaveAttribute("aria-checked", "true");
      await expect(listRadio).toHaveAttribute("aria-checked", "false");

      const first = await headings.nth(0).boundingBox();
      const second = await headings.nth(1).boundingBox();
      expect(Math.abs((first?.x ?? 0) - (second?.x ?? 0))).toBeGreaterThan(10);
    });

    await test.step("clicking 'Listă' re-flows cards into a single stacked column", async () => {
      await listRadio.click();
      await expect(listRadio).toHaveAttribute("aria-checked", "true");
      await expect(gridRadio).toHaveAttribute("aria-checked", "false");

      const first = await headings.nth(0).boundingBox();
      const second = await headings.nth(1).boundingBox();
      expect(Math.abs((first?.x ?? 0) - (second?.x ?? 0))).toBeLessThan(5);
      expect(second?.y ?? 0).toBeGreaterThan(first?.y ?? 0);
    });

    await test.step("reload rehydrates the persisted view with no flash of the default", async () => {
      // No page.waitForTimeout() before this assertion: if the persisted
      // view flashed grid before applying list, this would catch it.
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
  });

  test("axe clean on /stiri with list view active", async ({ page }) => {
    await page.goto("/ro/stiri");
    await page.getByRole("radio", { name: ro.newsIndex.listView }).click();
    await expect(page.getByRole("radio", { name: ro.newsIndex.listView })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await assertNoAccessibilityViolations(page);
  });
});

test.describe("news index accessibility across team accents", () => {
  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    test(`axe clean on /stiri with ${team.name} selected`, async ({ page, siteHeader }) => {
      await page.goto("/ro/stiri");
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
    }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await page.goto("/ro/stiri");

      const cards = page.getByRole("article");
      await expect(cards.first()).toBeVisible();

      expect(await hasHorizontalOverflow(page)).toBe(false);
      expect(await itemsOutsideViewport(cards)).toEqual([]);
      expect(await columnCount(cards)).toBe(Math.min(layout.gridColumns, await cards.count()));
    });

    test(`list view stacks one card per row at ${layout.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await page.goto("/ro/stiri");

      const listView = page.getByRole("radio", { name: ro.newsIndex.listView });
      await listView.click();
      await expect(listView).toHaveAttribute("aria-checked", "true");

      const cards = page.getByRole("article");
      expect(await hasHorizontalOverflow(page)).toBe(false);
      expect(await itemsOutsideViewport(cards)).toEqual([]);
      expect(await columnCount(cards)).toBe(1);
    });
  }
});
