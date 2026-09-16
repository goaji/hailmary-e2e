import { test as base } from "@playwright/test";
import { NewsIndexPage } from "../pageObjects/NewsIndexPage";
import { SchedulePage } from "../pageObjects/SchedulePage";
import { SiteHeader } from "../pageObjects/SiteHeader";

type PageFixtures = {
  siteHeader: SiteHeader;
  schedulePage: SchedulePage;
  newsIndexPage: NewsIndexPage;
};

export const test = base.extend<PageFixtures>({
  siteHeader: async ({ page }, use) => {
    await use(new SiteHeader(page));
  },
  schedulePage: async ({ page }, use) => {
    await use(new SchedulePage(page));
  },
  newsIndexPage: async ({ page }, use) => {
    await use(new NewsIndexPage(page));
  },
});

export { expect } from "@playwright/test";
