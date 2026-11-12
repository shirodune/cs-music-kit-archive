import { expect, type Page, test } from "@playwright/test";

// The fonts the browser actually used for an element, from the DevTools protocol (Chromium only).
async function usedFonts(page: Page, selector: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  return fonts.map((f) => (f.isCustomFont ? f.familyName : `system:${f.familyName}`));
}

async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

test.describe("fonts", () => {
  test.skip(({ isMobile }) => isMobile, "same fonts on every device");

  test("I18N-19 a page links only its own script group's font stylesheet", async ({ page, request }) => {
    const fontSheets = () =>
      page
        .locator('link[rel="stylesheet"][href^="/fonts/"]')
        .evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    await page.goto("/en/kits/desert-fire/");
    expect(await fontSheets()).toEqual([]);
    await page.goto("/ru/kits/desert-fire/");
    expect(await fontSheets()).toEqual(["/fonts/cyrillic.css"]);
    await page.goto("/zh-hans/kits/desert-fire/");
    expect(await fontSheets()).toEqual(["/fonts/zh-hans.css"]);

    const css = await (await request.get("/fonts/zh-hans.css")).text();
    expect(css).toContain("Noto Sans SC");
    expect(css).toContain("unicode-range");
    expect(css).toContain("--font-noto-sans-sc-900");
  });

  test("I18N-19 Chinese text uses Noto Sans SC and Latin text keeps the design faces", async ({ page }) => {
    await open(page, "/zh-hans/kits/desert-fire/");
    // "沙漠之焰"
    expect((await usedFonts(page, "h1")).join()).toMatch(/^Noto Sans SC/);
    // "Austin Wintory →": the name in the design face (the arrow is not in its Latin subset).
    expect(await usedFonts(page, 'a[href^="/zh-hans/artists/austin-wintory/"]')).toContain("IBM Plex Mono");
  });

  test("I18N-19 Cyrillic text uses Tektur, Sofia Sans Condensed and IBM Plex Sans", async ({ page }) => {
    await open(page, "/ru/kits/desert-fire/");
    // Stencil section head "Список треков".
    const heading = await usedFonts(page, "#tracks-h");
    expect(heading.some((f) => f.startsWith("Tektur"))).toBe(true);
    expect(heading.filter((f) => f.startsWith("system:"))).toEqual([]);
    await open(page, "/ru/artists/austin-wintory/");
    const description = "main article p.text-\\[17px\\]";
    expect(await usedFonts(page, description)).toContain("IBM Plex Sans");
    await open(page, "/ru/");
    const rackDescription = "main p.font-condensed";
    const fonts = await usedFonts(page, rackDescription);
    expect(fonts).toContain("Sofia Sans Condensed");
    expect(fonts.filter((f) => f.startsWith("system:"))).toEqual([]);
  });
});
