import { expect, test } from "@playwright/test";
import { LOCALES } from "../../src/i18n/locales.ts";

const repository = "https://github.com/shirodune/cs-music-kit-archive";

test.describe("every page", () => {
  test("PROD-4 the footer has the disclaimer, data credits and links; the records page has the one-line version", async ({
    page,
  }) => {
    await page.goto("/en/artists/");
    const footer = page.locator("body > footer");
    await expect(footer).toContainText("Not affiliated with Valve.");
    await expect(footer).toContainText("belong to Valve and the respective artists.");
    await expect(footer).toContainText("MusicBrainz");
    await expect(footer.getByRole("link", { name: "Source code" })).toHaveAttribute("href", repository);
    await expect(footer.getByRole("link", { name: "Licences" })).toHaveAttribute(
      "href",
      `${repository}/blob/main/NOTICE`,
    );
    await expect(footer).not.toContainText("@");

    await page.goto("/en/");
    const short = page.locator("body > footer");
    await expect(short).toContainText("Not affiliated with Valve.");
    await expect(short).not.toContainText("respective artists");
    await expect(short.getByRole("link")).toHaveCount(2);
  });

  test("PROD-6 I18N-3 every route starts with its locale and keeps the same slug in every locale", async ({ page }) => {
    await page.goto("/ru/kits/desert-fire/");
    const alternates = await page
      .locator('link[rel="alternate"][hreflang]:not([hreflang="x-default"])')
      .evaluateAll((links) => links.map((l) => new URL((l as HTMLLinkElement).href).pathname));
    expect(alternates.sort()).toEqual(LOCALES.map((l) => `/${l.segment}/kits/desert-fire/`).sort());
    const internal = await page
      .locator('a[href^="/"]:not(.language-picker a)')
      .evaluateAll((links) => links.map((l) => l.getAttribute("href") ?? ""));
    for (const href of internal) expect(href, href).toMatch(/^\/ru\//);
  });

  test("uppercase comes from CSS; the text keeps its case", async ({ page }) => {
    await page.goto("/de/artists/");
    const nav = page.getByRole("navigation").getByRole("link", { name: "Künstler" });
    await expect(nav).toHaveText("Künstler");
    await expect(nav).toHaveCSS("text-transform", "uppercase");
  });

  test("fonts are never synthesised", async ({ page }) => {
    await page.goto("/zh-hans/kits/desert-fire/");
    for (const selector of ["html", "h1", "h2"])
      await expect(page.locator(selector).first()).toHaveCSS("font-synthesis", "none");
  });

  test("no message catalogue ships to the browser; the rack gets its strings as props", async ({ page }) => {
    const scripts: string[] = [];
    page.on("response", async (response) => {
      if (response.request().resourceType() === "script" && response.url().startsWith("http://127.0.0.1"))
        scripts.push(await response.text());
    });
    await page.goto("/ru/");
    await expect(page.locator("astro-island").first()).toHaveAttribute("props", /Пластинки|Годы|[А-Яа-я]/);
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) expect(script).not.toContain("footer.disclaimer");
  });

  test("DATA-19a a texture cover is drawn in the icon's 256:198 frame with the disc half out", async ({ page }) => {
    await page.goto("/en/kits/desert-fire/");
    const record = page.locator(".record").first();
    const box = await record.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.width / box.height).toBeCloseTo(256 / 198, 2);
    await expect(record.locator(".record-disc")).toHaveCount(1);
  });

  test("PROD-2 the not-found page marks no section as current", async ({ page }) => {
    await page.goto("/no-such-page/");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Records" })).not.toHaveClass(/text-signal/);
  });
});
