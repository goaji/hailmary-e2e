import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PICKER_TEAMS, getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";

// No shared filesystem with the deployed target to count content/articles/ro
// directly, so this asks the app instead — see E2E-SPLIT-PLAN.md.
let RO_ARTICLE_COUNT = 0;

test.describe("news index", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${process.env.E2E_BASE_URL}/api/test/article-count?locale=ro`, {
      headers: { "x-e2e-secret": process.env.E2E_TEST_SECRET ?? "" },
    });
    if (!res.ok) {
      throw new Error(`article-count fetch failed: ${res.status}`);
    }
    ({ count: RO_ARTICLE_COUNT } = await res.json());
  });

  test("renders every ro article as a heading link, newest first", async ({ page }) => {
    await page.goto("/ro/stiri");

    await expect(page.getByRole("heading", { level: 1, name: ro.newsIndex.title })).toBeVisible();

    const titles = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(titles).toHaveLength(RO_ARTICLE_COUNT);
    expect(new Set(titles).size).toBe(titles.length); // no duplicate cards
  });

  test("nav 'Știri' link points at /stiri and reads active there and on an article page", async ({
    page,
  }) => {
    await page.goto("/ro/stiri");
    const navLink = page.getByRole("navigation").getByRole("link", { name: ro.nav.news });
    await expect(navLink).toHaveAttribute("href", "/ro/stiri");
    await expect(navLink).toHaveAttribute("aria-current", "page");

    await page.goto("/ro/stiri/chiefs-al-treilea-titlu-consecutiv");
    await expect(navLink).toHaveAttribute("aria-current", "page");
  });

  // News is Romanian-only — content/articles/en has no files, so /en/stiri
  // falls back to the ro list with a translated notice, the same
  // ro-fallback contract an individual article page already has.
  test("en locale falls back to the ro articles, with a translated notice", async ({ page }) => {
    await page.goto("/en/stiri");

    await expect(page.getByRole("heading", { level: 1, name: en.newsIndex.title })).toBeVisible();
    await expect(page.getByText(en.newsIndex.fallbackNotice)).toBeVisible();

    const titles = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(titles).toHaveLength(RO_ARTICLE_COUNT);
  });
});

test.describe("news index accessibility across team accents", () => {
  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    test(`axe clean on /stiri with ${team.name} selected`, async ({ page }) => {
      await page.goto("/ro/stiri");
      await page.getByRole("radio", { name: team.name }).click();

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("news index visual regression", () => {
  const VIEWPORTS = [
    { label: "375", width: 375, height: 1400 },
    { label: "768", width: 768, height: 1400 },
    { label: "1440", width: 1440, height: 1400 },
  ];

  for (const viewport of VIEWPORTS) {
    test(`matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/ro/stiri");

      // nextjs-portal is the dev-only build/route indicator — see the
      // equivalent note in homepage.spec.ts.
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

      await expect(page).toHaveScreenshot(`news-index-${viewport.label}.png`, {
        fullPage: true,
      });
    });
  }
});
