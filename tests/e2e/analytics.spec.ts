import { expect, test } from "@playwright/test";

const BEACON = "https://static.cloudflareinsights.com/beacon.min.js";

test("PROD-37 Web Analytics loads only on the production host", async ({ page, baseURL }) => {
  const requested: string[] = [];
  await page.route("https://static.cloudflareinsights.com/**", (route) => {
    requested.push(route.request().url());
    return route.fulfill({ body: "", contentType: "text/javascript" });
  });

  await page.goto("/en/");
  await expect(page.locator("script[data-cf-beacon]")).toHaveCount(0);

  // Serve the built site under the production host name.
  await page.route("https://musickitarchive.com/**", async (route) => {
    const { pathname, search } = new URL(route.request().url());
    await route.fulfill({ response: await page.request.fetch(new URL(pathname + search, baseURL).href) });
  });
  await page.goto("https://musickitarchive.com/en/");
  await expect(page.locator("script[data-cf-beacon]")).toHaveAttribute("data-cf-beacon", /"token"/);
  await expect.poll(() => requested).toEqual([BEACON]);
});
