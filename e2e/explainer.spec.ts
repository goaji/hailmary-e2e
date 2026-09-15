import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PICKER_TEAMS, getTeam } from "@hailmary/shared";

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
  }) => {
    await page.goto(ARTICLE_URL);
    const trigger = page.getByRole("button", { name: "quarterback-ul" });

    await test.step("click opens the dialog", async () => {
      await trigger.click();
      await expect(page.getByRole("dialog", { name: "Quarterback" })).toBeVisible();
    });

    await test.step("focus moved into the panel", async () => {
      await expect(page.getByRole("dialog").getByRole("heading", { name: "Quarterback" })).toBeFocused();
    });

    await test.step("Escape closes and returns focus to the trigger", async () => {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  });

  test("a relatedTerms chip swaps content in place without closing the dialog", async ({ page }) => {
    await page.goto(ARTICLE_URL);
    await page.getByRole("button", { name: "quarterback-ul" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCount(1);

    await page.getByRole("button", { name: "Play action" }).click();

    await expect(dialog).toHaveCount(1); // never removed and re-added, just swapped in place
    await expect(page.getByRole("heading", { name: "Play action" })).toBeVisible();
  });

  test("panel never renders a seeAlso link, even for a term whose glossary entry has one", async ({
    page,
  }) => {
    await page.goto(ARTICLE_URL);
    await page.getByRole("button", { name: "quarterback-ul" }).click();
    await page.getByRole("button", { name: "Play action" }).click(); // play-action has a seeAlso, but only /glosar renders it

    await expect(page.getByRole("dialog").getByRole("link")).toHaveCount(0);
  });

  test("desktop: the article column actually shifts when the panel opens", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ARTICLE_URL);
    const main = page.getByRole("main");
    const before = await main.boundingBox();

    await page.getByRole("button", { name: "quarterback-ul" }).click();
    await expect
      .poll(async () => (await main.boundingBox())?.width)
      .toBeLessThan(before!.width);
  });
});

test.describe("deep link", () => {
  test("?termen=<slug> opens the panel on load", async ({ page }) => {
    await page.goto(`${ARTICLE_URL}?termen=play-action`);
    await expect(page.getByRole("dialog", { name: "Play action" })).toBeVisible();
  });

  test("an unknown slug opens nothing and throws no console error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${ARTICLE_URL}?termen=not-a-real-term`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("hover tooltip", () => {
  test("appears on hover after a delay, never on keyboard focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ARTICLE_URL);
    const trigger = page.getByRole("button", { name: "quarterback-ul" });
    await trigger.waitFor();
    // The tooltip is aria-hidden on purpose (it duplicates the trigger's name
    // plus the panel's content), so it has no role — its visible text is the handle.
    const tooltip = trigger.getByText(QUARTERBACK_SHORT);

    await test.step("not visible immediately on hover", async () => {
      await trigger.hover();
      await page.waitForTimeout(150); // well under the ~300ms delay
      await expect(tooltip).toBeHidden();
    });

    await test.step("visible once the delay has passed", async () => {
      await expect(tooltip).toBeVisible({ timeout: 600 });
    });

    await test.step("never appears on keyboard focus", async () => {
      await page.mouse.move(0, 0); // clear hover
      await trigger.focus();
      await page.waitForTimeout(400);
      await expect(tooltip).toBeHidden();
    });
  });
});

test.describe("explainer panel accessibility across team accents", () => {
  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    test(`axe has no violations with the panel open, ${team.name} selected`, async ({ page }) => {
      await page.goto(ARTICLE_URL);
      await page.getByRole("radio", { name: team.name }).click();
      await page.getByRole("button", { name: "quarterback-ul" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("explainer panel visual regression", () => {
  const viewports = [
    { label: "375", width: 375, height: 800 },
    { label: "768", width: 768, height: 900 },
    { label: "1440", width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`panel open matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(ARTICLE_URL);

      // nextjs-portal is the dev-only build/route indicator — see the
      // equivalent note in homepage.spec.ts.
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

      await page.getByRole("button", { name: "quarterback-ul" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await expect(page).toHaveScreenshot(`explainer-panel-${viewport.label}.png`);
    });
  }
});

test.describe("reduced motion", () => {
  test("panel still opens and closes correctly, with no slide transform", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ARTICLE_URL);
    const trigger = page.getByRole("button", { name: "quarterback-ul" });

    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const transform = await dialog.evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe("matrix(1, 0, 0, 1, 0, 0)"); // identity — already at rest, no partial slide

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
