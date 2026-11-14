import { expect, type Page, test } from "@playwright/test";

/** A silent PCM WAV file, so tests never fetch the real audio host. */
function silentWav(seconds: number): Buffer {
  const rate = 8000;
  const data = rate * seconds * 2;
  const wav = Buffer.alloc(44 + data);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + data, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(data, 40);
  return wav;
}

async function serveAudio(page: Page, status = 200): Promise<string[]> {
  const requested: string[] = [];
  const body = silentWav(20);
  await page.route("https://audio.musickitarchive.com/**", (route) => {
    requested.push(route.request().url());
    if (status !== 200) return route.fulfill({ status, body: "Not found" });
    // Answer range requests as R2 does, so the browser can seek.
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? "");
    if (!range) return route.fulfill({ status, contentType: "audio/wav", body, headers: { "Accept-Ranges": "bytes" } });
    const start = Number(range[1]);
    const end = range[2] ? Number(range[2]) : body.length - 1;
    return route.fulfill({
      status: 206,
      contentType: "audio/wav",
      body: body.subarray(start, end + 1),
      headers: { "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${body.length}` },
    });
  });
  return requested;
}

const play = (page: Page, track: string) => page.getByRole("button", { name: `Play ${track}`, exact: true });
const status = (page: Page) => page.getByRole("status");

test.describe("record page player", () => {
  test("PROD-24 nothing loads before a click, and one track plays at a time", async ({ page }) => {
    const requested = await serveAudio(page);
    await page.goto("/en/kits/desert-fire/");
    await expect(play(page, "Main menu")).toHaveAttribute("aria-pressed", "false");
    expect(requested).toEqual([]);

    await play(page, "Main menu").click();
    await expect(play(page, "Main menu")).toHaveAttribute("aria-pressed", "true");
    await expect(status(page)).toHaveText("Now playing · Main menu");
    expect(requested[0]).toBe("https://audio.musickitarchive.com/austinwintory_01/mainmenu.mp3");

    await play(page, "Choose team").click();
    await expect(play(page, "Choose team")).toHaveAttribute("aria-pressed", "true");
    await expect(play(page, "Main menu")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("slider", { name: "Position in Main menu" })).toBeHidden();
    await expect(status(page)).toHaveText("Now playing · Choose team");

    await play(page, "Choose team").click();
    await expect(play(page, "Choose team")).toHaveAttribute("aria-pressed", "false");
    await expect(status(page)).toHaveText("Paused · Choose team");
  });

  test("the playing row shows elapsed and total time, and the slider seeks", async ({ page }) => {
    await serveAudio(page);
    await page.goto("/en/kits/desert-fire/");
    await play(page, "Main menu").click();
    const row = page.locator("[data-track]").filter({ has: play(page, "Main menu") });
    await expect(row.locator("[data-time]")).toHaveText(/^0:0\d \/ 0:20$/);

    await play(page, "Main menu").click();
    await page.getByRole("slider", { name: "Position in Main menu" }).fill("12");
    await expect(row.locator("[data-time]")).toHaveText("0:12 / 0:20");
    await expect(page.getByRole("slider", { name: "Position in Main menu" })).toHaveAttribute(
      "aria-valuetext",
      "0:12 / 0:20",
    );
  });

  test("PROD-23a matching match start and end files are one row", async ({ page }) => {
    await page.goto("/en/kits/desert-fire/");
    const tracks = page.getByRole("region", { name: "Tracklist" }).getByRole("listitem");
    await expect(tracks.filter({ hasText: "Match start and end" })).toHaveCount(1);
    await expect(tracks.filter({ hasText: /^Match end$/ })).toHaveCount(0);
    await expect(play(page, "Match start and end")).toBeVisible();
  });

  test("PROD-24 the MVP button plays the kit's MVP anthem", async ({ page }) => {
    const requested = await serveAudio(page);
    await page.goto("/en/kits/desert-fire/");
    const mvp = page.getByRole("button", { name: "Play the MVP anthem" });
    await mvp.click();
    await expect(mvp).toHaveAttribute("aria-pressed", "true");
    await expect(play(page, "MVP anthem")).toHaveAttribute("aria-pressed", "true");
    expect(requested[0]).toBe("https://audio.musickitarchive.com/austinwintory_01/roundmvpanthem_01.mp3");
    await mvp.click();
    await expect(mvp).toHaveAttribute("aria-pressed", "false");
  });

  test("DATA-19 the drawn disc of a texture cover slides out while a track plays", async ({ page }) => {
    await serveAudio(page);
    await page.goto("/en/kits/desert-fire/");
    const hero = page.locator("[data-player]");
    await expect(hero.locator(".record .record-disc")).toHaveCount(1);
    await expect(hero).not.toHaveAttribute("data-playing");
    await play(page, "Main menu").click();
    await expect(hero).toHaveAttribute("data-playing", "");
    await play(page, "Main menu").click();
    await expect(hero).not.toHaveAttribute("data-playing");
  });

  test("a file that cannot load gives a clear message", async ({ page }) => {
    await serveAudio(page, 404);
    await page.goto("/en/kits/desert-fire/");
    await play(page, "Main menu").click();
    await expect(status(page)).toHaveText("The audio could not load");
    await expect(play(page, "Main menu")).toHaveAttribute("aria-pressed", "false");
  });

  test("PROD-26 every play button points at the audio host, MP3 or WAV as stored", async ({ page }) => {
    await page.goto("/en/kits/desert-fire/");
    const sources = await page.locator("[data-track]").evaluateAll((rows) => rows.map((r) => r.dataset.src));
    expect(sources.length).toBeGreaterThan(10);
    for (const src of sources)
      expect(src).toMatch(/^https:\/\/audio\.musickitarchive\.com\/[a-z0-9_]+\/[a-z0-9_]+\.(mp3|wav)$/);
    expect(sources).toContain("https://audio.musickitarchive.com/austinwintory_01/startofmatch.wav");
  });
});
