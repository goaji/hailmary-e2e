import type { Page } from "@playwright/test";

export async function getAccent1(page: Page) {
  return page
    .getByRole("banner")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent-1").trim());
}
