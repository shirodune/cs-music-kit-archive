import { expect, test } from "@playwright/test";

const repository = "https://github.com/shirodune/cs-music-kit-archive";

test.describe("header and about page", () => {
  test("PROD-2 the header has the site name, Records, Artists, About, the language picker and GitHub", async ({
    page,
  }) => {
    await page.goto("/de/artists/");
    const header = page.locator("body > header");
    await expect(header.getByRole("link", { name: "CS MUSIC KIT ARCHIVE" })).toHaveAttribute("href", "/de/");
    const nav = header.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Über" })).toHaveAttribute("href", "/de/about/");
    await expect(nav.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", repository);
  });

  test("PROD-38 the about page says what the site is, where the data comes from and links to the code", async ({
    page,
  }) => {
    await page.goto("/en/about/");
    await expect(page).toHaveTitle("About · CS Music Kit Archive");
    await expect(page.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("region", { name: "Where it comes from" })).toContainText("release notes");
    const source = page.getByRole("region", { name: "Open source" });
    await expect(source.getByRole("link", { name: "Report a mistake" })).toHaveAttribute(
      "href",
      `${repository}/issues`,
    );
    await expect(source.getByRole("link", { name: "Source code" })).toHaveAttribute("href", repository);
  });
});
