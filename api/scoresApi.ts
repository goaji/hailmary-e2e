import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import type { Game } from "@hailmary/shared";

// The deployed target shares no filesystem with this suite, so the score
// store is written over HTTP — see E2E-SPLIT-PLAN.md.
const SEED_PATH = "/api/test/seed-scores";
const DRAFT_MODE_PATH = "/api/test/draft-mode";
const DRAFT_MODE_COOKIE = "__prerender_bypass"; // Next.js's own name for it

export type DraftModeCookie = Parameters<BrowserContext["addCookies"]>[0][number];

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

// Pages opened with this cookie skip the ISR cache and render the store as it is now.
export async function getDraftModeCookie(request: APIRequestContext, baseURL: string): Promise<DraftModeCookie> {
  const response = await request.get(DRAFT_MODE_PATH, { headers: authHeaders() });
  expect(response.status(), "draft-mode GET").toBe(200);
  const { cookies } = await request.storageState();
  const cookie = cookies.find((c) => c.name === DRAFT_MODE_COOKIE);
  if (!cookie) {
    throw new Error(`${DRAFT_MODE_PATH} did not set ${DRAFT_MODE_COOKIE}`);
  }
  return { name: cookie.name, value: cookie.value, url: baseURL };
}

// Makes the browser's score polling fail; the server-rendered schedule is untouched.
export async function failScoresRequests(page: Page): Promise<void> {
  await page.route("**/api/scores", (route) => route.fulfill({ status: 500 }));
}
