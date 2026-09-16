import { test as base } from "@playwright/test";
import { SiteHeader } from "../pageObjects/SiteHeader";

type PageFixtures = {
  siteHeader: SiteHeader;
};

export const test = base.extend<PageFixtures>({
  siteHeader: async ({ page }, use) => {
    await use(new SiteHeader(page));
  },
});

export { expect } from "@playwright/test";
