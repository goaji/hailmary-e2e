import { expect, type APIRequestContext } from "@playwright/test";

// No shared filesystem to count content/articles/<locale> directly, so the
// app is asked instead.
export async function articleCount(request: APIRequestContext, locale: string) {
  const response = await request.get(`/api/test/article-count?locale=${locale}`, {
    headers: { "x-e2e-secret": process.env.E2E_TEST_SECRET ?? "" },
  });
  expect(response.status(), "article-count GET").toBe(200);
  const { count } = (await response.json()) as { count: number };
  return count;
}
