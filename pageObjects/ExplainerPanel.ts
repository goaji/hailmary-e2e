import type { Locator, Page } from "@playwright/test";

export class ExplainerPanel {
  readonly dialog;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole("dialog");
  }

  // The in-text term button; its tooltip is aria-hidden, so the name is exactly the term.
  trigger(term: string): Locator {
    return this.page.getByRole("button", { name: term, exact: true });
  }

  dialogFor(term: string): Locator {
    return this.page.getByRole("dialog", { name: term });
  }

  heading(term: string): Locator {
    return this.dialog.getByRole("heading", { name: term });
  }

  // aria-hidden by design, so it has no role; its visible text is the only handle.
  tooltip(term: string, shortText: string): Locator {
    return this.trigger(term).getByText(shortText);
  }

  async open(term: string): Promise<void> {
    await this.trigger(term).click();
  }

  async openRelated(term: string): Promise<void> {
    await this.dialog.getByRole("button", { name: term }).click();
  }
}
