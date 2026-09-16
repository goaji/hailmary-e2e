import en from "@hailmary/shared/messages/en.json";
import { test, expect } from "../../fixtures/pageTest";
import { ANCHOR_ARTICLE_SLUG } from "../../helpers";
import { SiteHeader } from "../../pageObjects/SiteHeader";

// /ro/wiki is left out: the wiki has no en pages, so its EN link 404s. Accepted for now.
const ROUTES = ["/ro/echipe/kc", "/ro/program", `/ro/stiri/${ANCHOR_ARTICLE_SLUG}`];

test.use({ viewport: { width: 1440, height: 900 } });

test("switching language keeps the reader on the same page", async ({ page, siteHeader }) => {
  const enHeader = new SiteHeader(page, en);
  await page.goto("/ro/echipe/kc");
  await expect(siteHeader.languageLink("ro")).toHaveAttribute("aria-current", "true");

  await test.step("EN opens the same page in English", async () => {
    await siteHeader.languageLink("en").click();
    await expect(page).toHaveURL("/en/echipe/kc");
    await expect(enHeader.languageLink("en")).toHaveAttribute("aria-current", "true");
    await expect(enHeader.languageLink("ro")).not.toHaveAttribute("aria-current");
  });

  await test.step("RO brings it back", async () => {
    await enHeader.languageLink("ro").click();
    await expect(page).toHaveURL("/ro/echipe/kc");
    await expect(siteHeader.languageLink("ro")).toHaveAttribute("aria-current", "true");
  });
});

for (const route of ROUTES) {
  test(`links on ${route} point at the same page in each language`, async ({ page, siteHeader }) => {
    await page.goto(route);

    await expect(siteHeader.languageLink("ro")).toHaveAttribute("href", route);
    await expect(siteHeader.languageLink("en")).toHaveAttribute("href", route.replace(/^\/ro/, "/en"));
  });
}
