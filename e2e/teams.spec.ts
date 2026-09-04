import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { CONFERENCES, DIVISIONS, PICKER_TEAMS, TEAMS, getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";

// --accent-1 inherits from the TeamColorProvider wrapper to every
// descendant, so reading it off the header landmark (already reachable by
// role) avoids needing a testid — same helper as team-color.spec.ts.
async function getAccent1(page: Page) {
  return page
    .getByRole("banner")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent-1").trim());
}

test.describe("teams index", () => {
  test("renders all 32 teams, reachable by role and name", async ({ page }) => {
    await page.goto("/ro/echipe");

    for (const team of TEAMS) {
      await expect(page.getByRole("link", { name: team.name })).toBeVisible();
    }
  });

  test("8 division groups (h3) nested under 2 conference headings (h2), in order", async ({
    page,
  }) => {
    await page.goto("/ro/echipe");

    const conferenceHeadings = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(conferenceHeadings).toEqual([...CONFERENCES]);

    const divisionHeadings = await page.getByRole("heading", { level: 3 }).allTextContents();
    expect(divisionHeadings).toEqual([...CONFERENCES.flatMap(() => DIVISIONS)]);
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
    // Baltimore Ravens have no seed articles tagged.
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
  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    test(`axe clean on /echipe with ${team.name} selected`, async ({ page }) => {
      await page.goto("/ro/echipe");
      await page.getByRole("radio", { name: team.name }).click();
      await expect.poll(() => getAccent1(page)).toBe(team.accent1);

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
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
        await page.getByRole("radio", { name: pickerTeam.name }).click();
        await expect.poll(() => getAccent1(page)).toBe(pickerTeam.accent1);

        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});

test.describe("teams visual regression", () => {
  const VIEWPORTS = [
    { label: "375", width: 375, height: 1400 },
    { label: "768", width: 768, height: 1400 },
    { label: "1440", width: 1440, height: 1400 },
  ];

  for (const viewport of VIEWPORTS) {
    test(`index matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/ro/echipe");

      // nextjs-portal is the dev-only build/route indicator — see the
      // equivalent note in homepage.spec.ts.
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
