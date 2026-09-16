import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { Game } from "@hailmary/shared";

// The deployed target shares no filesystem with this suite, so the score
// store is written over HTTP — see E2E-SPLIT-PLAN.md.
const SEED_PATH = "/api/test/seed-scores";

function authHeaders() {
  return { "x-e2e-secret": process.env.E2E_TEST_SECRET ?? "" };
}

export async function seedScores(request: APIRequestContext, games: Game[]) {
  const response = await request.post(SEED_PATH, { headers: authHeaders(), data: { games } });
  expect(response.status(), "seed-scores POST").toBe(200);
}

export async function clearScores(request: APIRequestContext) {
  const response = await request.delete(SEED_PATH, { headers: authHeaders() });
  expect(response.status(), "seed-scores DELETE").toBe(200);
}

// Makes the browser's score polling fail; the server-rendered schedule is untouched.
export async function failScoresRequests(page: Page): Promise<void> {
  await page.route("**/api/scores", (route) => route.fulfill({ status: 500 }));
}
