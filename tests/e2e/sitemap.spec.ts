import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { LOCALES } from "../../src/i18n/locales.ts";

const site = "https://musickitarchive.com";
const count = (file: string) => (JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8")) as unknown[]).length;
// Home, artists index, one page per kit and one per artist, in every locale.
const pagesPerLocale = 2 + count("../../data/generated/kits.json") + count("../../data/generated/artists.json");

test.describe("sitemap", () => {
  test.skip(({ isMobile }) => isMobile, "same files on every device");

  test("PROD-30 the sitemap lists every page in every locale with its alternates", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain(`Sitemap: ${site}/sitemap-index.xml`);

    const index = await (await request.get("/sitemap-index.xml")).text();
    const files = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => (m[1] as string).replace(site, ""));
    expect(files.length).toBeGreaterThan(0);

    const urls = new Map<string, string[]>();
    for (const file of files) {
      const response = await request.get(file);
      expect(response.ok(), file).toBe(true);
      for (const [, entry] of (await response.text()).matchAll(/<url>(.*?)<\/url>/g)) {
        const loc = /<loc>([^<]+)<\/loc>/.exec(entry as string)?.[1] as string;
        urls.set(
          loc,
          [...(entry as string).matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`),
        );
      }
    }

    expect(urls.size).toBe(LOCALES.length * pagesPerLocale);
    expect(urls.has(`${site}/`)).toBe(false);
    expect([...urls.keys()].filter((u) => u.includes("404"))).toEqual([]);
    expect(urls.get(`${site}/ja/kits/desert-fire/`)).toEqual([
      ...LOCALES.map((l) => `${l.tag} ${site}/${l.segment}/kits/desert-fire/`),
      `x-default ${site}/en/kits/desert-fire/`,
    ]);
  });

  test("PROD-30 sitemap alternates match the page head", async ({ page }) => {
    await page.goto("/es-419/artists/austin-wintory/");
    const head = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) => links.map((l) => `${l.getAttribute("hreflang")} ${l.getAttribute("href")}`));
    const sitemap = await (await page.request.get("/sitemap-index.xml")).text();
    const files = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => (m[1] as string).replace(site, ""));
    const bodies = await Promise.all(files.map(async (f) => (await page.request.get(f)).text()));
    const entry = bodies
      .join("")
      .match(new RegExp(`<url><loc>${site}/es-419/artists/austin-wintory/</loc>(.*?)</url>`))?.[1] as string;
    expect([...entry.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`)).toEqual(head);
  });
});
