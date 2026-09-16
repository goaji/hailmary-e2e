import { test as base } from "./pageTest";
import type { Game } from "@hailmary/shared";
import { clearScores, seedScores } from "../api/scoresApi";

type ScheduleFixtures = {
  /** Seeds the score store; the store is cleared again after the test. */
  seedSchedule: (games: Game[]) => Promise<void>;
};

export const test = base.extend<ScheduleFixtures>({
  seedSchedule: async ({ request }, use) => {
    await use((games) => seedScores(request, games));
    await clearScores(request);
  },
});

export { expect } from "@playwright/test";
