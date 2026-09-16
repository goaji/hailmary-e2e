import type { Locator, Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";

type Messages = typeof ro;

// Scope for header-only axe scans; matches the app's SITE_HEADER_ID.
export const SITE_HEADER_AXE_SCOPE = "#site-header";

export class SiteHeader {
  readonly banner;
  readonly homeLink;
  readonly teamPicker;
  readonly mainNav;
  readonly menuToggle;
  readonly languageSwitcher;
  readonly controls;

  constructor(
    private readonly page: Page,
    messages: Messages = ro,
  ) {
    this.banner = page.getByRole("banner");
    // The logo's label is the site title in capitals; string names match case-insensitively.
    this.homeLink = this.banner.getByRole("link", { name: messages.meta.title });
    this.teamPicker = page.getByRole("radiogroup", { name: messages.teamPicker.label });
    this.mainNav = page.getByRole("navigation", { name: messages.nav.mainLabel });
    this.menuToggle = page.getByRole("button", { name: messages.nav.toggleLabel });
    this.languageSwitcher = page.getByRole("navigation", { name: messages.languageSwitcher.label });
    // Every interactive element in the header; hidden ones (the menu button on desktop) drop out.
    this.controls = this.banner
      .getByRole("link")
      .or(this.banner.getByRole("button"))
      .or(this.banner.getByRole("radio"));
  }

  teamRadio(teamName: string): Locator {
    return this.teamPicker.getByRole("radio", { name: teamName });
  }

  navLink(name: string): Locator {
    return this.mainNav.getByRole("link", { name });
  }

  // getByRole has no aria-current filter, so this is the one attribute locator.
  currentNavLinks(): Locator {
    return this.mainNav.locator("[aria-current]");
  }

  // Mirrors the app's LanguageSwitcher, which labels each locale with its code in capitals.
  languageLink(locale: "ro" | "en"): Locator {
    return this.languageSwitcher.getByRole("link", { name: locale.toUpperCase(), exact: true });
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
