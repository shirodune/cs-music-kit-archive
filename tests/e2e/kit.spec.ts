import { expect, test } from "@playwright/test";

test.describe("record page", () => {
  test("PROD-14 Desert Fire shows hero facts, tracklist, description and related kits", async ({ page }) => {
    await page.goto("/en/kits/desert-fire/");
    await expect(page).toHaveTitle("Desert Fire · CS Music Kit Archive");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Desert Fire");
    await expect(page.getByRole("link", { name: /Austin Wintory/ }).first()).toHaveAttribute(
      "href",
      "/en/artists/austin-wintory/?from=desert-fire",
    );
    await expect(page.getByText("Nº 009")).toBeVisible();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://musickitarchive.com/covers/textures/austinwintory_01.png",
    );

    const tracks = page.getByRole("region", { name: "Tracklist" }).getByRole("listitem");
    await expect(tracks.first()).toContainText("Main menu");
    await expect(tracks.last()).toContainText("MVP anthem");
    await expect(tracks.filter({ hasText: "MVP anthem" })).toHaveCount(1);

    await expect(page.locator("blockquote")).toContainText("Austin Wintory");
    const moreBy = page.getByRole("region", { name: "All 4 by Austin Wintory" });
    await expect(moreBy.getByRole("listitem")).toHaveCount(4);
    await expect(moreBy.locator('a[aria-current="page"]')).toHaveAttribute("href", "/en/kits/desert-fire/");
    await expect(page.getByText("8 other records · Oct 10, 2014")).toBeVisible();

    const neighbours = page.getByRole("navigation", { name: "Previous and next record on the rack" });
    await expect(neighbours.getByRole("link")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Release Notes for 10/10/2014" })).toHaveAttribute(
      "href",
      "https://blog.counter-strike.net/2014/10/10479/",
    );
  });

  test("PROD-23 the take number shows only when a cue has several takes", async ({ page }) => {
    await page.goto("/en/kits/desert-fire/");
    const tracks = page.getByRole("region", { name: "Tracklist" }).getByRole("listitem");
    await expect(tracks.filter({ hasText: "Round start 2" })).toHaveCount(1);
    await expect(tracks.filter({ hasText: /MVP anthem \d/ })).toHaveCount(0);
  });

  test("PROD-34 a localized title shows the English title, marked as English", async ({ page }) => {
    await page.goto("/zh-hans/kits/desert-fire/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("沙漠之焰");
    await expect(page.locator('p[lang="en"]', { hasText: "Desert Fire" })).toBeVisible();
  });

  test("PROD-15 the default CS:GO kit shows the alternate set; PROD-14 empty sections are left out", async ({
    page,
  }) => {
    await page.goto("/en/kits/cs-go/");
    await expect(page.getByRole("heading", { name: "Alternate set" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Released the same day" })).toHaveCount(0);
    const neighbours = page.getByRole("navigation", { name: "Previous and next record on the rack" });
    await expect(neighbours.getByRole("link")).toHaveCount(1);
  });

  test("PROD-1 the record page does not scroll sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      "/en/kits/the-devil-went-clubbing-in-georgia/",
      "/zh-hans/kits/cs-go/",
      "/ru/kits/desert-fire/",
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("DATA-18a the page shows the WebP copy of the cover and shares the PNG", async ({ page, request }) => {
    await page.goto("/en/kits/industrial-sunset-memories/");
    const cover = page.getByRole("img", { name: /Industrial Sunset Memories music kit/ });
    expect(await cover.getAttribute("src")).toBe("/covers/textures/starjunk95_01.webp");
    const small = await request.get("/covers/textures/starjunk95_01-320.webp");
    expect(small.headers()["content-type"]).toBe("image/webp");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://musickitarchive.com/covers/textures/starjunk95_01.png",
    );
  });

  test("PROD-35 the record page loads no script files besides the language picker; the player is inline", async ({
    page,
  }) => {
    await page.goto("/en/kits/desert-fire/");
    const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
    expect(scripts.every((src) => src?.includes("LanguagePicker"))).toBe(true);
  });

  test("PROD-14 PROD-27 a kit or artist without a story or introduction leaves the section out", async ({ page }) => {
    await page.goto("/en/kits/desert-fire/");
    await expect(page.getByRole("heading", { name: "Tracklist" })).toBeVisible();
    await expect(page.locator("[data-writing]")).toHaveCount(0);
    await page.goto("/en/artists/austin-wintory/");
    await expect(page.getByRole("heading", { name: "Music kits", level: 2 })).toBeVisible();
    await expect(page.locator("[data-writing]")).toHaveCount(0);
  });
});
