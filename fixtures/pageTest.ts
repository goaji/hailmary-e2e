import { test as base } from "@playwright/test";
import { ExplainerPanel } from "../pageObjects/ExplainerPanel";
import { NewsIndexPage } from "../pageObjects/NewsIndexPage";
import { SchedulePage } from "../pageObjects/SchedulePage";
import { SiteFooter } from "../pageObjects/SiteFooter";
import { SiteHeader } from "../pageObjects/SiteHeader";

type PageFixtures = {
  siteHeader: SiteHeader;
  siteFooter: SiteFooter;
  schedulePage: SchedulePage;
  newsIndexPage: NewsIndexPage;
  explainerPanel: ExplainerPanel;
};

export const test = base.extend<PageFixtures>({
  siteHeader: async ({ page }, use) => {
    await use(new SiteHeader(page));
  },
  siteFooter: async ({ page }, use) => {
    await use(new SiteFooter(page));
  },
  schedulePage: async ({ page }, use) => {
    await use(new SchedulePage(page));
  },
  newsIndexPage: async ({ page }, use) => {
    await use(new NewsIndexPage(page));
  },
  explainerPanel: async ({ page }, use) => {
    await use(new ExplainerPanel(page));
  },
});

export { expect } from "@playwright/test";
