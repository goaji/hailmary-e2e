import { type Page } from "@playwright/test";
import { getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import type { Game } from "@hailmary/shared";
import { test, expect } from "../../fixtures/seededScheduleTest";
import { clearScores } from "../../api/scoresApi";
import { ACCENT_EXTREME_TEAMS, assertNoAccessibilityViolations, selectTeam, viewportsWithHeights } from "../../helpers";

// Seeding goes through api/scoresApi.ts; the seedSchedule fixture clears
// the store afterwards. Every test here shares that one store, so the whole
// file runs serially. Other spec files never touch it.
test.describe.configure({ mode: "serial" });

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

test.describe("degraded path — empty store", () => {
  test.beforeEach(({ request }) => clearScores(request));

  // getSchedule() returns no games at all for an empty store, so there is no
  // table to degrade — the notice needs synced games plus a failed poll.
  test("renders the empty message and no table", async ({ page }) => {
    await page.goto("/ro/program");

    await expect(page.getByText(ro.schedulePage.empty)).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });
});

test.describe("week selector and table structure", () => {
  test.beforeEach(({ seedSchedule }) => seedSchedule([LIVE_GAME, FINAL_GAME_A, WEEK3_GAME]));

  test("kickoff times render in Bucharest local time under a foreign browser timezone", async ({
    browser,
  }) => {
    // A US-based browser timezone is the case most likely to reveal a bug
    // that a Bucharest-timezone dev machine would never catch.
    const context = await browser.newContext({ timezoneId: "America/New_York" });
    const page = await context.newPage();
    await page.goto("/ro/program");

    // FINAL_GAME_A's kickoff, per formatKickoff.test.ts's known conversion
    // (2026-09-13T17:00:00Z -> 20:00 Bucharest, UTC+3 in September).
    await expect(page.getByRole("table").getByText("dum. 20:00")).toBeVisible();

    await context.close();
  });

  test("week links change the URL and the rendered week; back button works", async ({ page }) => {
    await page.goto("/ro/program");

    const week2Link = ro.schedulePage.week.replace("{week}", "2");
    const week3Link = ro.schedulePage.week.replace("{week}", "3");

    const table = page.getByRole("table");

    await expect(page.getByRole("link", { name: week2Link })).toHaveAttribute("aria-current", "page");
    await expect(table.getByRole("row", { name: /Chiefs/ })).toBeVisible();

    await page.getByRole("link", { name: week3Link }).click();
    await expect(page).toHaveURL(/\?etapa=3$/);
    await expect(page.getByRole("link", { name: week3Link })).toHaveAttribute("aria-current", "page");
    await expect(table.getByRole("row", { name: /Seahawks/ })).toBeVisible();
    // toHaveCount(0), not not.toBeVisible(): the row must be gone from the
    // week 3 table, not merely hidden, and a missing table can't pass this.
    await expect(table).toBeVisible();
    await expect(table.getByRole("row", { name: /Chiefs/ })).toHaveCount(0);

    await page.goBack();
    await expect(page).not.toHaveURL(/\?etapa=3$/);
    await expect(table.getByRole("row", { name: /Chiefs/ })).toBeVisible();
  });

  test("page has a single h1 naming the current week", async ({ page }) => {
    await page.goto("/ro/program");

    await expect(
      page.getByRole("heading", { level: 1, name: ro.schedulePage.titleWithWeek.replace("{week}", "2") }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
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
    await expect(page.getByRole("table").getByText(ro.liveScoreBadge.live)).toBeVisible();
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

// useLiveScores polls /api/scores while the latest payload has a live game.
// page.clock, not real time, so a changed interval actually fails these.
test.describe("live score polling", () => {
  const POLL_INTERVAL_MS = 15_000;

  function trackScoreRequests(page: Page) {
    const requests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/scores")) {
        requests.push(req.url());
      }
    });
    return requests;
  }

  // SWR schedules the next timer only once the previous response resolves,
  // which races a fixed advance — so step the clock until the request lands.
  async function advanceUntilRequestCount(page: Page, requests: string[], expected: number) {
    await expect
      .poll(
        async () => {
          await page.clock.runFor(2_000);
          return requests.length;
        },
        { timeout: 30_000 }, // 2s steps outlast the default 5s budget
      )
      .toBe(expected);
  }

  test("a live game keeps polling every 15s", async ({ page, seedSchedule }) => {
    await seedSchedule([LIVE_GAME, FINAL_GAME_A]);

    const scoreRequests = trackScoreRequests(page);
    await page.clock.install();
    // networkidle: the first poll timer is scheduled before the clock moves.
    await page.goto("/ro/program", { waitUntil: "networkidle" });
    expect(scoreRequests).toHaveLength(1);

    await page.clock.runFor(POLL_INTERVAL_MS - 1_000);
    expect(scoreRequests).toHaveLength(1);

    await advanceUntilRequestCount(page, scoreRequests, 2);
    await advanceUntilRequestCount(page, scoreRequests, 3); // keeps going

  });

  // The fetch on mount is deliberate: /program is ISR-cached, so a copy
  // rendered before kickoff only learns a game went live by asking once.
  test("a page with no live games stops after the fetch on mount", async ({ page, seedSchedule }) => {
    await seedSchedule([FINAL_GAME_A, FINAL_GAME_B]);

    const scoreRequests = trackScoreRequests(page);
    await page.clock.install();
    await page.goto("/ro/program", { waitUntil: "networkidle" });
    expect(scoreRequests).toHaveLength(1);

    await page.clock.runFor(4 * POLL_INTERVAL_MS);
    expect(scoreRequests).toHaveLength(1);
  });
});

test.describe("no-JS", () => {
  test.use({ javaScriptEnabled: false });
  // One game only: it's then the default week's single row, whatever
  // getCurrentWeek() picks.
  test.beforeEach(({ seedSchedule }) => seedSchedule([FINAL_GAME_A]));

  test("schedule still renders correctly without JavaScript", async ({ page }) => {
    await page.goto("/ro/program");

    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("row", { name: /Eagles/ })).toBeVisible();
  });
});

test.describe("schedule accessibility across team accents", () => {
  test.beforeEach(({ seedSchedule }) => seedSchedule([LIVE_GAME, FINAL_GAME_A, WEEK3_GAME]));

  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    test(`axe clean on /program with ${team.name} selected`, async ({ page }) => {
      await page.goto("/ro");
      await selectTeam(page, team.name);
      await page.goto("/ro/program");

      await assertNoAccessibilityViolations(page);
    });
  }
});

test.describe("schedule visual regression", () => {
  const VIEWPORTS = viewportsWithHeights([1000, 900, 900]);

  test.describe("with a live game", () => {
    test.beforeEach(({ seedSchedule }) => seedSchedule([LIVE_GAME, FINAL_GAME_A]));

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
    test.beforeEach(({ seedSchedule }) => seedSchedule([FINAL_GAME_A, FINAL_GAME_B]));

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

  test.describe("authenticated", () => {
    // Each call runs a real sync — don't leave its games in the store.
    test.afterEach(async ({ request }) => {
      if (secret) {
        await clearScores(request);
      }
    });

    test("correct secret is accepted with 200", async ({ request }) => {
      test.skip(!secret, "CRON_SECRET is not set in this environment");
      const response = await request.get("/api/cron/sync-scores", {
        headers: { "X-Cron-Secret": secret! },
      });
      expect(response.status()).toBe(200);
    });

    test("two concurrent calls leave the store as valid JSON", async ({ request }) => {
      test.skip(!secret, "CRON_SECRET is not set in this environment");

      await Promise.all([
        request.get("/api/cron/sync-scores", { headers: { "X-Cron-Secret": secret! } }),
        request.get("/api/cron/sync-scores", { headers: { "X-Cron-Secret": secret! } }),
      ]);

      // No shared filesystem with the deployed target, so the store is read
      // through /api/scores — weaker (readScores() swallows a corrupt file
      // into an empty store), but still catches malformed HTTP output.
      const response = await request.get("/api/scores");
      expect(response.status()).toBe(200);
      const body = await response.json(); // throws if the body isn't valid JSON
      expect(body).toHaveProperty("games");
    });
  });
});
