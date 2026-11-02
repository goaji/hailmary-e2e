import { CONFERENCES, DIVISIONS, PICKER_TEAMS, TEAMS, getTeam, getTeamsByDivision } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import { test, expect } from "../../fixtures/pageTest";
import { ACCENT_EXTREME_TEAMS, assertNoAccessibilityViolations, hasHorizontalOverflow } from "../../helpers";

test.describe("teams index", () => {
  test("has one h1 and a link to the conferences explainer", async ({ teamsPage }) => {
    await teamsPage.goto();

    await expect(teamsPage.title).toBeVisible();
    await expect(teamsPage.title).toHaveCount(1);
    await expect(teamsPage.learnMoreLink).toHaveAttribute("href", "/ro/wiki/the-league/conferinte-si-divizii");
  });

  test("the rail lists all 32 teams, reachable by role and name", async ({ teamsPage }) => {
    await teamsPage.goto();

    for (const team of TEAMS) {
      await expect(teamsPage.teamLink(team.name)).toBeVisible();
    }
  });

  test("the rail groups teams into 8 division lists, in conference then division order", async ({ teamsPage }) => {
    await teamsPage.goto();

    for (const conference of CONFERENCES) {
      for (const division of DIVISIONS) {
        const expected = getTeamsByDivision(conference, division).map((team) => team.name);
        await expect(teamsPage.divisionList(`${conference} ${division}`).getByRole("link")).toHaveText(expected);
      }
    }
  });

  test("the current team is marked in the rail and follows navigation", async ({ page, teamsPage }) => {
    const from = getTeam("kc");
    const to = getTeam("phi");
    await teamsPage.goto(from.slug);
    await expect(teamsPage.teamLink(from.name)).toHaveAttribute("aria-current", "page");

    await teamsPage.teamLink(to.name).click();

    await expect(page).toHaveURL(`/ro/echipe/${to.slug}`);
    await expect(teamsPage.teamLink(to.name)).toHaveAttribute("aria-current", "page");
    await expect(teamsPage.teamLink(from.name)).not.toHaveAttribute("aria-current");
  });

  test("at 375px the rail sits in a closed disclosure that opens to every team", async ({ page, teamsPage }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await teamsPage.goto();
    await expect(teamsPage.rail).toBeHidden();

    await teamsPage.mobileRailToggle.click();

    await expect(teamsPage.railLinks).toHaveCount(TEAMS.length);
    expect(await hasHorizontalOverflow(page)).toBe(false);
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
    // No cards in the news section, not just the empty message beside them.
    const news = page.getByRole("region", { name: ro.teamDetail.news.heading });
    await expect(news).toBeVisible();
    await expect(news.getByRole("article")).toHaveCount(0);
  });

  test("reader's accent survives navigating to a different team's page", async ({ page, siteHeader }) => {
    // This is the task's central contract: the picker is a personal
    // preference, not a route-driven value — the identity band's brand1
    // colors the band only, never --accent-1.
    await page.goto("/ro");
    await siteHeader.selectTeam("Pittsburgh Steelers");
    await expect.poll(() => siteHeader.accent1()).toBe(getTeam("pit").accent1);

    await page.goto("/ro/echipe/bal");
    await expect.poll(() => siteHeader.accent1()).toBe(getTeam("pit").accent1);
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

    test(`axe clean on /echipe with ${team.name} selected`, async ({ page, siteHeader }) => {
      await page.goto("/ro/echipe");
      await siteHeader.selectTeam(team.name);
      await expect.poll(() => siteHeader.accent1()).toBe(team.accent1);

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
        siteHeader,
      }) => {
        await page.goto(`/ro/echipe/${slug}`);
        await siteHeader.selectTeam(pickerTeam.name);
        await expect.poll(() => siteHeader.accent1()).toBe(pickerTeam.accent1);

        await assertNoAccessibilityViolations(page);
      });
    }
  }
});
