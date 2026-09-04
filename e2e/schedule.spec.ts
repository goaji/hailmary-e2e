import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PICKER_TEAMS, getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import type { Game } from "@hailmary/shared";

// No shared filesystem with the deployed target, so the store is seeded
// over HTTP via /api/test/seed-scores rather than written to disk
// directly — see E2E-SPLIT-PLAN.md. Real requests hit the same store, so
// the whole file runs serially (not just each describe block) to keep
// two tests here from racing on it. Other spec files never touch the
// store, so they're unaffected either way.
test.describe.configure({ mode: "serial" });

const SEED_URL = `${process.env.E2E_BASE_URL}/api/test/seed-scores`;
const SEED_HEADERS = {
  "content-type": "application/json",
  "x-e2e-secret": process.env.E2E_TEST_SECRET ?? "",
};

async function writeStore(games: Game[]) {
  const res = await fetch(SEED_URL, { method: "POST", headers: SEED_HEADERS, body: JSON.stringify({ games }) });
  if (!res.ok) {
    throw new Error(`seed-scores POST failed: ${res.status}`);
  }
}

async function clearStore() {
  const res = await fetch(SEED_URL, { method: "DELETE", headers: SEED_HEADERS });
  if (!res.ok) {
    throw new Error(`seed-scores DELETE failed: ${res.status}`);
  }
}

const LIVE_GAME: Game = {
  id: "w2-kc-buf",
  homeTeamId: "kc",
  awayTeamId: "buf",
  kickoff: "2026-09-13T20:25:00Z",
  week: 2,
  status: "live",
  homeScore: 14,
  awayScore: 10,
  quarter: 3,
  clock: "05:12",
};

const FINAL_GAME_A: Game = {
  id: "w2-phi-dal",
  homeTeamId: "phi",
  awayTeamId: "dal",
  kickoff: "2026-09-13T17:00:00Z",
  week: 2,
  status: "final",
  homeScore: 27,
  awayScore: 20,
};

const FINAL_GAME_B: Game = {
  id: "w2-mia-ne",
  homeTeamId: "mia",
  awayTeamId: "ne",
  kickoff: "2026-09-14T00:15:00Z",
  week: 2,
  status: "final",
  homeScore: 24,
  awayScore: 17,
};

const WEEK3_GAME: Game = {
  id: "w3-sea-sf",
  homeTeamId: "sea",
  awayTeamId: "sf",
  kickoff: "2026-09-20T20:25:00Z",
  week: 3,
  status: "scheduled",
};

async function selectTeam(page: Page, name: string) {
  await page.goto("/ro");
  await page.getByRole("radio", { name }).click();
}

test.describe("degraded path — empty store", () => {
  test.beforeEach(() => clearStore());
  test.afterEach(() => clearStore());

  test("renders the fixture schedule with the degraded notice", async ({ page }) => {
    await page.goto("/ro/program");

    await expect(page.getByText(ro.schedulePage.liveUnavailableNotice)).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("49ers")).toBeVisible();
    await expect(page.getByText("Ravens")).toBeVisible();
  });

  test("kickoff times render in Bucharest local time under a foreign browser timezone", async ({
    browser,
  }) => {
    // A US-based browser timezone is the case most likely to reveal a bug
    // that a Bucharest-timezone dev machine would never catch.
    const context = await browser.newContext({ timezoneId: "America/New_York" });
    const page = await context.newPage();
    await page.goto("/ro/program");

    // Matches formatKickoff.test.ts's known conversion for this exact
    // fixture kickoff (2026-09-13T17:00:00Z -> 20:00 Bucharest, UTC+3 in September).
    await expect(page.getByText("dum. 20:00")).toBeVisible();

    await context.close();
  });
});

