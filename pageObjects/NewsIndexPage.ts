import type { Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";

type Locale = "ro" | "en";

const MESSAGES = { ro, en };

export class NewsIndexPage {
  readonly title;
  readonly fallbackNotice;
  readonly gridView;
  readonly listView;
  readonly cards;
  readonly cardTitles;

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
