import { expect, test } from "@playwright/test";

test.describe("root redirect", () => {
  test.use({ locale: "zh-TW" });

  test("PROD-5 / sends the visitor to the best match for the browser language", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/zh-hant/");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  });

  test("PROD-5 / prefers the remembered choice over the browser language", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("mka:locale", "pt-br"));
    await page.goto("/");
    await expect(page).toHaveURL("/pt-br/");
  });
});

test.describe("root without a match", () => {
  test.use({ locale: "ar-EG" });

  test("PROD-5 / falls back to English", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/en/");
  });
});

test("PROD-2 the language picker opens the same page in another locale and remembers it", async ({ page }) => {
  await page.goto("/en/artists/");
  await page.getByRole("group").locator("summary").click();
  await page.getByRole("link", { name: "简体中文" }).click();
  await expect(page).toHaveURL("/zh-hans/artists/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("艺术家");
  expect(await page.evaluate(() => localStorage.getItem("mka:locale"))).toBe("zh-hans");
});

test("PROD-29 every page links all 28 locales plus x-default", async ({ page }) => {
  await page.goto("/de/");
  const alternates = page.locator('head link[rel="alternate"][hreflang]');
  await expect(alternates).toHaveCount(29);
  await expect(page.locator('head link[hreflang="x-default"]')).toHaveAttribute(
    "href",
    "https://musickitarchive.com/en/",
  );
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute("href", "https://musickitarchive.com/de/");
});

test("unknown paths get the not-found page of their locale with status 404", async ({ page }) => {
  const localized = await page.goto("/zh-hans/no-such-page/");
  expect(localized?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("找不到页面");

  const unprefixed = await page.goto("/no-such-page");
  expect(unprefixed?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("PROD-1 the page body never scrolls sideways at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Long one-word titles and box names (ru, bg, fi) are the tightest fits.
  for (const path of ["/en/", "/de/artists/", "/zh-hans/", "/ru/artists/", "/bg/artists/", "/fi/kits/desert-fire/"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("PROD-2 PROD-12 switching language keeps the selected kit and the kit an artist page came from", async ({
  page,
}) => {
  await page.goto("/en/#bachram");
  await page.getByRole("group").locator("summary").click();
  await page.getByRole("link", { name: "Deutsch" }).click();
  await expect(page).toHaveURL("/de/#bachram");
  await page.goto("/en/artists/austin-wintory/?from=desert-fire");
  await page.getByRole("group").locator("summary").click();
  await page.getByRole("link", { name: "Deutsch" }).click();
  await expect(page).toHaveURL("/de/artists/austin-wintory/?from=desert-fire");
});

test("PROD-29 og:locale is language_TERRITORY for script and region tags", async ({ page }) => {
  await page.goto("/zh-hans/");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "zh_CN");
  await page.goto("/pt-br/");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");
});
