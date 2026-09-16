import { test, expect, type Locator, type Page } from "@playwright/test";
import { getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import { ACCENT_EXTREME_TEAMS, assertNoAccessibilityViolations, selectTeam, viewportsWithHeights } from "../../helpers";

const WIKI_HUB = "/ro/wiki";

// A multi-section RuleSection page, so it also gets the in-rail page TOC.
const RULES_PAGE = "/ro/wiki/the-game/sistemul-de-downuri";

// Frontmatter `sections` of content/wiki/ro/the-game/sistemul-de-downuri.mdx, in order.
const RULES_SECTIONS = [
  { id: "ce-este-un-down", title: "Ce este un down" },
  { id: "cei-10-yarzi", title: "Cei 10 yarzi" },
  { id: "down-and-distance", title: 'Cum se citește: "3rd-and-4"' },
  { id: "decizia-de-fourth-down", title: 'Decizia de "fourth down"' },
  { id: "turnover-on-downs", title: "Turnover on downs" },
];

// Not the first section, so arriving at it really scrolls, and not the last,
// so the page can scroll it to the top of the viewport.
const TOC_TARGET = RULES_SECTIONS[1];

// Everything a highlight could plausibly change, compared as a whole so the
// test doesn't dictate which property the style uses.
async function highlightStyle(locator: Locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      borderLeftColor: cs.borderLeftColor,
      outline: cs.outline,
      boxShadow: cs.boxShadow,
    };
  });
}

// Needs the desktop rail: below lg it's a collapsed <details>, so its links are hidden.
async function glossaryLetterHrefs(page: Page): Promise<string[]> {
  await page.goto("/ro/glosar"); // redirects to the first letter
  // The current letter also lists its terms as links; only letter links have single-letter names.
  return page
    .getByRole("navigation", { name: ro.glossary.railLabel })
    .getByRole("link", { name: /^[A-Z]$/ })
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
}

