import { test, expect } from "@playwright/test";

function locsFrom(xml: string): string[] {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

test.describe("sitemap", () => {
  test("every sitemap URL resolves with 200", async ({ request }) => {
    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.status()).toBe(200);

    const xml = await sitemapResponse.text();
    const locs = locsFrom(xml);
    expect(locs.length).toBeGreaterThan(0);

    // Sitemap entries are absolute production URLs (SITE_URL) — only the
    // path is meaningful here, since this suite runs against the dev
    // server's baseURL, not the real host.
    for (const loc of locs) {
      const pathname = new URL(loc).pathname;
      const response = await request.get(pathname);
      expect(response.status(), `${pathname} should return 200`).toBe(200);
    }
  });

  test("no Romanian-only news article advertises an en alternate", async ({ request }) => {
    const sitemapResponse = await request.get("/sitemap.xml");
    const xml = await sitemapResponse.text();

    // One <url> block per news article, isolated so its own hreflang
    // alternates (not a neighbouring block's) are what gets checked.
    const articleBlocks = [...xml.matchAll(/<url>(?:(?!<\/url>)[\s\S])*\/stiri\/[\s\S]*?<\/url>/g)];
    expect(articleBlocks.length).toBeGreaterThan(0);

    for (const [block] of articleBlocks) {
      expect(block).not.toContain('hreflang="en"');
      expect(block).toContain('hreflang="ro"');
    }
  });

  test("robots.txt allows crawling and blocks /api/", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("Disallow: /api/");
    expect(body).toMatch(/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/);
  });
});
