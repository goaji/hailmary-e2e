import type { Locator, Page } from "@playwright/test";
import { MESSAGES, type Locale } from "./messages";

export class GlossaryPage {
  private readonly messages;
  readonly rail;
  readonly letterLinks;
  readonly termLinks;
  readonly search;
  readonly noResults;
  readonly terms;
  readonly termHeadings;

  constructor(
    private readonly page: Page,
    private readonly locale: Locale = "ro",
  ) {
    this.messages = MESSAGES[locale];
    // Visible only at desktop widths; below lg the rail sits in a closed <details>.
    this.rail = page.getByRole("navigation", { name: this.messages.glossary.railLabel });
    // Letter links are the only single-character names in the rail.
    this.letterLinks = this.rail.getByRole("link", { name: /^[A-Z]$/ });
    // Every term link carries a #slug; letter links are bare /glosar paths.
    this.termLinks = this.rail.getByRole("link").and(page.locator('[href*="#"]'));
    this.search = this.rail.getByRole("searchbox", { name: this.messages.glossary.filterLabel });
    // The app announces the empty result with role=status; hold it to that, not just the text.
    this.noResults = this.rail.getByRole("status");
    this.terms = page.getByRole("main").getByRole("article");
    this.termHeadings = this.terms.getByRole("heading", { level: 2 });
  }

  async goto(letter?: string): Promise<void> {
    await this.page.goto(`/${this.locale}/glosar${letter ? `/${letter}` : ""}`);
  }

  title(letter: string): Locator {
    return this.page.getByRole("heading", {
      level: 1,
      name: this.messages.glossary.pageTitle.replace("{letter}", letter),
      exact: true,
    });
  }

  // Letters and terms are both rail links; only the name tells them apart.
  railLink(name: string): Locator {
    return this.rail.getByRole("link", { name, exact: true });
  }

  termHeading(term: string): Locator {
    return this.terms.getByRole("heading", { level: 2, name: term, exact: true });
  }

  // The rail marks the current letter aria-current="page"; getByRole can't filter on it.
  currentLetter(): Locator {
    return this.rail.locator('[aria-current="page"]');
  }

  // The term you arrived at is marked aria-current="location".
  currentTerm(): Locator {
    return this.rail.locator('[aria-current="location"]');
  }
}
