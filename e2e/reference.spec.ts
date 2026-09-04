import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PICKER_TEAMS, getTeam } from "@hailmary/shared";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";

// Excludes ReferenceLinks' own h2 ("Citește și" / "Read also") — this counts content sections, not every h2 on the page.
async function sectionIds(page: Page): Promise<string[]> {
  return page
    .locator("h2[id]")
    .evaluateAll((headings) => headings.map((h) => h.id).filter((id) => id !== "reference-links-heading"));
}

test.describe("reference pages render in both locales", () => {
  for (const locale of ["ro", "en"] as const) {
    for (const path of ["/regulament", "/istorie"]) {
      test(`${path} renders at /${locale}`, async ({ page }) => {
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      });
    }
  }

  test("/regulament section ids and count match between locales", async ({ page }) => {
    await page.goto("/ro/regulament");
    const roIds = await sectionIds(page);

    await page.goto("/en/regulament");
    const enIds = await sectionIds(page);

    expect(roIds).toHaveLength(10);
    expect(roIds).toEqual(enIds);
  });

  test("/istorie era ids and count match between locales", async ({ page }) => {
    await page.goto("/ro/istorie");
    const roIds = await sectionIds(page);

    await page.goto("/en/istorie");
    const enIds = await sectionIds(page);

    expect(roIds).toHaveLength(4);
    expect(roIds).toEqual(enIds);
  });
});

// The build-time validator (utils/reference.test.ts) already covers well-formedness — this walks the real user-facing path instead.
test.describe("glossary seeAlso links", () => {
  for (const locale of ["ro", "en"] as const) {
    test(`every seeAlso on /${locale}/glosar resolves and highlights its section`, async ({
      page,
    }) => {
      const messages = locale === "ro" ? ro : en;
      await page.goto(`/${locale}/glosar`);

      const hrefs = await page
        .locator("a")
        .filter({ hasText: messages.glossary.seeAlso })
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));

      expect(hrefs.length).toBeGreaterThan(0);

      for (const href of hrefs) {
        await test.step(href!, async () => {
          const response = await page.goto(href!);
          expect(response?.status()).toBe(200);

          const id = href!.split("#")[1];
          const target = page.locator(`#${id}`);
          await expect(target).toBeVisible();

          const highlighted = target.locator("xpath=ancestor::section[1]");
          await expect
            .poll(() => highlighted.evaluate((el) => getComputedStyle(el).borderLeftColor))
            .not.toBe("rgba(0, 0, 0, 0)");
        });
      }
    });
  }
});

test.describe("/regulament table of contents", () => {
  test("desktop TOC link scrolls to the section and sets aria-current", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ro/regulament");

    const nav = page.getByRole("navigation", { name: ro.rulesPage.tocLabel }).first();
    const link = nav.getByRole("link", { name: "Pasa înainte" });

    await link.click();
    await expect(page).toHaveURL(/#pase$/);
    await expect(page.locator("h2#pase")).toBeInViewport();
    await expect(link).toHaveAttribute("aria-current", "location");
  });

  test("below lg, the TOC is a working, keyboard-operable <details>", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/ro/regulament");

    const details = page.locator("details");
    await expect(details).toBeVisible();
    await expect(details).not.toHaveJSProperty("open", true);

    await details.locator("summary").focus();
    await page.keyboard.press("Enter");

    await expect(details).toHaveJSProperty("open", true);
    await expect(details.getByRole("link", { name: "Pasa înainte" })).toBeVisible();
  });

  test("heading tree is one h1 then h2s", async ({ page }) => {
    await page.goto("/ro/regulament");

    const levels = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((headings) => headings.map((h) => Number(h.tagName[1])));

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    expect(levels.slice(1).every((level) => level === 2)).toBe(true);
  });

  test("a TermLink opens the explainer panel", async ({ page }) => {
    await page.goto("/ro/regulament");

    await page.getByRole("button", { name: "down", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Down" })).toBeVisible();
  });
});

test.describe("/istorie timeline", () => {
  test("renders as real <ol>s, in chronological order", async ({ page }) => {
    await page.goto("/ro/istorie");

    await expect(page.locator("ol")).toHaveCount(4);

    const years = await page.locator("ol li > div > span").allTextContents();
    expect(years).toHaveLength(18);

    const numericYears = years.map(Number);
    expect(numericYears).toEqual([...numericYears].sort((a, b) => a - b));
  });
});

test.describe("reference pages accessibility across team accents", () => {
  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    // Timeline dots and the Bebas year text over $c-page are the contrast risks this loop exists to catch.
    for (const path of ["/regulament", "/istorie"]) {
      test(`${path} axe clean with ${team.name} selected`, async ({ page }) => {
        await page.goto(`/ro${path}`);
        await page.getByRole("radio", { name: team.name }).click();

        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});

test.describe("glossary index accessibility across team accents", () => {
  for (const slug of PICKER_TEAMS) {
    const team = getTeam(slug);

    test(`/glosar axe clean with ${team.name} selected`, async ({ page }) => {
      await page.goto("/ro/glosar");
      await page.getByRole("radio", { name: team.name }).click();

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("reference pages visual regression", () => {
  const viewports = [
    { label: "375", width: 375, height: 1200 },
    { label: "768", width: 768, height: 1400 },
    { label: "1440", width: 1440, height: 1400 },
  ];

  for (const viewport of viewports) {
    for (const path of ["regulament", "istorie"]) {
      test(`/${path} matches its ${viewport.label}px baseline screenshot`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/ro/${path}`);

        // nextjs-portal is the dev-only build/route indicator — see homepage.spec.ts.
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

        await expect(page).toHaveScreenshot(`${path}-${viewport.label}.png`, {
          fullPage: true,
        });
      });
    }
  }
});
