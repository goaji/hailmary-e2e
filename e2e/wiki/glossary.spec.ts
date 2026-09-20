import ro from "@hailmary/shared/messages/ro.json";
import { test, expect } from "../../fixtures/pageTest";
import { headMetadata } from "../../helpers";
import { GlossaryPage } from "../../pageObjects/GlossaryPage";

// Desktop, so the rail is a visible nav rather than a closed <details>.
test.use({ viewport: { width: 1440, height: 900 } });

test("the glossary index sends readers to its first letter, in both locales", async ({ page }) => {
  for (const locale of ["ro", "en"] as const) {
    await test.step(`/${locale}/glosar`, async () => {
      const glossary = new GlossaryPage(page, locale);
      await glossary.goto();

      const first = await glossary.letterLinks.first().textContent();
      expect(first).toMatch(/^[A-Z]$/);
      await expect(page).toHaveURL(`/${locale}/glosar/${first?.toLowerCase()}`);
      await expect(glossary.title(first ?? "")).toBeVisible();
    });
  }
});

test("a letter page lists exactly that letter's terms, and the rail agrees", async ({ glossaryPage }) => {
  // A letter with several terms, so "exactly" rests on more than one heading.
  const letter = await gotoLetterWithSeveralTerms(glossaryPage);

  await expect(glossaryPage.title(letter)).toBeVisible();
  await expect(glossaryPage.currentLetter()).toHaveText(letter);

  const terms = await glossaryPage.termHeadings.allTextContents();
  expect(terms.length).toBeGreaterThan(1);
  for (const term of terms) {
    expect(term.charAt(0).toUpperCase(), term).toBe(letter);
  }
  // Only the current letter's group is expanded, so the rail's term links are this page's terms.
  await expect(glossaryPage.termLinks).toHaveText(terms);
});

test("every rail letter links to its own page, and following one switches the current letter", async ({
  page,
  glossaryPage,
}) => {
  await glossaryPage.goto();
  const letters = await glossaryPage.letterLinks.allTextContents();
  expect(letters.length).toBeGreaterThan(1);

  for (const letter of letters) {
    await expect(glossaryPage.railLink(letter)).toHaveAttribute("href", `/ro/glosar/${letter.toLowerCase()}`);
  }

  const second = letters[1];
  await glossaryPage.railLink(second).click();
  await expect(page).toHaveURL(`/ro/glosar/${second.toLowerCase()}`);
  await expect(glossaryPage.title(second)).toBeVisible();
  await expect(glossaryPage.currentLetter()).toHaveText(second);
});

test("an uppercase letter serves the same page, canonical to the lowercase URL", async ({ page, glossaryPage }) => {
  await glossaryPage.goto();
  const letter = (await glossaryPage.letterLinks.first().textContent()) ?? "";
  const lowercaseTerms = await glossaryPage.termHeadings.allTextContents();

  await glossaryPage.goto(letter);
  // The h1 renders the resolved letter either way, so the terms are what prove it's one page.
  await expect(glossaryPage.title(letter)).toBeVisible();
  expect(await glossaryPage.termHeadings.allTextContents()).toEqual(lowercaseTerms);

  const { canonical } = await headMetadata(page);
  expect(new URL(canonical ?? "").pathname).toBe(`/ro/glosar/${letter.toLowerCase()}`);
});

test("letters with no terms, non-letters and unknown letters 404", async ({ page, glossaryPage, wikiPage }) => {
  await glossaryPage.goto();
  const empty = await letterWithoutTerms(glossaryPage);

  // `empty` is a real letter the glossary has no terms for; zz and 1 can never be letters.
  for (const letter of [empty.toLowerCase(), "zz", "1"]) {
    await test.step(letter, async () => {
      const response = await page.goto(`/ro/glosar/${letter}`);
      expect(response?.status()).toBe(404);
      await expect(wikiPage.notFoundTitle).toBeVisible();
      await expect(glossaryPage.rail).toHaveCount(0);
    });
  }
});

test("the rail's search filters the whole glossary and says when nothing matches", async ({ glossaryPage }) => {
  const letter = await gotoLetterWithSeveralTerms(glossaryPage);
  const ownTerms = await glossaryPage.termHeadings.allTextContents();
  const elsewhere = await firstTermOfAnotherLetter(glossaryPage, letter);
  await glossaryPage.goto(letter.toLowerCase());

  await test.step("a match from another letter proves the search spans the glossary", async () => {
    const query = elsewhere.term.slice(0, 4);
    await glossaryPage.search.fill(query);
    // Settle the filtered list first; allTextContents() takes one snapshot and never retries.
    await expect(glossaryPage.railLink(elsewhere.term)).toBeVisible();

    for (const match of await glossaryPage.termLinks.allTextContents()) {
      expect(match.toLowerCase(), match).toContain(query.toLowerCase());
    }
    // A match off this page has no anchor here, so it must point at its own letter.
    await expect(glossaryPage.railLink(elsewhere.term)).toHaveAttribute(
      "href",
      new RegExp(`^/ro/glosar/${elsewhere.letter.toLowerCase()}#`),
    );
    await expect(glossaryPage.noResults).toHaveCount(0);
  });

  await test.step("a query nothing matches announces it", async () => {
    await glossaryPage.search.fill("zzzz");
    await expect(glossaryPage.noResults).toHaveText(ro.glossary.noResults);
    await expect(glossaryPage.termLinks).toHaveCount(0);
  });

  await test.step("clearing the query brings the letter's terms back", async () => {
    await glossaryPage.search.fill("");
    await expect(glossaryPage.termLinks).toHaveText(ownTerms);
  });
});

