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

  test("PROD-8 after a drag that ends off a sleeve, the next click on a sleeve still selects it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/#bachram");
    const box = await rack(page).boundingBox();
    if (!box) throw new Error("no rack");
    // Drag along the top edge of the stage, above the sleeves, so the release lands on no sleeve.
    const y = box.y + 8;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, y, { steps: 5 });
    await page.mouse.up();
    // Back to Bachram without reloading, so the rack keeps its state, then click the same neighbour as above.
    await page.evaluate(() => {
      location.hash = "#bachram";
    });
    await expect(card(page).getByRole("heading")).toHaveText("Bachram");
    await page.getByRole("button", { name: "Go to Anti-Citizen" }).click();
    await expect(page).toHaveURL(/#anti-citizen$/);
  });

  test("PROD-13 with reduced motion the rack moves at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/#bachram");
    await rack(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect(card(page).getByRole("heading")).not.toHaveText("Bachram", { timeout: 200 });
  });
  test("PROD-36 the rack keeps its layout when the island hydrates", async ({ page, browser }) => {
    const boxes = (p: Page) =>
      rack(p)
        .locator("img")
        .evaluateAll((imgs) => imgs.map((img) => img.getBoundingClientRect().toJSON()));
    // The server-rendered rack before hydration: scripts are blocked, so the island never runs.
    const viewport = page.viewportSize();
    const staticPage = await (await browser.newContext({ viewport })).newPage();
    await staticPage.route("**/_astro/*.js", (route) => route.abort());
    await staticPage.goto("/en/");
    await page.goto("/en/");
    await expect(page.locator("astro-island:not([ssr])")).toHaveCount(1);
    expect(await boxes(page)).toEqual(await boxes(staticPage));
  });
});

test.describe("records page fits the screen", () => {
  test("PROD-13a the page does not scroll and the one-line footer is on screen", async ({ page }) => {
    await page.goto("/en/");
    await expect(rack(page).locator("img").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(
      0,
    );
    const footer = page.locator("footer");
    await expect(footer).toBeInViewport({ ratio: 1 });
    await expect(footer).toHaveText(/^Unofficial fan project\. Not affiliated with or endorsed by Valve\./);
  });

  test("PROD-13a on a screen too short for the page, it scrolls instead of overlapping", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 560 });
    await page.goto("/en/");
    const open = await page.getByRole("link", { name: "Open the record", exact: true }).boundingBox();
    const footer = await page.locator("footer").boundingBox();
    expect((open?.y ?? 0) + (open?.height ?? 0)).toBeLessThanOrEqual(footer?.y ?? 0);
  });

  test("PROD-13a every gesture on the rack moves the rack, not the page", async ({ page }) => {
    await page.goto("/en/");
    await expect(rack(page)).toHaveCSS("touch-action", "none");
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
