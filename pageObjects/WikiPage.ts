import type { Locator, Page, Response } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";

export const DIAGRAM_KEYS = [
  "fieldDiagram",
  "downSystemDiagram",
  "offensivePositionsDiagram",
  "defensivePositionsDiagram",
  "routeTreeDiagram",
  "situationalFootballDiagram",
  "boxScoreDiagram",
  "statLinesDiagram",
] as const;

export type DiagramKey = (typeof DIAGRAM_KEYS)[number];

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
  readonly mobileRail;
  readonly mobileRailSummary;

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
    // <details> maps to role=group; its <summary> text is what identifies it.
    this.mobileRail = page.getByRole("group").filter({ has: page.getByText(ro.wikiRail.mobileLabel) });
    this.mobileRailSummary = this.mobileRail.getByText(ro.wikiRail.mobileLabel);
  }

  async goto(path: string): Promise<Response | null> {
    const response = await this.page.goto(path);
    return response;
  }

  // Section headings and the ids their regions point at — both must be unique per page,
  // or an anchor and its rail link only ever reach the first section of that name.
  async sectionIds(): Promise<string[]> {
    const ids = await this.page
      .getByRole("main")
      .getByRole("region")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-labelledby") ?? ""));
    return ids.filter(Boolean);
  }

  async sectionTitles(): Promise<string[]> {
    const titles = await this.page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
    return titles;
  }

  // A content section, named by its h2; that h2's id is the anchor its TOC and seeAlso links use.
  section(title: string): Locator {
    return this.page.getByRole("region", { name: title, exact: true });
  }

  tocLink(title: string): Locator {
    return this.rail.getByRole("link", { name: title, exact: true });
  }

  // Each diagram is a <section> named by its widgetLabel message.
  diagram(key: DiagramKey): Locator {
    return this.page.getByRole("region", { name: ro[key].widgetLabel, exact: true });
  }

  // The rail marks the current page with aria-current; getByRole can't filter on it.
  railCurrent(): Locator {
    return this.rail.locator('[aria-current="page"]');
  }
}
