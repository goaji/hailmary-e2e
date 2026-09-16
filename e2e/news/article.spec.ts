import { getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";
import { test, expect } from "../../fixtures/pageTest";
import { ACCENT_EXTREME_TEAMS, ANCHOR_ARTICLE_SLUG, assertNoAccessibilityViolations } from "../../helpers";

const TITLE_RO = "Chiefs câștigă al treilea titlu consecutiv într-un final de poveste";

test.describe("article page", () => {
  test("renders the title as h1 and a byline", async ({ page }) => {
    await page.goto(`/ro/stiri/${ANCHOR_ARTICLE_SLUG}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE_RO);
    const article = page.getByRole("article").filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(article.getByText(/Admin/)).toBeVisible();
  });

  test("heading tree is exactly one h1, then h2s and h3s", async ({ page }) => {
    await page.goto(`/ro/stiri/${ANCHOR_ARTICLE_SLUG}`);

    // One h1 per page, but the tree is read inside the article: the rail's
    // own h2 sits before the article in the DOM and isn't part of it.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const article = page.getByRole("article").filter({ has: page.getByRole("heading", { level: 1 }) });
    const levels = await article
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((headings) => headings.map((h) => Number(h.tagName[1])));

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
    await page.goto(`/en/stiri/${ANCHOR_ARTICLE_SLUG}`);

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
    await page.goto(`/ro/stiri/${ANCHOR_ARTICLE_SLUG}`);

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
  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    test(`axe has no violations with ${team.name} selected`, async ({ page, siteHeader }) => {
      await page.goto(`/ro/stiri/${ANCHOR_ARTICLE_SLUG}`);
      await siteHeader.selectTeam(team.name);

      await assertNoAccessibilityViolations(page);
    });
  }
});
