import { test as base } from "@playwright/test";
import { ExplainerPanel } from "../pageObjects/ExplainerPanel";
import { GlossaryPage } from "../pageObjects/GlossaryPage";
import { HomePage } from "../pageObjects/HomePage";
import { NewsIndexPage } from "../pageObjects/NewsIndexPage";
import { SchedulePage } from "../pageObjects/SchedulePage";
import { SiteFooter } from "../pageObjects/SiteFooter";
import { SiteHeader } from "../pageObjects/SiteHeader";
import { WikiHubPage } from "../pageObjects/WikiHubPage";
import { WikiPage } from "../pageObjects/WikiPage";

type PageFixtures = {
  siteHeader: SiteHeader;
  siteFooter: SiteFooter;
  homePage: HomePage;
  schedulePage: SchedulePage;
  newsIndexPage: NewsIndexPage;
  explainerPanel: ExplainerPanel;
  wikiHubPage: WikiHubPage;
  wikiPage: WikiPage;
  glossaryPage: GlossaryPage;
};

export const test = base.extend<PageFixtures>({
  siteHeader: async ({ page }, use) => {
    await use(new SiteHeader(page));
  },
  siteFooter: async ({ page }, use) => {
    await use(new SiteFooter(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
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
  wikiHubPage: async ({ page }, use) => {
    await use(new WikiHubPage(page));
  },
  wikiPage: async ({ page }, use) => {
    await use(new WikiPage(page));
  },
  glossaryPage: async ({ page }, use) => {
    await use(new GlossaryPage(page));
  },
});

export { expect } from "@playwright/test";
