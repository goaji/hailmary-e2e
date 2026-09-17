import ro from "@hailmary/shared/messages/ro.json";
import { test, expect } from "../../fixtures/pageTest";
import { hasHorizontalOverflow, itemsOutsideViewport, VIEWPORT_WIDTHS } from "../../helpers";
import type { WikiStrand } from "../../pageObjects/WikiHubPage";
import { DIAGRAM_KEYS } from "../../pageObjects/WikiPage";
import { DIAGRAM_PAGES } from "./diagramPages";

const STRANDS = Object.keys(ro.wikiStrands) as WikiStrand[];

test.describe("every wiki page on a phone", () => {
  test.use({ viewport: { width: 375, height: 900 } });

  for (const strand of STRANDS) {
    test(`${strand}: each page loads, fits, and has exactly the diagrams it should`, async ({
      wikiHubPage,
      wikiPage,
      page,
    }) => {
      await wikiHubPage.goto();
      const pages = (await wikiHubPage.wikiPages()).filter((entry) => entry.strand === strand);
      expect(pages.length).toBeGreaterThan(0);

      for (const current of pages) {
        await test.step(current.path, async () => {
          const response = await wikiPage.goto(current.path);
          expect(response?.status()).toBe(200);
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(current.title);
          expect(await hasHorizontalOverflow(page)).toBe(false);

          for (const key of DIAGRAM_KEYS) {
            const expected = DIAGRAM_PAGES[key] === current.path ? 1 : 0;
            await expect(wikiPage.diagram(key), key).toHaveCount(expected);
          }
        });
      }
    });
  }
});

test.describe("diagram layout", () => {
  for (const key of DIAGRAM_KEYS) {
    test(`${key} fits at every width`, async ({ page, wikiPage }) => {
      for (const width of VIEWPORT_WIDTHS) {
        await test.step(`${width}px`, async () => {
          await page.setViewportSize({ width, height: 900 });
          await wikiPage.goto(DIAGRAM_PAGES[key]);

          const diagram = wikiPage.diagram(key);
          await expect(diagram).toBeVisible();
          expect(await hasHorizontalOverflow(page)).toBe(false);
          expect(await itemsOutsideViewport(diagram)).toEqual([]);
        });
      }
    });
  }
});