test("arriving at a term anchor marks it as the reader's location in the rail", async ({ page, glossaryPage }) => {
  await glossaryPage.goto();
  const link = glossaryPage.termLinks.first();
  const term = (await link.textContent()) ?? "";
  const hash = (await link.getAttribute("href")) ?? "";
  expect(hash).toMatch(/^#.+/);

  await page.goto(`${new URL(page.url()).pathname}${hash}`);
  await expect(glossaryPage.currentTerm()).toHaveText(term);
});

test("clicking a rail term moves the marker straight away, with no reload", async ({ page, glossaryPage }) => {
  const letter = await gotoLetterWithSeveralTerms(glossaryPage);
  const terms = await glossaryPage.termLinks.allTextContents();

  // A full reload would also end up with the right marker; this proves it moved in place.
  let reloads = 0;
  page.on("load", () => void reloads++);

  await test.step("the first term is marked without waiting for a reload", async () => {
    await glossaryPage.termLinks.first().click();
    await expect(glossaryPage.currentTerm()).toHaveText(terms[0]);
    await expect(page).toHaveURL(new RegExp(`/glosar/${letter.toLowerCase()}#`));
  });

  await test.step("a second term swaps the marker in place", async () => {
    await glossaryPage.termLinks.nth(1).click();
    await expect(glossaryPage.currentTerm()).toHaveText(terms[1]);
  });

  await test.step("going back restores the previous term's marker", async () => {
    await page.goBack();
    await expect(glossaryPage.currentTerm()).toHaveText(terms[0]);
  });

  expect(reloads, "the rail's term links should navigate within the page").toBe(0);
});

test("a rail term scrolls its entry into view", async ({ glossaryPage }) => {
  const term = await gotoTermBelowTheFold(glossaryPage);

  // Term counts don't settle this: F's three entries all fit on screen, S's fourth doesn't.
  await expect(glossaryPage.termHeading(term)).not.toBeInViewport();
  await glossaryPage.railLink(term).click();
  await expect(glossaryPage.termHeading(term)).toBeInViewport();
});

// The glossary redirects to its first letter, which may hold a single term; comparing one term
// against another needs a letter with at least two.
async function gotoLetterWithSeveralTerms(glossaryPage: GlossaryPage): Promise<string> {
  await glossaryPage.goto();
  for (const letter of await glossaryPage.letterLinks.allTextContents()) {
    await glossaryPage.goto(letter.toLowerCase());
    if ((await glossaryPage.termLinks.count()) > 1) return letter;
  }
  throw new Error("no glossary letter has more than one term");
}

// The rail only expands the current letter, so reaching another letter's terms means visiting it.
async function firstTermOfAnotherLetter(
  glossaryPage: GlossaryPage,
  current: string,
): Promise<{ letter: string; term: string }> {
  const other = (await glossaryPage.letterLinks.allTextContents()).find((letter) => letter !== current);
  if (!other) throw new Error("the glossary has only one letter");
  await glossaryPage.goto(other.toLowerCase());
  return { letter: other, term: (await glossaryPage.termHeadings.first().textContent()) ?? "" };
}

// Which letters have no terms is editorial, so read it off the rail rather than naming one.
async function letterWithoutTerms(glossaryPage: GlossaryPage): Promise<string> {
  const present = new Set(await glossaryPage.letterLinks.allTextContents());
  const absent = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].find((letter) => !present.has(letter));
  if (!absent) throw new Error("every letter has terms; the 404 case needs another input");
  return absent;
}

// toBeInViewport only proves a scroll if the entry starts below the fold; find one that does.
async function gotoTermBelowTheFold(glossaryPage: GlossaryPage): Promise<string> {
  await glossaryPage.goto();
  for (const letter of await glossaryPage.letterLinks.allTextContents()) {
    await glossaryPage.goto(letter.toLowerCase());
    const below = await glossaryPage.termHeadings.evaluateAll((headings) =>
      headings.find((heading) => heading.getBoundingClientRect().top >= window.innerHeight)?.textContent?.trim(),
    );
    if (below) return below;
  }
  throw new Error("no glossary letter has an entry below the fold");
}
