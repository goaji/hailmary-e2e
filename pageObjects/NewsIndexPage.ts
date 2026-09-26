import type { Page } from "@playwright/test";
import type { AllFilter, Category } from "@hailmary/shared";
import { MESSAGES, type Locale } from "./messages";

// Omitting a key leaves that filter alone; ALL_FILTER clears it.
export type NewsFilters = { category?: AllFilter | Category; team?: string };

export class NewsIndexPage {
  readonly title;
  readonly fallbackNotice;
  readonly gridView;
  readonly listView;
  readonly cards;
  readonly cardTitles;
  readonly categoryFilter;
  readonly teamFilter;
  readonly emptyFiltered;

  constructor(
    private readonly page: Page,
    private readonly locale: Locale = "ro",
  ) {
    const messages = MESSAGES[locale];
    this.title = page.getByRole("heading", { level: 1, name: messages.newsIndex.title });
    this.fallbackNotice = page.getByText(messages.newsIndex.fallbackNotice);
    this.gridView = page.getByRole("radio", { name: messages.newsIndex.gridView });
    this.listView = page.getByRole("radio", { name: messages.newsIndex.listView });
    this.cards = page.getByRole("article");
    this.cardTitles = this.cards.getByRole("heading");
    this.categoryFilter = page.getByRole("combobox", { name: messages.newsIndex.categoryFilterLabel });
    this.teamFilter = page.getByRole("combobox", { name: messages.newsIndex.teamFilterLabel });
    // role=status takes no name from its content, and FallbackNotice shares the
    // role on /en/stiri, so the message itself is what tells the two apart.
    this.emptyFiltered = page
      .getByRole("status")
      .filter({ hasText: messages.newsIndex.emptyFiltered });
  }

  async goto(): Promise<void> {
    await this.page.goto(`/${this.locale}/stiri`);
  }

  async switchToListView(): Promise<void> {
    await this.listView.click();
  }

  async switchToGridView(): Promise<void> {
    await this.gridView.click();
  }

  // Sets whichever filters are given and returns the card titles left showing.
  async applyFilters(filters: NewsFilters): Promise<string[]> {
    if (filters.category !== undefined) await this.categoryFilter.selectOption(filters.category);
    if (filters.team !== undefined) await this.teamFilter.selectOption(filters.team);
    const titles = await this.cardTitles.allTextContents();
    return titles;
  }

  // The saved grid/list choice, as NewsFilters writes it to localStorage.
  async storedView(): Promise<string | null> {
    const view = await this.page.evaluate(() => window.localStorage.getItem("hm.newsView"));
    return view;
  }

  // Each card's <time datetime> as a timestamp, in page order; NaN if unparseable.
  async publishedTimestamps(): Promise<number[]> {
    const timestamps = await this.cards
      .getByRole("time")
      .evaluateAll((els) => els.map((el) => Date.parse(el.getAttribute("datetime") ?? "")));
    return timestamps;
  }
}
