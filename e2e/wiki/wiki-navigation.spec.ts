import ro from "@hailmary/shared/messages/ro.json";
import { test, expect } from "../../fixtures/pageTest";
import { hrefs } from "../../helpers";
import { WIKI_PATH, type WikiStrand } from "../../pageObjects/WikiHubPage";

const STRANDS = Object.keys(ro.wikiStrands) as WikiStrand[];

// Desktop, so the rail is a visible nav rather than a closed <details>.
test.use({ viewport: { width: 1440, height: 900 } });

for (const strand of STRANDS) {
  test(`${strand}: walk every page by its next link; breadcrumbs, rail and prev/next agree`, async ({
    page,
    wikiHubPage,
    wikiPage,
  }) => {
    await wikiHubPage.goto();
    const pages = (await wikiHubPage.wikiPages()).filter((entry) => entry.strand === strand);
    expect(pages.length).toBeGreaterThan(0);

    for (const [index, current] of pages.entries()) {
      await test.step(current.path, async () => {
        if (index === 0) {
          await wikiPage.goto(current.path);
        } else {
          await wikiPage.nextLink.click(); // reached from the previous page
          await expect(page).toHaveURL((url) => url.pathname === current.path);
        }
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(current.title);

        await expect(wikiPage.breadcrumbWikiLink).toHaveAttribute("href", WIKI_PATH);
        await expect(wikiPage.breadcrumbs.getByRole("link")).toHaveCount(1); // only "Wiki"; there's no strand landing page
        await expect(wikiPage.breadcrumbItems).toHaveText([ro.nav.wiki, ro.wikiStrands[strand].name, current.title]);
        await expect(wikiPage.breadcrumbItems.last()).toHaveAttribute("aria-current", "page");

        await expect(wikiPage.railCurrent()).toHaveText(current.title);
        // Drop the current page's section links; the rest are the strand's other pages.
        const railPaths = (await hrefs(wikiPage.railLinks)).filter((href) => !href.startsWith("#"));
        expect(railPaths).toEqual(pages.filter((other) => other !== current).map((other) => other.path));

        const previous = pages[index - 1];
        const next = pages[index + 1];
        if (previous) {
          await expect(wikiPage.prevLink).toHaveAttribute("href", previous.path);
          await expect(wikiPage.prevLink).toContainText(previous.title);
        } else {
          await expect(wikiPage.prevLink).toHaveCount(0);
        }
        if (next) {
          await expect(wikiPage.nextLink).toHaveAttribute("href", next.path);
          await expect(wikiPage.nextLink).toContainText(next.title);
        } else {
          await expect(wikiPage.nextLink).toHaveCount(0);
        }
      });
    }

    if (pages.length > 1) {
      await test.step("prev and rail links navigate", async () => {
        const last = pages[pages.length - 1];
        await wikiPage.prevLink.click(); // the walk ends on the last page
        await expect(page).toHaveURL((url) => url.pathname === pages[pages.length - 2].path);
        await wikiPage.rail.getByRole("link", { name: last.title, exact: true }).click();
        await expect(page).toHaveURL((url) => url.pathname === last.path);
      });
    }
  });
}

test("the rail lists the hub's strands in hub order, with only the current one expanded", async ({
  wikiHubPage,
  wikiPage,
}) => {
  await wikiHubPage.goto();
  const strandNames = await wikiHubPage.strandHeadings.allTextContents();
  const [first] = await wikiHubPage.wikiPages();
  const currentName = ro.wikiStrands[first.strand].name;

  await wikiPage.goto(first.path);
  await expect(wikiPage.rail.getByRole("button", { name: currentName, exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(wikiPage.collapsedStrands).toHaveText(strandNames.filter((name) => name !== currentName));
});

test("unknown strands, unknown pages, misplaced pages and bare strands 404", async ({ wikiHubPage, wikiPage }) => {
  await wikiHubPage.goto();
  const [first, ...rest] = await wikiHubPage.wikiPages();
  const otherStrand = rest.find((entry) => entry.strand !== first.strand)?.strand;
  expect(otherStrand).toBeDefined();

  const paths = [
    `${WIKI_PATH}/nu-exista/${first.slug}`,
    `${WIKI_PATH}/${first.strand}/nu-exista`,
    `${WIKI_PATH}/${otherStrand}/${first.slug}`, // assumes slugs are unique across strands
    `${WIKI_PATH}/${first.strand}`,
  ];
  for (const path of paths) {
    await test.step(path, async () => {
      const response = await wikiPage.goto(path);
      expect(response?.status()).toBe(404);
      await expect(wikiPage.notFoundTitle).toBeVisible();
    });
  }
});
