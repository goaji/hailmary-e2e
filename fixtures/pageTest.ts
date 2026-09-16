import { test as base } from "@playwright/test";
import { SchedulePage } from "../pageObjects/SchedulePage";
import { SiteHeader } from "../pageObjects/SiteHeader";

type PageFixtures = {
  siteHeader: SiteHeader;
  schedulePage: SchedulePage;
};

export const test = base.extend<PageFixtures>({
  siteHeader: async ({ page }, use) => {
    await use(new SiteHeader(page));
  },
  schedulePage: async ({ page }, use) => {
    await use(new SchedulePage(page));
  },
});

export { expect } from "@playwright/test";
