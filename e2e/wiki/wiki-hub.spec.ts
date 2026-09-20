import ro from "@hailmary/shared/messages/ro.json";
import { test, expect } from "../../fixtures/pageTest";
import { columnCount, hasHorizontalOverflow, itemsOutsideViewport } from "../../helpers";
import { WIKI_PATH, type WikiStrand } from "../../pageObjects/WikiHubPage";

const STRANDS = Object.keys(ro.wikiStrands) as WikiStrand[];

test.describe("wiki hub", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("introduces the wiki and cards every strand once, in app order", async ({ wikiHubPage }) => {
    await wikiHubPage.goto();

    await expect(wikiHubPage.title).toBeVisible();
    await expect(wikiHubPage.intro).toBeVisible();
    await expect(wikiHubPage.strandHeadings).toHaveText(STRANDS.map((strand) => ro.wikiStrands[strand].name));

    for (const strand of STRANDS) {
      await expect(wikiHubPage.strandDescription(strand)).toBeVisible();
    }
  });

  test("each card lists that strand's pages, and no page is listed twice", async ({ wikiHubPage }) => {
    await wikiHubPage.goto();
    const pages = await wikiHubPage.wikiPages();

    // Every link in main is a wiki page link: nothing is dropped by wikiPages()'s filter.
    await expect(wikiHubPage.pageLinks).toHaveCount(pages.length);
    expect(new Set(pages.map((entry) => entry.path)).size).toBe(pages.length);

    for (const strand of STRANDS) {
      const strandPages = pages.filter((entry) => entry.strand === strand);
      expect(strandPages.length, strand).toBeGreaterThan(0);
      for (const entry of strandPages) {
        expect(entry.path).toBe(`${WIKI_PATH}/${strand}/${entry.slug}`);
        expect(entry.title).not.toBe("");
      }
    }
  });
});

test.describe("wiki hub layout", () => {
  // The strand cards: one column on a phone, two from md, three from lg.
  const LAYOUTS = [
    { width: 375, columns: 1 },
    { width: 768, columns: 2 },
    { width: 1440, columns: 3 },
  ];

  for (const layout of LAYOUTS) {
    test(`cards sit in ${layout.columns} column(s) at ${layout.width}px`, async ({ page, wikiHubPage }) => {
      await page.setViewportSize({ width: layout.width, height: 900 });
      await wikiHubPage.goto();
      await expect(wikiHubPage.strandHeadings.first()).toBeVisible();

      expect(await hasHorizontalOverflow(page)).toBe(false);
      expect(await itemsOutsideViewport(wikiHubPage.strandHeadings)).toEqual([]);
      expect(await columnCount(wikiHubPage.strandHeadings)).toBe(layout.columns);
    });
  }
});
