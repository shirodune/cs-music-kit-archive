import { expect, test } from "@playwright/test";

test.describe("artists index", () => {
  test("PROD-16 three groups: more than one kit, one kit each by year, games and official", async ({ page }) => {
    await page.goto("/en/artists/");
    const multiple = page.getByRole("region", { name: "More than one kit" });
    const single = page.getByRole("region", { name: "One kit each" });
    const brands = page.getByRole("region", { name: "Games and official" });

    // Most kits first, then by name.
    await expect(multiple.getByRole("listitem").first()).toContainText("Daniel Sadowski");
    await expect(multiple.getByRole("listitem").nth(1)).toContainText("Austin Wintory");
    await expect(multiple.getByText("Valve", { exact: true })).toHaveCount(0);

    await expect(single.getByRole("heading", { name: "2014", exact: true })).toBeVisible();
    await expect(single.getByRole("region", { name: "2014" })).toContainText("Noisia");

    await expect(brands.getByRole("listitem")).toHaveCount(5);
    await expect(brands.getByRole("listitem").first()).toContainText("Valve");
  });

  test("PROD-17 an entry shows name, active years, number of kits and titles", async ({ page }) => {
    await page.goto("/en/artists/");
    const entry = page.getByRole("link", { name: /^Austin Wintory:/ });
    await expect(entry).toContainText("2014–2024 · 4 kits");
    await expect(entry).toContainText("Desert Fire");
    await expect(entry.locator("img")).toHaveCount(4);
  });

  test("PROD-17 the titles of an entry are separated in every locale", async ({ page }) => {
    // Intl "unit" lists run titles together in Chinese ("Desert FireBachram").
    await page.goto("/zh-hans/artists/");
    const entry = page.getByRole("link", { name: /^Austin Wintory：/ });
    await expect(entry).toContainText("、");
  });
});

test.describe("artist page", () => {
  test("PROD-18 facts card marks the most kits of any artist", async ({ page }) => {
    await page.goto("/en/artists/daniel-sadowski/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Daniel Sadowski");
    await expect(page.getByText("5 kits · the most of anyone")).toBeVisible();
    await expect(page.getByText("2014–2024")).toBeVisible();
  });

  test("PROD-19 discography in release order with a divider for gaps of 3 years or more", async ({ page }) => {
    await page.goto("/en/artists/daniel-sadowski/");
    const titles = page.getByRole("region", { name: "Music kits" }).getByRole("heading", { level: 3 });
    await expect(titles).toHaveText([
      "Crimson Assault →",
      "Total Domination →",
      "The 8-Bit Kit →",
      "Eye of the Dragon →",
      "Dead Shot →",
    ]);
    await expect(page.getByText("5 years later")).toBeVisible();
    await expect(page.getByText("4 years later")).toBeVisible();
  });

  test("PROD-19 collaborators are linked", async ({ page }) => {
    await page.goto("/en/artists/tree-adams/");
    await expect(page.getByRole("link", { name: "Ben Bromfield" })).toHaveAttribute(
      "href",
      "/en/artists/ben-bromfield/",
    );
  });

  test("PROD-20 MusicBrainz links, the official site translated and service names as they are", async ({ page }) => {
    await page.goto("/zh-hans/artists/austin-wintory/");
    const links = page.getByRole("navigation", { name: "链接" }).getByRole("link");
    await expect(links.first()).toHaveAccessibleName("官方网站");
    await expect(links.last()).toHaveAccessibleName("MusicBrainz");
    await expect(links.last()).toHaveAttribute(
      "href",
      "https://musicbrainz.org/artist/78f15956-c5e1-46d6-a46b-fa6f46681ec8",
    );
    await expect(links.filter({ hasText: "Spotify" })).toHaveCount(1);

    await page.goto("/en/artists/halo/");
    await expect(page.getByRole("navigation", { name: "Links" })).toHaveCount(0);
  });

  test("PROD-21 the back link returns to the kit the visitor came from", async ({ page }) => {
    await page.goto("/en/kits/eye-of-the-dragon/");
    await page
      .getByRole("link", { name: /Daniel Sadowski/ })
      .first()
      .click();
    await expect(page).toHaveURL("/en/artists/daniel-sadowski/?from=eye-of-the-dragon");
    const back = page.getByRole("link", { name: "← Eye of the Dragon" });
    await expect(back).toHaveAttribute("href", "/en/kits/eye-of-the-dragon/");

    await page.goto("/en/artists/daniel-sadowski/");
    await expect(page.getByRole("link", { name: "← All artists" })).toHaveAttribute("href", "/en/artists/");
  });

  test("PROD-1 artist pages do not scroll sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/en/artists/", "/en/artists/twerl-ekko-sidetrack/", "/zh-hans/artists/daniel-sadowski/"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
