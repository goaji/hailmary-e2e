import { test, expect } from "../../fixtures/pageTest";
import { ANCHOR_ARTICLE_SLUG, headMetadata } from "../../helpers";

type HeadCase = { url: string; languages: Record<string, string> };

function bilingual(path: string): HeadCase[] {
  const ro = `/ro${path}`;
  const en = `/en${path}`;
  const languages = { ro, en, "x-default": ro };
  return [
    { url: ro, languages },
    { url: en, languages },
  ];
}

function romanianOnly(path: string, locales: readonly string[]): HeadCase[] {
  const ro = `/ro${path}`;
  return locales.map((locale) => ({ url: `/${locale}${path}`, languages: { ro, "x-default": ro } }));
}

const PAGES: HeadCase[] = [
  ...bilingual(""),
  ...bilingual("/echipe/kc"),
  ...bilingual("/glosar/q"),
  ...bilingual("/program"),
  // Romanian-only article: /en serves the ro text but must not advertise an en version.
  ...romanianOnly(`/stiri/${ANCHOR_ARTICLE_SLUG}`, ["ro", "en"]),
  // The wiki has no en pages, so no en link (its switcher EN link 404s, accepted for now).
  ...romanianOnly("/wiki", ["ro"]),
];

// Compared by path: canonical uses the production origin, og:image the serving one.
function pathOf(url: string | null): string {
  return url === null ? "" : new URL(url).pathname;
}

for (const { url, languages } of PAGES) {
  test(`${url} names itself canonical, links its languages and has a working preview image`, async ({
    page,
    request,
  }) => {
    await page.goto(url);
    const { canonical, alternates, ogImage } = await headMetadata(page);

    expect(pathOf(canonical)).toBe(url);
    const alternatePaths = Object.fromEntries(Object.entries(alternates).map(([lang, href]) => [lang, pathOf(href)]));
    expect(alternatePaths).toEqual(languages);
    const origins = new Set([canonical, ...Object.values(alternates)].map((href) => new URL(href ?? "").origin));
    expect(origins.size).toBe(1);

    expect(ogImage).not.toBeNull();
    const image = new URL(ogImage ?? "");
    const response = await request.get(image.pathname + image.search);
    expect(response.status(), `${image.pathname} status`).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });
}
