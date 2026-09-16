import type { Locator, Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";

type Messages = typeof ro;

export class SiteHeader {
  readonly banner;
  readonly teamPicker;
  readonly mainNav;
  readonly menuToggle;
  readonly languageSwitcher;

  constructor(
    private readonly page: Page,
    messages: Messages = ro,
  ) {
    this.banner = page.getByRole("banner");
    this.teamPicker = page.getByRole("radiogroup", { name: messages.teamPicker.label });
    this.mainNav = page.getByRole("navigation", { name: messages.nav.mainLabel });
    this.menuToggle = page.getByRole("button", { name: messages.nav.toggleLabel });
    this.languageSwitcher = page.getByRole("navigation", { name: messages.languageSwitcher.label });
  }

  teamRadio(teamName: string): Locator {
    return this.teamPicker.getByRole("radio", { name: teamName });
  }

  navLink(name: string): Locator {
    return this.mainNav.getByRole("link", { name });
  }

  async selectTeam(teamName: string): Promise<void> {
    await this.teamRadio(teamName).click();
  }

  // The reader's accent as the header renders it; poll it, it changes after hydration.
  async accent1(): Promise<string> {
    const accent = await this.banner.evaluate((el) => getComputedStyle(el).getPropertyValue("--accent-1").trim());
    return accent;
  }
}
