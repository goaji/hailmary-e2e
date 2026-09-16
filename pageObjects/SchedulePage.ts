import type { Locator, Page } from "@playwright/test";
import ro from "@hailmary/shared/messages/ro.json";

type Messages = typeof ro;
type GotoOptions = Parameters<Page["goto"]>[1];

export class SchedulePage {
  readonly table;
  readonly scrollRegion;
  readonly liveBadge;
  readonly emptyMessage;
  readonly emptyTitle;
  readonly liveUnavailableNotice;
  // Screenshot mask only.
  readonly updatedAt;

  constructor(
    private readonly page: Page,
    private readonly messages: Messages = ro,
  ) {
    this.table = page.getByRole("table");
    this.scrollRegion = page.getByRole("region", { name: messages.scheduleTable.scrollLabel });
    this.liveBadge = this.table.getByText(messages.liveScoreBadge.live);
    this.emptyMessage = page.getByText(messages.schedulePage.empty);
    this.emptyTitle = page.getByRole("heading", { level: 1, name: messages.schedulePage.title, exact: true });
    this.liveUnavailableNotice = page.getByText(messages.schedulePage.liveUnavailableNotice);
    this.updatedAt = page.getByTestId("schedule-updated-at");
  }

  title(week: number): Locator {
    return this.page.getByRole("heading", {
      level: 1,
      name: this.messages.schedulePage.titleWithWeek.replace("{week}", String(week)),
    });
  }

  tableForWeek(week: number): Locator {
    return this.page.getByRole("table", {
      name: this.messages.scheduleTable.caption.replace("{week}", String(week)),
    });
  }

  weekLink(week: number): Locator {
    return this.page.getByRole("link", {
      name: this.messages.schedulePage.week.replace("{week}", String(week)),
    });
  }

  row(team: string | RegExp): Locator {
    return this.table.getByRole("row", { name: team });
  }

  async goto(options?: GotoOptions): Promise<void> {
    await this.page.goto("/ro/program", options);
  }

  async selectWeek(week: number): Promise<void> {
    await this.weekLink(week).click();
  }
}
