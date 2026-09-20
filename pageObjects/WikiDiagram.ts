import type { Locator, Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";
import { WikiPage, type DiagramKey } from "./WikiPage";
import { DIAGRAM_PAGES } from "../e2e/wiki/diagramPages";

export class WikiDiagram {
  readonly region;
  readonly buttons;
  readonly pressedButtons;
  readonly status;
  readonly tabs;
  readonly tabpanel;
  // The diagram's own copy, keyed like the app's translations.
  readonly messages: Record<string, string>;

  constructor(
    private readonly page: Page,
    private readonly key: DiagramKey,
  ) {
    this.region = new WikiPage(page).diagram(key);
    this.buttons = this.region.getByRole("button");
    this.pressedButtons = this.region.getByRole("button", { pressed: true });
    this.status = this.region.getByRole("status");
    this.tabs = this.region.getByRole("tab");
    this.tabpanel = this.region.getByRole("tabpanel");
    this.messages = ro[key] as Record<string, string>;
  }

  async goto(): Promise<void> {
    await this.page.goto(DIAGRAM_PAGES[this.key]);
  }

  button(name: string): Locator {
    return this.region.getByRole("button", { name, exact: true });
  }

  tab(name: string): Locator {
    return this.region.getByRole("tab", { name, exact: true });
  }

  text(value: string): Locator {
    return this.region.getByText(value, { exact: true });
  }
}