test.describe("week selector and table structure", () => {
  test.beforeEach(() => writeStore([LIVE_GAME, FINAL_GAME_A, WEEK3_GAME]));
  test.afterEach(() => clearStore());

  test("week links change the URL and the rendered week; back button works", async ({ page }) => {
    await page.goto("/ro/program");

    const week2Link = ro.schedulePage.week.replace("{week}", "2");
    const week3Link = ro.schedulePage.week.replace("{week}", "3");

    await expect(page.getByRole("link", { name: week2Link })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Chiefs")).toBeVisible();

    await page.getByRole("link", { name: week3Link }).click();
    await expect(page).toHaveURL(/\?etapa=3$/);
    await expect(page.getByRole("link", { name: week3Link })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Seahawks")).toBeVisible();
    await expect(page.getByText("Chiefs")).not.toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/\?etapa=3$/);
    await expect(page.getByText("Chiefs")).toBeVisible();
  });

  test("table has a caption naming the week and th scope=col headers", async ({ page }) => {
    await page.goto("/ro/program");

    const table = page.getByRole("table", { name: ro.scheduleTable.caption.replace("{week}", "2") });
    await expect(table).toBeVisible();
    for (const name of [ro.scheduleTable.matchup, ro.scheduleTable.kickoff, ro.scheduleTable.score]) {
      await expect(table.getByRole("columnheader", { name })).toBeVisible();
    }
  });

  test("the scroll wrapper is reachable by keyboard", async ({ page }) => {
    await page.goto("/ro/program");

    const region = page.getByRole("region", { name: ro.scheduleTable.scrollLabel });
    await region.focus();
    await expect(region).toBeFocused();
  });

  test("live game exposes \"în direct\" to the accessibility tree, not just a colored dot", async ({
    page,
  }) => {
    await page.goto("/ro/program");
    await expect(page.getByText(ro.liveScoreBadge.live)).toBeVisible();
  });

  // A screen reader only hears a score/clock change if it's inside a live
  // region — otherwise polling updates the DOM silently for that audience.
  // role="status" live regions expose no accessible *name* by spec (their
  // content is the announcement, not a label), so this checks the role's
  // presence and content separately rather than via getByRole's name filter.
  test("live score and status badge are announced via role=status", async ({ page }) => {
    await page.goto("/ro/program");

    const statuses = await page.getByRole("status").allTextContents();
    expect(statuses.some((text) => text.includes(ro.liveScoreBadge.live))).toBe(true);
    expect(statuses.some((text) => /\d+–\d+/.test(text))).toBe(true);
  });

  test("no odds anywhere on the page", async ({ page }) => {
    await page.goto("/ro/program");
    const bodyText = await page.locator("body").innerText();
    for (const term of ["spread", "favorit", "underdog", "linie", "over/under"]) {
      expect(bodyText.toLowerCase()).not.toContain(term);
    }
  });
});

test.describe("all-finals page issues no polling requests", () => {
  test.beforeEach(() => writeStore([FINAL_GAME_A, FINAL_GAME_B]));
  test.afterEach(() => clearStore());

  test("zero requests to /api/scores after load", async ({ page }) => {
    const scoreRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/scores")) {
        scoreRequests.push(req.url());
      }
    });

    await page.goto("/ro/program", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    expect(scoreRequests).toHaveLength(0);
  });
});

test.describe("no-JS", () => {
  test.use({ javaScriptEnabled: false });

  test("schedule still renders correctly without JavaScript", async ({ page }) => {
    await page.goto("/ro/program");

    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("49ers")).toBeVisible();
  });
});

test.describe("schedule accessibility across team accents", () => {
  test.beforeAll(() => writeStore([LIVE_GAME, FINAL_GAME_A, WEEK3_GAME]));
  test.afterAll(() => clearStore());

  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    test(`axe clean on /program with ${team.name} selected`, async ({ page }) => {
      await selectTeam(page, team.name);
      await page.goto("/ro/program");

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("schedule visual regression", () => {
  const VIEWPORTS = [
    { label: "375", width: 375, height: 1000 },
    { label: "768", width: 768, height: 900 },
    { label: "1440", width: 1440, height: 900 },
  ];

  test.describe("with a live game", () => {
    test.beforeAll(() => writeStore([LIVE_GAME, FINAL_GAME_A]));
    test.afterAll(() => clearStore());

    for (const viewport of VIEWPORTS) {
      test(`matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/ro/program");

        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

        await expect(page).toHaveScreenshot(`schedule-live-${viewport.label}.png`, {
          fullPage: true,
          mask: [page.locator('[class*="updatedAt"]')],
        });
      });
    }
  });

  test.describe("with all finals", () => {
    test.beforeAll(() => writeStore([FINAL_GAME_A, FINAL_GAME_B]));
    test.afterAll(() => clearStore());

    for (const viewport of VIEWPORTS) {
      test(`matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/ro/program");

        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

        await expect(page).toHaveScreenshot(`schedule-final-${viewport.label}.png`, {
          fullPage: true,
          mask: [page.locator('[class*="updatedAt"]')],
        });
      });
    }
  });
});

test.describe("cron route", () => {
  test("unauthenticated request is rejected with 401", async ({ request }) => {
    const response = await request.get("/api/cron/sync-scores");
    expect(response.status()).toBe(401);
  });

  test("wrong secret is rejected with 401", async ({ request }) => {
    const response = await request.get("/api/cron/sync-scores", {
      headers: { "X-Cron-Secret": "definitely-wrong" },
    });
    expect(response.status()).toBe(401);
  });

  // These two need CRON_SECRET set in the environment running both this
  // test process and the webServer it's talking to — skipped rather than
  // failed when it's absent, since there's nothing "correct" to send.
  const secret = process.env.CRON_SECRET;

  test("correct secret is accepted with 200", async ({ request }) => {
    test.skip(!secret, "CRON_SECRET is not set in this environment");
    const response = await request.get("/api/cron/sync-scores", {
      headers: { "X-Cron-Secret": secret! },
    });
    expect(response.status()).toBe(200);
  });

  test("two concurrent authenticated calls leave the store as valid JSON", async ({ request }) => {
    test.skip(!secret, "CRON_SECRET is not set in this environment");

    await Promise.all([
      request.get("/api/cron/sync-scores", { headers: { "X-Cron-Secret": secret! } }),
      request.get("/api/cron/sync-scores", { headers: { "X-Cron-Secret": secret! } }),
    ]);

    // No shared filesystem with the deployed target to read the store
    // file directly, so this checks the store through /api/scores instead
    // — a weaker guarantee than the original (readScores() swallows a
    // corrupt file into an empty store rather than surfacing it), but
    // still catches the HTTP layer serving anything malformed after two
    // concurrent writes.
    const response = await request.get("/api/scores");
    expect(response.status()).toBe(200);
    const body = await response.json(); // throws if the body isn't valid JSON
    expect(body).toHaveProperty("games");
  });
});