test.describe("wiki pages", () => {
  for (const path of [WIKI_HUB, RULES_PAGE]) {
    test(`${path} renders`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    // Wiki content is Romanian-only, and getWikiPage deliberately has no locale
    // fallback — a missing translation must 404, not silently serve ro.
    const enPath = path.replace(/^\/ro/, "/en");
    test(`${enPath} 404s instead of falling back to ro`, async ({ page }) => {
      const response = await page.goto(enPath);
      expect(response?.status()).toBe(404);
    });
  }

  test("every frontmatter section renders as a region named by its h2, in order", async ({ page }) => {
    await page.goto(RULES_PAGE);

    for (const section of RULES_SECTIONS) {
      const region = page.getByRole("region", { name: section.title, exact: true });
      await expect(region).toBeVisible();
      // The h2's id is both the aria-labelledby target and the TOC/seeAlso anchor.
      await expect(region.getByRole("heading", { level: 2 })).toHaveAttribute("id", section.id);
    }

    const titles = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
    expect(titles).toEqual(RULES_SECTIONS.map((section) => section.title));
  });

  test("heading tree is one h1 then h2s", async ({ page }) => {
    await page.goto(RULES_PAGE);

    const levels = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((headings) => headings.map((h) => Number(h.tagName[1])));

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    expect(levels.slice(1).every((level) => level === 2)).toBe(true);
  });

  test("a TermLink opens the explainer panel", async ({ page }) => {
    await page.goto("/ro/wiki/the-game/anatomia-unei-faze");

    await page.getByRole("button", { name: "Fumble", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Fumble" })).toBeVisible();
  });
});

test.describe("wiki rail table of contents", () => {
  test("desktop TOC link scrolls to the section and sets aria-current", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(RULES_PAGE);

    const nav = page.getByRole("navigation", { name: ro.wikiRail.label });
    const link = nav.getByRole("link", { name: TOC_TARGET.title, exact: true });

    await link.click();
    await expect(page).toHaveURL((url) => url.hash === `#${TOC_TARGET.id}`);
    await expect(
      page.getByRole("region", { name: TOC_TARGET.title, exact: true }).getByRole("heading", { level: 2 }),
    ).toBeInViewport();
    await expect(link).toHaveAttribute("aria-current", "location");
  });

  test("below lg, the rail is a working, keyboard-operable <details>", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(RULES_PAGE);

    // <details> maps to role=group; its <summary> text is what identifies it.
    const details = page.getByRole("group").filter({ has: page.getByText(ro.wikiRail.mobileLabel) });
    const tocLink = details
      .getByRole("navigation", { name: ro.wikiRail.label })
      .getByRole("link", { name: TOC_TARGET.title, exact: true });

    await expect(details).toBeVisible();
    await expect(tocLink).toBeHidden();

    await details.getByText(ro.wikiRail.mobileLabel).focus();
    await page.keyboard.press("Enter");

    await expect(tocLink).toBeVisible();
  });
});

test.describe("highlight on arrival", () => {
  test("arriving at a wiki section anchor highlights that section", async ({ page }) => {
    await page.goto(`${RULES_PAGE}#${TOC_TARGET.id}`);

    const target = page.getByRole("region", { name: TOC_TARGET.title, exact: true });
    const other = page.getByRole("region", { name: RULES_SECTIONS[0].title, exact: true });
    const unhighlighted = await highlightStyle(other);

    // Polled: TargetRefresh marks the target in an effect, after hydration.
    await expect.poll(() => highlightStyle(target)).not.toEqual(unhighlighted);
  });

  test("arriving at a glossary term anchor highlights that term", async ({ page }) => {
    // #quarterback is GlossaryTerm's own stable anchor id — the URL contract, not a styling hook.
    await page.goto("/ro/glosar/q");
    const unhighlighted = await highlightStyle(page.locator("#quarterback"));

    await page.goto("/ro/glosar/q#quarterback");

    await expect.poll(() => highlightStyle(page.locator("#quarterback"))).not.toEqual(unhighlighted);
  });
});

// The build-time validator (validateSeeAlso) already covers well-formedness — this walks the real user-facing path instead.
test.describe("glossary seeAlso links", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // en entries carry no seeAlso: every target is a wiki page, and the wiki is ro-only.
  test("every seeAlso across the /ro glossary letter pages resolves", async ({ page }) => {
    const letterHrefs = await glossaryLetterHrefs(page);
    expect(letterHrefs.length).toBeGreaterThan(0);

    const seeAlsoHrefs: string[] = [];
    for (const letterHref of letterHrefs) {
      await page.goto(letterHref);
      seeAlsoHrefs.push(
        ...(await page
          .getByRole("link", { name: ro.glossary.seeAlso })
          .evaluateAll((links) => links.map((link) => link.getAttribute("href")!))),
      );
    }

    expect(seeAlsoHrefs.length).toBeGreaterThan(0);

    for (const href of seeAlsoHrefs) {
      await test.step(href, async () => {
        const response = await page.goto(href);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const id = href.split("#")[1];
        if (id) {
          // Stable section anchor id — the seeAlso URL contract.
          await expect(page.locator(`#${id}`)).toBeVisible();
        }
      });
    }
  });
});

test.describe("wiki pages accessibility across team accents", () => {
  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    for (const path of [WIKI_HUB, RULES_PAGE]) {
      test(`${path} axe clean with ${team.name} selected`, async ({ page }) => {
        await page.goto(path);
        await selectTeam(page, team.name);

        await assertNoAccessibilityViolations(page);
      });
    }
  }
});

test.describe("glossary accessibility across team accents", () => {
  for (const slug of ACCENT_EXTREME_TEAMS) {
    const team = getTeam(slug);

    test(`/glosar axe clean with ${team.name} selected`, async ({ page }) => {
      await page.goto("/ro/glosar"); // redirects to the first letter page
      await selectTeam(page, team.name);

      await assertNoAccessibilityViolations(page);
    });
  }
});

test.describe("wiki pages visual regression", () => {
  const viewports = viewportsWithHeights([1200, 1400, 1400]);
  const pages = [
    { name: "wiki-hub", path: WIKI_HUB },
    { name: "wiki-page", path: RULES_PAGE },
  ];

  for (const viewport of viewports) {
    for (const { name, path } of pages) {
      test(`${path} matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(path);

        // nextjs-portal is the dev-only build/route indicator — see article.spec.ts.
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

        await expect(page).toHaveScreenshot(`${name}-${viewport.label}.png`, {
          fullPage: true,
        });
      });
    }
  }
});
