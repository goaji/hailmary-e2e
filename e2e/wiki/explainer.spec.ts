import { getTeam } from "@hailmary/shared";
import { ACCENT_EXTREME_TEAMS, assertNoAccessibilityViolations, viewportsWithHeights } from "../../helpers";
import { test, expect } from "../../fixtures/pageTest";

const SLUG = "chiefs-al-treilea-titlu-consecutiv";
const ARTICLE_URL = `/ro/stiri/${SLUG}`;
const QUARTERBACK_SHORT =
  "Jucătorul care conduce ofensiva și primește mingea la începutul aproape fiecărei faze de joc.";
const GLOSSARY_TERM_URL = "/ro/glosar/q#quarterback";

test.describe("no-JS TermLink", () => {
  test.use({ javaScriptEnabled: false });

  test("term is a working link to its entry on the glossary letter page", async ({ page }) => {
    await page.goto(ARTICLE_URL);

    // exact: true — the article's own Related Articles card title also
    // contains "quarterback-ul" as a substring.
    const link = page.getByRole("link", { name: "quarterback-ul", exact: true });
    await expect(link).toHaveAttribute("href", GLOSSARY_TERM_URL);
    await link.click();

    await expect(page).toHaveURL((url) => url.pathname + url.hash === GLOSSARY_TERM_URL);
    // #quarterback is GlossaryTerm's own stable anchor id — the URL contract, not a styling hook.
    const term = page.locator("#quarterback");
    await expect(term.getByRole("heading", { name: "Quarterback", exact: true })).toBeVisible();
    await expect(page.locator("#quarterback:target")).toHaveCount(1);
  });
});

test.describe("explainer panel", () => {
  test("click opens the panel with the right heading, focus moves in, Escape returns focus to the trigger", async ({
    page,
    explainerPanel,
  }) => {
    await page.goto(ARTICLE_URL);

    await test.step("click opens the dialog", async () => {
      await explainerPanel.open("quarterback-ul");
      await expect(explainerPanel.dialogFor("Quarterback")).toBeVisible();
    });

    await test.step("focus moved into the panel", async () => {
      await expect(explainerPanel.heading("Quarterback")).toBeFocused();
    });

    await test.step("Escape closes and returns focus to the trigger", async () => {
      await page.keyboard.press("Escape");
      await expect(explainerPanel.dialog).toHaveCount(0);
      await expect(explainerPanel.trigger("quarterback-ul")).toBeFocused();
    });
  });

  test("a relatedTerms chip swaps content in place without closing the dialog", async ({ page, explainerPanel }) => {
    await page.goto(ARTICLE_URL);
    await explainerPanel.open("quarterback-ul");

    const dialog = explainerPanel.dialog;
    await expect(dialog).toHaveCount(1);

    await explainerPanel.openRelated("Play action");

    await expect(dialog).toHaveCount(1); // never removed and re-added, just swapped in place
    await expect(page.getByRole("heading", { name: "Play action" })).toBeVisible();
  });

  test("panel never renders a seeAlso link, even for a term whose glossary entry has one", async ({
    page,
    explainerPanel,
  }) => {
    await page.goto(ARTICLE_URL);
    await explainerPanel.open("quarterback-ul");
    await explainerPanel.openRelated("Play action"); // play-action has a seeAlso, but only /glosar renders it

    await expect(explainerPanel.dialog.getByRole("link")).toHaveCount(0);
  });

  test("desktop: the article column actually shifts when the panel opens", async ({ page, explainerPanel }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ARTICLE_URL);
    const main = page.getByRole("main");
    const before = await main.boundingBox();

    await explainerPanel.open("quarterback-ul");
    await expect
      .poll(async () => (await main.boundingBox())?.width)
      .toBeLessThan(before!.width);
  });
});

test.describe("deep link", () => {
  test("?termen=<slug> opens the panel on load", async ({ page, explainerPanel }) => {
    await page.goto(`${ARTICLE_URL}?termen=play-action`);
    await expect(explainerPanel.dialogFor("Play action")).toBeVisible();
  });

  test("an unknown slug opens nothing and throws no console error", async ({ page, explainerPanel }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${ARTICLE_URL}?termen=not-a-real-term`);
    await page.waitForLoadState("networkidle");

    await expect(explainerPanel.dialog).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("hover tooltip", () => {
  test("appears on hover after a delay, never on keyboard focus", async ({ page, explainerPanel }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ARTICLE_URL);
    const trigger = explainerPanel.trigger("quarterback-ul");
    await trigger.waitFor();
    const tooltip = explainerPanel.tooltip("quarterback-ul", QUARTERBACK_SHORT);

    await test.step("hidden at rest, and hides with no delay", async () => {
      await expect(tooltip).toBeHidden();
      await expect(tooltip).toHaveCSS("transition-delay", "0s, 0s");
    });

    await test.step("hover delays the reveal, then shows it", async () => {
      await trigger.hover();
      // The ~300ms delay is CSS, not a JS timer — read it, don't wait it out.
      await expect(tooltip).toHaveCSS("transition-delay", "0.3s, 0.3s");
      await expect(tooltip).toBeVisible();
    });

    await test.step("hides immediately on mouse-out", async () => {
      await page.mouse.move(0, 0); // clear hover
      await expect(tooltip).toBeHidden();
      await expect(tooltip).toHaveCSS("transition-delay", "0s, 0s");
    });

    await test.step("never appears on keyboard focus", async () => {
      await trigger.focus();
      await expect(tooltip).toBeHidden();
      // Resting delay: no :focus rule reveals it, delayed or not.
      await expect(tooltip).toHaveCSS("transition-delay", "0s, 0s");
    });
  });
});

test.describe("explainer panel accessibility across team accents", () => {
  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    test(`axe has no violations with the panel open, ${team.name} selected`, async ({ page, siteHeader, explainerPanel }) => {
      await page.goto(ARTICLE_URL);
      await siteHeader.selectTeam(team.name);
      await explainerPanel.open("quarterback-ul");
      await expect(explainerPanel.dialog).toBeVisible();

      await assertNoAccessibilityViolations(page);
    });
  }
});

test.describe("explainer panel visual regression", () => {
  const viewports = viewportsWithHeights([800, 900, 900]);

  for (const viewport of viewports) {
    test(`panel open matches its ${viewport.label}px baseline screenshot`, async ({ page, explainerPanel }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(ARTICLE_URL);

      // nextjs-portal is the dev-only build/route indicator — see the
      // equivalent note in article.spec.ts.
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

      await explainerPanel.open("quarterback-ul");
      await expect(explainerPanel.dialog).toBeVisible();

      await expect(page).toHaveScreenshot(`explainer-panel-${viewport.label}.png`);
    });
  }
});

test.describe("reduced motion", () => {
  test("panel still opens and closes correctly, with no slide transform", async ({ page, explainerPanel }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ARTICLE_URL);

    await explainerPanel.open("quarterback-ul");
    const dialog = explainerPanel.dialog;
    await expect(dialog).toBeVisible();

    const transform = await dialog.evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe("matrix(1, 0, 0, 1, 0, 0)"); // identity — already at rest, no partial slide

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
