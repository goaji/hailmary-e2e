import type { Locator, Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";

type Messages = typeof ro;

export class SiteFooter {
  readonly footer;
  readonly contactLink;
  readonly lines;

  constructor(
    page: Page,
    private readonly messages: Messages = ro,
  ) {
    this.footer = page.getByRole("contentinfo");
    // The footer's only link; its address lives in the app, not in the shared messages.
    this.contactLink = this.footer.getByRole("link");
    this.lines = this.footer.getByRole("paragraph");
  }

  copyright(year: string): Locator {
    return this.footer.getByText(this.messages.siteFooter.copyright.replace("{year}", year), { exact: true });
  }
}
