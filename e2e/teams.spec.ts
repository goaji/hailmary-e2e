import { test, expect } from "@playwright/test";
import { CONFERENCES, DIVISIONS, PICKER_TEAMS, TEAMS, getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import { ACCENT_EXTREME_TEAMS, assertNoAccessibilityViolations, getAccent1, selectTeam, viewportsWithHeights } from "./helpers";

test.describe("teams index", () => {
  test("renders all 32 teams, reachable by role and name", async ({ page }) => {
    await page.goto("/ro/echipe");

    for (const team of TEAMS) {
      await expect(page.getByRole("link", { name: team.name, exact: true })).toBeVisible();
    }
  });

  test("8 division groups (h3) nested under 2 conference headings (h2), in order", async ({
    page,
  }) => {
    await page.goto("/ro/echipe");

    for (const conference of CONFERENCES) {
      // exact: a division region is named "AFC East" (conference + division),
      // which would otherwise also match { name: "AFC" }.
      const conferenceRegion = page.getByRole("region", { name: conference, exact: true });
      await expect(conferenceRegion.getByRole("heading", { level: 2 })).toHaveText(conference);

      const divisionHeadings = await conferenceRegion.getByRole("heading", { level: 3 }).allTextContents();
      expect(divisionHeadings).toEqual([...DIVISIONS]);

      for (const division of DIVISIONS) {
        await expect(
          conferenceRegion.getByRole("region", { name: `${conference} ${division}`, exact: true }),
        ).toBeVisible();
      }
    }
  });
});

test.describe("team detail page", () => {
  test("renders the team name as h1", async ({ page }) => {
    await page.goto("/ro/echipe/kc");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kansas City Chiefs");
  });

  test("bogus slug renders the custom not-found page, not a stack trace", async ({ page }) => {
    const response = await page.goto("/ro/echipe/does-not-exist-xyz");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: ro.teamNotFound.title })).toBeVisible();
    await expect(page.getByRole("link", { name: ro.teamNotFound.backToTeams })).toBeVisible();
  });

  test("a team with no seed articles shows the empty news message, not empty cards", async ({
    page,
  }) => {
    // Baltimore Ravens have no articles tagged yet. Delete this test once
    // every team has one — the empty state is then unreachable.
    await page.goto("/ro/echipe/bal");

    await expect(
      page.getByText(ro.teamDetail.news.empty.replace("{team}", "Baltimore Ravens")),
    ).toBeVisible();
    // ArticleCard titles are h3 — none rendered anywhere on the page confirms
    // no cards, not just that the empty message happens to also be present.
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(0);
  });

  test("reader's accent survives navigating to a different team's page", async ({ page }) => {
    // This is the task's central contract: the picker is a personal
    // preference, not a route-driven value — the identity band's brand1
    // colors the band only, never --accent-1.
    await page.goto("/ro");
    await page.getByRole("radio", { name: "Pittsburgh Steelers" }).click();
    await expect.poll(() => getAccent1(page)).toBe(getTeam("pit").accent1);

    await page.goto("/ro/echipe/bal");
    await expect.poll(() => getAccent1(page)).toBe(getTeam("pit").accent1);
  });
});

test.describe("team logos", () => {
  for (const team of TEAMS) {
    test(`${team.slug}.svg resolves`, async ({ request }) => {
      const response = await request.get(team.logoUrl);
      expect(response.status()).toBe(200);
    });
  }
});

test.describe("teams index accessibility across team accents", () => {
  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    test(`axe clean on /echipe with ${team.name} selected`, async ({ page }) => {
      await page.goto("/ro/echipe");
      await selectTeam(page, team.name);
      await expect.poll(() => getAccent1(page)).toBe(team.accent1);

      await assertNoAccessibilityViolations(page);
    });
  }
});

test.describe("team detail accessibility across team accents", () => {
  // One light identity band (dark text) and one dark band (light text) —
  // the two onBrandColor outcomes, per AGENTS.md's "no per-team accent
  // contrast guarantee for brand" note.
  const DETAIL_PAGES = [
    { slug: "pit", label: "light brand" }, // Steelers gold — dark foreground
    { slug: "bal", label: "dark brand" }, // Ravens purple — light foreground
  ];

  for (const { slug, label } of DETAIL_PAGES) {
    for (const pickerSlug of PICKER_TEAMS) {
      const pickerTeam = getTeam(pickerSlug);

      test(`axe clean on /echipe/${slug} (${label}) with ${pickerTeam.name} selected`, async ({
        page,
      }) => {
        await page.goto(`/ro/echipe/${slug}`);
        await selectTeam(page, pickerTeam.name);
        await expect.poll(() => getAccent1(page)).toBe(pickerTeam.accent1);

        await assertNoAccessibilityViolations(page);
      });
    }
  }
});

test.describe("teams visual regression", () => {
  const VIEWPORTS = viewportsWithHeights([1400, 1400, 1400]);

  for (const viewport of VIEWPORTS) {
    test(`index matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/ro/echipe");

      // nextjs-portal is the dev-only build/route indicator — see the
      // equivalent note in article.spec.ts.
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

      await expect(page).toHaveScreenshot(`teams-index-${viewport.label}.png`, {
        fullPage: true,
      });
    });

    test(`detail page matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      // Baltimore Ravens: no seed articles, so no relative-date byline text
      // to mask — a stable capture with no time-dependent content at all.
      await page.goto("/ro/echipe/bal");

      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

      await expect(page).toHaveScreenshot(`teams-detail-${viewport.label}.png`, {
        fullPage: true,
      });
    });
  }
});
