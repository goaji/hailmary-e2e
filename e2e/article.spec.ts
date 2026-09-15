import { test, expect } from "@playwright/test";
import { PICKER_TEAMS, getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";
import { assertNoAccessibilityViolations, selectTeam, viewportsWithHeights } from "./helpers";

const SLUG = "chiefs-al-treilea-titlu-consecutiv";
const TITLE_RO = "Chiefs câștigă al treilea titlu consecutiv într-un final de poveste";

test.describe("article page", () => {
  test("renders the title as h1 and a byline", async ({ page }) => {
    await page.goto(`/ro/stiri/${SLUG}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE_RO);
    const article = page.getByRole("article").filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(article.getByText(/Admin/)).toBeVisible();
  });

  test("heading tree is exactly one h1, then h2s and h3s", async ({ page }) => {
    await page.goto(`/ro/stiri/${SLUG}`);

    const levels = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((headings) => headings.map((h) => Number(h.tagName[1])));

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    expect(levels.every((level) => level <= 3)).toBe(true);
  });

  test("nonexistent slug renders the custom not-found page, not a stack trace", async ({
    page,
  }) => {
    const response = await page.goto("/ro/stiri/does-not-exist-xyz");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: ro.articleNotFound.title }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: ro.articleNotFound.backHome })).toBeVisible();
  });

  test("/en fallback for a ro-only article shows the notice as role=status", async ({
    page,
  }) => {
    await page.goto(`/en/stiri/${SLUG}`);

    // This app renders the fallback notice rather than 404ing an /en
    // request for ro-only content — the data layer already decided ro
    // serves it (getArticleBySlug), this just makes that visible.
    const notice = page.getByRole("status");
    await expect(notice).toHaveText(en.article.fallbackNotice);
    // Still the real content underneath, in Romanian, not a blank page.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE_RO);
  });

  test("internal MDX link keeps the locale prefix; external link has rel and target", async ({
    page,
  }) => {
    await page.goto(`/ro/stiri/${SLUG}`);

    const internalLink = page.getByRole("link", {
      name: "modificarea recentă a regulii onside kick",
    });
    await expect(internalLink).toHaveAttribute(
      "href",
      "/ro/stiri/nfl-schimba-regula-onside-kick",
    );
    await internalLink.click();
    await expect(page).toHaveURL(/\/ro\/stiri\/nfl-schimba-regula-onside-kick$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "NFL schimbă regula onside kick",
    );

    await page.goBack();
    const externalLink = page.getByRole("link", { name: "pe site-ul oficial NFL" });
    await expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(externalLink).toHaveAttribute("target", "_blank");
  });
});

test.describe("article page accessibility across team accents", () => {
  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    test(`axe has no violations with ${team.name} selected`, async ({ page }) => {
      await page.goto(`/ro/stiri/${SLUG}`);
      await selectTeam(page, team.name);

      await assertNoAccessibilityViolations(page);
    });
  }
});

test.describe("article page visual regression", () => {
  const viewports = viewportsWithHeights([1200, 1400, 1400]);

  for (const viewport of viewports) {
    test(`full page matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/ro/stiri/${SLUG}`);

      // nextjs-portal is the dev-only build/route indicator injected by
      // `next dev` (this suite runs against it) — never present in a
      // production build. It's position: fixed, which `mask` doesn't
      // track reliably across a fullPage screenshot's scroll-stitching,
      // so it's hidden outright rather than masked.
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

      await expect(page).toHaveScreenshot(`article-${viewport.label}.png`, {
        fullPage: true,
        // The byline's relative/absolute date phrasing shifts with real
        // time independent of any code change here — masked, not asserted.
        mask: [page.locator('[class*="byline"]')],
      });
    });
  }
});
