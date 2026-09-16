import type { Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";

type Locale = "ro" | "en";

const MESSAGES = { ro, en };

export class HomePage {
  readonly heroTitle;
  readonly heroLink;
  readonly heroImage;
  readonly fallbackNotice;
  readonly newsGrid;
  readonly cards;
  readonly cardTitles;
  readonly cardLinks;
  readonly cardImages;
  readonly beginnerGuide;
  readonly beginnerGuideLinks;
  readonly upcomingGames;
  readonly upcomingGamesRows;
  readonly upcomingGamesEmpty;
  readonly originStrip;
  readonly originStripLink;
  readonly originStripDismiss;

  constructor(
    private readonly page: Page,
    private readonly locale: Locale = "ro",
  ) {
    const messages = MESSAGES[locale];
    this.heroTitle = page.getByRole("heading", { level: 1 });
    this.heroLink = this.heroTitle.getByRole("link");
    // The hero wrapper has no role; its image is the first one in main.
    this.heroImage = page.getByRole("main").getByRole("img").first();
    this.fallbackNotice = page.getByText(messages.newsIndex.fallbackNotice);
    this.newsGrid = page.getByRole("region", { name: messages.newsGrid.heading, exact: true });
    this.cards = this.newsGrid.getByRole("article");
    this.cardTitles = this.cards.getByRole("heading");
    this.cardLinks = this.cardTitles.getByRole("link");
    // includeHidden: the grid hides card images below 768px.
    this.cardImages = this.cards.getByRole("img", { includeHidden: true });
    this.beginnerGuide = page.getByRole("region", { name: messages.sidebar.beginnerGuide.heading, exact: true });
    this.beginnerGuideLinks = this.beginnerGuide.getByRole("link");
    this.upcomingGames = page.getByRole("region", { name: messages.sidebar.schedule.heading, exact: true });
    this.upcomingGamesRows = this.upcomingGames.getByRole("listitem");
    this.upcomingGamesEmpty = this.upcomingGames.getByText(messages.sidebar.schedule.empty);
    // The strip has no role; this is the app's STRIP_ID.
    this.originStrip = page.locator("#origin-strip");
    this.originStripLink = this.originStrip.getByRole("link", { name: messages.originStrip.readMore, exact: true });
    this.originStripDismiss = page.getByRole("button", { name: messages.originStrip.dismiss });
  }

  async goto(): Promise<void> {
    await this.page.goto(`/${this.locale}`);
  }

  async dismissOriginStrip(): Promise<void> {
    await this.originStripDismiss.click();
  }
}
