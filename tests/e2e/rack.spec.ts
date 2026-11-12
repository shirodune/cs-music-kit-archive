import { expect, type Page, test } from "@playwright/test";

const card = (page: Page) => page.getByRole("region", { name: "Record label" });
const rack = (page: Page) => page.getByRole("region", { name: /^Records rack/ });

test.describe("records rack", () => {
  test("PROD-7 PROD-12 the newest kit is selected and kept in the URL hash", async ({ page }) => {
    await page.goto("/en/");
    await expect(card(page).getByRole("heading")).toHaveText("Industrial Sunset Memories");
    await expect(page).toHaveURL("/en/");
    await rack(page).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/\/en\/#[a-z0-9-]+$/);
  });

  test("PROD-9 the label card shows date, batch, catalogue number, edition and a linked artist", async ({ page }) => {
    await page.goto("/en/#bachram");
    const label = card(page);
    await expect(label.getByRole("heading")).toHaveText("Bachram");
    await expect(label).toContainText("Apr 16, 2020");
    await expect(label).toContainText("Masterminds Music Kit Box");
    await expect(label).toContainText("Nº 043");
    await expect(label).toContainText("Standard and StatTrak™");
    await expect(label.getByRole("link", { name: "Austin Wintory" })).toHaveAttribute(
      "href",
      "/en/artists/austin-wintory/?from=bachram",
    );
    await expect(label.getByRole("link", { name: "Bachram" })).toHaveAttribute("href", "/en/kits/bachram/");
  });

  test("PROD-11 keyboard: arrows browse, Page Up jumps to the year's first kit, Enter opens it", async ({ page }) => {
    await page.goto("/en/#bachram");
    await rack(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).not.toHaveURL(/#bachram$/);
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/#bachram$/);
    // Bachram (April 2020) → the first 2020 kit → the first 2019 kit.
    await page.keyboard.press("PageUp");
    await expect(page).toHaveURL(/#anti-citizen$/);
    await page.keyboard.press("PageUp");
    await expect(page).toHaveURL(/#ez4ence$/);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/en/kits/ez4ence/");
  });

  test("PROD-10 a year button jumps to that year's first kit", async ({ page }) => {
    await page.goto("/en/");
    await page.getByRole("button", { name: "2014, 10 kits" }).click({ force: true });
    await expect(page).toHaveURL("/en/#crimson-assault");
  });

  test("PROD-12 the back button returns to the same kit", async ({ page }) => {
    await page.goto("/en/#desert-fire");
    await card(page).getByRole("link", { name: "Desert Fire" }).click();
    await expect(page).toHaveURL("/en/kits/desert-fire/");
    await page.goBack();
    await expect(card(page).getByRole("heading")).toHaveText("Desert Fire");
  });

  test("PROD-8 clicking a neighbouring sleeve selects it", async ({ page }) => {
    await page.goto("/en/#bachram");
    await page.getByRole("button", { name: "Go to Anti-Citizen" }).click();
    await expect(page).toHaveURL(/#anti-citizen$/);
    await expect(rack(page).getByRole("link", { name: /^Anti-Citizen by/ })).toBeVisible();
  });

  test("PROD-13 with reduced motion the rack moves at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/#bachram");
    await rack(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect(card(page).getByRole("heading")).not.toHaveText("Bachram", { timeout: 200 });
  });
});

test.describe("records without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("PROD-5 every kit is still reachable as a plain list", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.getByRole("link", { name: "Desert Fire", exact: true }).first()).toHaveAttribute(
      "href",
      "/en/kits/desert-fire/",
    );
  });
});
