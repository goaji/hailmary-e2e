import type { Locator, Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";

type Messages = typeof ro;

export class TeamsPage {
  readonly title;
  readonly learnMoreLink;
  readonly rail;
  readonly railLinks;
  readonly mobileRailToggle;

  constructor(
    private readonly page: Page,
    private readonly messages: Messages = ro,
  ) {
    this.title = page.getByRole("heading", { level: 1, name: messages.teams.title });
    this.learnMoreLink = page.getByRole("link", { name: messages.teams.learnMore });
    // Desktop and mobile copies share the name; whichever is hidden drops out of getByRole.
    this.rail = page.getByRole("navigation", { name: messages.teams.railLabel });
    this.railLinks = this.rail.getByRole("link");
    // <summary> has no ARIA role Playwright can query, so it's found by its text.
    this.mobileRailToggle = page.getByText(messages.teams.railMobileLabel, { exact: true });
  }

  async goto(slug?: string): Promise<void> {
    await this.page.goto(slug ? `/ro/echipe/${slug}` : "/ro/echipe");
  }

  divisionList(label: string): Locator {
    return this.rail.getByRole("list", { name: label, exact: true });
  }

  teamLink(name: string): Locator {
    return this.rail.getByRole("link", { name, exact: true });
  }
}
