import {
  ALL_FILTER,
  CATEGORIES,
  CATEGORY_IDS,
  CONFERENCES,
  DIVISIONS,
  divisionLabel,
  getTeamsByDivision,
  type Category,
} from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import { assertNoAccessibilityViolations, optionGroupLabels, optionLabels, optionValues } from "../../helpers";
import { test, expect } from "../../fixtures/pageTest";
import type { NewsIndexPage } from "../../pageObjects/NewsIndexPage";

// Labels resolve through messageKey, never the category id — CATEGORIES' own rule.
const CATEGORY_LABELS: Record<string, string> = ro.categories;

// The picker's order: conference, then division, then that division's teams.
const PICKER_ORDER = CONFERENCES.flatMap((conference) =>
  DIVISIONS.flatMap((division) => getTeamsByDivision(conference, division)),
);
const TEAM_SLUGS = PICKER_ORDER.map((team) => team.slug);

test.describe("news index filters", () => {
  test("offer every category and team the shared package defines", async ({ newsIndexPage }) => {
    await newsIndexPage.goto();

    expect(await optionValues(newsIndexPage.categoryFilter)).toEqual([ALL_FILTER, ...CATEGORY_IDS]);
    expect(await optionValues(newsIndexPage.teamFilter)).toEqual([ALL_FILTER, ...TEAM_SLUGS]);
    // Teams are grouped by division, so the picker stays navigable at 32 options.
    expect(await optionGroupLabels(newsIndexPage.teamFilter)).toEqual(
      CONFERENCES.flatMap((conference) => DIVISIONS.map((division) => divisionLabel(conference, division))),
    );

    // Values are the app's wiring; these labels are what the reader picks from.
    expect(await optionLabels(newsIndexPage.categoryFilter)).toEqual([
      ro.newsIndex.allCategories,
      ...CATEGORY_IDS.map((id) => CATEGORY_LABELS[CATEGORIES[id].messageKey]),
    ]);
    expect(await optionLabels(newsIndexPage.teamFilter)).toEqual([
      ro.newsIndex.allTeams,
      ...PICKER_ORDER.map((team) => team.name),
    ]);
  });

  test("the category filter partitions the index, with nothing lost or invented", async ({ newsIndexPage }) => {
    await newsIndexPage.goto();
    const all = await newsIndexPage.cardTitles.allTextContents();
    expect(all.length).toBeGreaterThan(1);

    const seen: string[] = [];
    for (const category of CATEGORY_IDS) {
      const titles = await newsIndexPage.applyFilters({ category });
      // Nothing a category shows may be absent from the unfiltered list.
      for (const title of titles) expect(all, `${category}: ${title}`).toContain(title);
      seen.push(...titles);
    }

    // Each article has exactly one category, so the per-category sets tile the index.
    expect(new Set(seen).size, "an article appeared under two categories").toBe(seen.length);
    expect([...seen].sort()).toEqual([...all].sort());
  });

  test("the team filter narrows the index without inventing articles", async ({ newsIndexPage }) => {
    await newsIndexPage.goto();
    const all = await newsIndexPage.cardTitles.allTextContents();

    let narrowed = 0;
    for (const team of TEAM_SLUGS) {
      const titles = await newsIndexPage.applyFilters({ team });
      for (const title of titles) expect(all, `${team}: ${title}`).toContain(title);
      if (titles.length > 0 && titles.length < all.length) narrowed += 1;
    }
    // Otherwise every team either matched everything or nothing, and the filter proved nothing.
    expect(narrowed, "no team filtered the index to a smaller, non-empty set").toBeGreaterThan(0);

    expect(await newsIndexPage.applyFilters({ team: ALL_FILTER })).toEqual(all);
  });

  test("category and team compose", async ({ newsIndexPage }) => {
    await newsIndexPage.goto();
    const pair = await findCombination(newsIndexPage, "matching");

    const byCategory = await newsIndexPage.applyFilters({ category: pair.category, team: ALL_FILTER });
    const byTeam = await newsIndexPage.applyFilters({ category: ALL_FILTER, team: pair.team });
    const both = await newsIndexPage.applyFilters({ category: pair.category, team: pair.team });

    // Composing is exactly the intersection: an over-filtering app that drops an
    // article both filters keep passes any subset-only check.
    const intersection = byCategory.filter((title) => byTeam.includes(title));
    expect([...both].sort()).toEqual([...intersection].sort());
  });

  test("a combination with no matches announces itself", async ({ page, newsIndexPage }) => {
    await newsIndexPage.goto();
    const all = await newsIndexPage.cardTitles.allTextContents();
    await findCombination(newsIndexPage, "empty");

    await expect(newsIndexPage.emptyFiltered).toHaveText(ro.newsIndex.emptyFiltered);
    await expect(newsIndexPage.cards).toHaveCount(0);

    // The empty branch replaces the grid, so axe never sees this state otherwise.
    await assertNoAccessibilityViolations(page);

    await test.step("clearing both filters brings every article back", async () => {
      expect(await newsIndexPage.applyFilters({ category: ALL_FILTER, team: ALL_FILTER })).toEqual(all);
      await expect(newsIndexPage.emptyFiltered).toHaveCount(0);
    });
  });
});

// Which combinations match is editorial, so search for one instead of naming it.
// Returns the pair and leaves the filters set to it.
async function findCombination(
  newsIndexPage: NewsIndexPage,
  wanted: "matching" | "empty",
): Promise<{ category: Category; team: string }> {
  for (const category of CATEGORY_IDS) {
    if ((await newsIndexPage.applyFilters({ category, team: ALL_FILTER })).length === 0) continue;
    for (const team of TEAM_SLUGS) {
      const titles = await newsIndexPage.applyFilters({ category, team });
      if (wanted === "matching" ? titles.length > 0 : titles.length === 0) return { category, team };
    }
  }
  throw new Error(
    wanted === "matching"
      ? "no category and team overlap on any article"
      : "every category and team combination matches an article",
  );
}
