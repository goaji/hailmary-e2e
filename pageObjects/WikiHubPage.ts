import type { Locator, Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";

// The wiki has Romanian pages only.
export const WIKI_PATH = "/ro/wiki";

export type WikiStrand = keyof typeof ro.wikiStrands;

export type WikiPageLink = { strand: WikiStrand; slug: string; path: string; title: string };

const isWikiStrand = (value: string): value is WikiStrand => value in ro.wikiStrands;

export class WikiHubPage {
  readonly title;
  readonly intro;
  readonly strandHeadings;
  readonly pageLinks;

  constructor(private readonly page: Page) {
    this.title = page.getByRole("heading", { level: 1, name: ro.wikiHub.title, exact: true });
    this.intro = page.getByText(ro.wikiHub.intro, { exact: true });
    this.strandHeadings = page.getByRole("main").getByRole("heading", { level: 2 });
    this.pageLinks = page.getByRole("main").getByRole("link");
  }

  strandDescription(strand: WikiStrand): Locator {
    return this.page.getByText(ro.wikiStrands[strand].description, { exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto(WIKI_PATH);
  }

  // Every wiki page the hub lists, in hub order (the same order as the rail and prev/next).
  async wikiPages(): Promise<WikiPageLink[]> {
    const links = await this.pageLinks.evaluateAll((els) =>
      els.map((el) => {
        // Visible title only; the chevron is aria-hidden.
        const copy = el.cloneNode(true) as Element;
        copy.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
        return { path: el.getAttribute("href") ?? "", title: copy.textContent?.trim() ?? "" };
      }),
    );
    const pages = links.flatMap(({ path, title }) => {
      const [, strand = "", slug = ""] = new RegExp(`^${WIKI_PATH}/([^/]+)/([^/#]+)$`).exec(path) ?? [];
      return isWikiStrand(strand) ? [{ strand, slug, path, title }] : [];
    });
    return pages;
  }
}
