import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { LOCALES } from "../../src/i18n/locales.ts";

const site = "https://musickitarchive.com";
const count = (file: string) => (JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8")) as unknown[]).length;
// Home, artists index, one page per kit and one per artist, in every locale.
const pagesPerLocale = 2 + count("../../data/generated/kits.json") + count("../../data/generated/artists.json");
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string);

test.describe("sitemap", () => {
  test("PROD-30 the sitemap lists every page in every locale", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain(`Sitemap: ${site}/sitemap-index.xml`);

    const files = locs(await (await request.get("/sitemap-index.xml")).text());
    expect(files.length).toBeGreaterThan(0);
    const urls: string[] = [];
    for (const file of files) {
      const response = await request.get(file.replace(site, ""));
      expect(response.ok(), file).toBe(true);
      const xml = await response.text();
      // Alternates live in the page head only (PROD-29).
      expect(xml).not.toContain("hreflang");
      urls.push(...locs(xml));
    }

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBe(LOCALES.length * pagesPerLocale);
    expect(urls).not.toContain(`${site}/`);
    expect(urls.filter((u) => u.includes("404"))).toEqual([]);
    for (const l of LOCALES) expect(urls).toContain(`${site}/${l.segment}/kits/desert-fire/`);
  });
});
