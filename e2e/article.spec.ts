import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PICKER_TEAMS, getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";

const SLUG = "chiefs-al-treilea-titlu-consecutiv";
const TITLE_RO = "Chiefs câștigă al treilea titlu consecutiv într-un final de poveste";

test.describe("article page", () => {
  test("renders the title as h1, a byline, and a hero image with non-empty alt", async ({
    page,
  }) => {
    await page.goto(`/ro/stiri/${SLUG}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE_RO);
    await expect(page.getByText(/Admin ·/)).toBeVisible();

    const heroImage = page.locator("header img").first();
    const alt = await heroImage.getAttribute("alt");
    expect(alt).toBeTruthy();
  });

  test("an article with no `image` in frontmatter still renders a default cover image", async ({
    page,
  }) => {
    await page.goto("/ro/stiri/programul-saptamanii-13");

    const heroImage = page.locator("header img").first();
    // next/image rewrites src through its optimizer, so the original path
    // survives only as the (percent-encoded) `url` query param.
    await expect(heroImage).toHaveAttribute("src", /url=%2Fplaceholder%2Fdefault-/);
    await expect(heroImage).toHaveAttribute("alt", ro.article.defaultImageAlt);
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
      await page.getByRole("radio", { name: team.name }).click();

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("article page visual regression", () => {
  const viewports = [
    { label: "375", width: 375, height: 1200 },
    { label: "768", width: 768, height: 1400 },
    { label: "1440", width: 1440, height: 1400 },
  ];

  for (const viewport of viewports) {
    test(`full page matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/ro/stiri/${SLUG}`);

      // nextjs-portal is the dev-only build/route indicator — see the
      // equivalent note in homepage.spec.ts.
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
