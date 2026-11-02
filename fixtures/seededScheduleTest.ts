import { test as base } from "./pageTest";
import type { Game } from "@hailmary/shared";
import { clearScores, getDraftModeCookie, seedScores, type DraftModeCookie } from "../api/scoresApi";

type ScheduleFixtures = {
  /** Seeds the score store; the store is cleared again after the test. */
  seedSchedule: (games: Game[]) => Promise<void>;
  /** Makes pages skip the ISR cache, for contexts a test creates itself. */
  draftModeCookie: DraftModeCookie;
  /** On by default; turn off with test.use() to test the cached page visitors get. */
  bypassPageCache: boolean;
};

export const test = base.extend<ScheduleFixtures>({
  seedSchedule: async ({ request }, use) => {
    await use((games) => seedScores(request, games));
    await clearScores(request);
  },
  draftModeCookie: async ({ request, baseURL }, use) => {
    await use(await getDraftModeCookie(request, baseURL ?? ""));
  },
  bypassPageCache: [true, { option: true }],
  context: async ({ context, bypassPageCache, request, baseURL }, use) => {
    if (bypassPageCache) {
      await context.addCookies([await getDraftModeCookie(request, baseURL ?? "")]);
    }
    await use(context);
  },
});

export { expect } from "@playwright/test";
