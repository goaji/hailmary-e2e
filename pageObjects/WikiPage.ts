import type { Locator, Page, Response } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";

export class WikiPage {
  readonly notFoundTitle;
  readonly breadcrumbs;
  readonly breadcrumbItems;
  readonly breadcrumbWikiLink;
  readonly rail;
  readonly railLinks;
  readonly collapsedStrands;
  readonly readingThread;
  readonly prevLink;
  readonly nextLink;

  // The wiki has Romanian pages only.
  constructor(private readonly page: Page) {
    this.notFoundTitle = page.getByRole("heading", { name: ro.notFoundPage.title });
    this.breadcrumbs = page.getByRole("navigation", { name: ro.wikiPage.breadcrumbNavLabel });
    this.breadcrumbItems = this.breadcrumbs.getByRole("listitem");
    this.breadcrumbWikiLink = this.breadcrumbs.getByRole("link", { name: ro.nav.wiki, exact: true });
    // Visible only at desktop widths; below lg the rail sits in a closed <details>.
    this.rail = page.getByRole("navigation", { name: ro.wikiRail.label });
    this.railLinks = this.rail.getByRole("link");
    this.collapsedStrands = this.rail.getByRole("button", { expanded: false });
    this.readingThread = page.getByRole("navigation", { name: ro.wikiPage.readingThreadNavLabel });
    this.prevLink = this.readingThread.getByRole("link").filter({ hasText: ro.wikiPage.prev });
    this.nextLink = this.readingThread.getByRole("link").filter({ hasText: ro.wikiPage.next });
  }

  async goto(path: string): Promise<Response | null> {
    const response = await this.page.goto(path);
    return response;
  }

  // The rail marks the current page with aria-current; getByRole can't filter on it.
  railCurrent(): Locator {
    return this.rail.locator('[aria-current="page"]');
  }
}
