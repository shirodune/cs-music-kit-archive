import { describe, expect, test } from "vitest";
import { candidates, kitTerms, pacificDate, type SteamEvent, sentencesOf } from "../../scripts/data/release-notes.ts";

/** 2026-09-22 10:00 US Pacific time, plus some days. */
const day = (offset: number) => Date.UTC(2026, 8, 22, 17) / 1000 + offset * 86400;

const event = (
  gid: string,
  type: number,
  offset: number,
  body: string,
  name = "Counter-Strike 2 Update",
): SteamEvent => ({
  gid,
  event_name: name,
  event_type: type,
  announcement_body: { posttime: day(offset), body },
});

describe("data:suggest-release", () => {
  test("DATA-13 an event's day is its US Pacific date", () => {
    expect(pacificDate(day(0))).toBe("2026-09-22");
    // 2026-09-23 03:00 UTC is still the evening of the 22nd in California.
    expect(pacificDate(Date.UTC(2026, 8, 23, 3) / 1000)).toBe("2026-09-22");
  });

  test("DATA-14b quotes are sentences of the post, BBCode removed", () => {
    const body =
      "[p]\\[ MISC ][/p][list][*][p]Added stickers to C4.[/p][/*][*][p]The Starjunk 95, Industrial Sunset Memories Music Kit is now available.[/p][/*][/list]\n[h3]Starjunk 95[/h3]\n[img]https://example.com/a.png[/img]\nThere's a new Music Kit in town. Experience it now!";
    expect(sentencesOf(body)).toEqual([
      "[ MISC ]",
      "Added stickers to C4.",
      "The Starjunk 95, Industrial Sunset Memories Music Kit is now available.",
      "Starjunk 95",
      "There's a new Music Kit in town.",
      "Experience it now!",
    ]);
  });

  test("DATA-14 a kit is searched by its name, credit, title and box", () => {
    expect(kitTerms("Starjunk 95, Industrial Sunset Memories")).toEqual([
      "Starjunk 95, Industrial Sunset Memories",
      "Industrial Sunset Memories",
      "Starjunk 95",
    ]);
    expect(kitTerms("HEALTH, RAT WARS", "Deluge Music Kit Box")).toEqual([
      "HEALTH, RAT WARS",
      "RAT WARS",
      "HEALTH",
      "Deluge Music Kit Box",
      "Deluge",
    ]);
  });

  test("DATA-14 release notes come first, then the oldest post; words match whole and in Valve's case", () => {
    const events = [
      event("4", 12, 9, "[list][*]Fixed issue where the HEALTH music kit would loop.[/*][/list]"),
      event("3", 13, 0, "Today we are releasing the Deluge Music Kit Box.", "Tonight's Forecast"),
      event("2", 12, 0, "[list][*]Deluge Music Kit Box is now available.[/*][*]Fixed a bug.[/*][/list]"),
      event("1", 12, 1, "[list][*]The health preview now shows.[/*][/list]"),
    ];
    const found = candidates(events, kitTerms("HEALTH, RAT WARS", "Deluge Music Kit Box"));
    expect(found.map((c) => [c.url.split("/").at(-1), c.date, c.quotes])).toEqual([
      ["2", "2026-09-22", ["Deluge Music Kit Box is now available."]],
      ["4", "2026-10-01", ["Fixed issue where the HEALTH music kit would loop."]],
      ["3", "2026-09-22", ["Today we are releasing the Deluge Music Kit Box."]],
    ]);
  });

  test("DATA-14 the release notes of that day are included when they name only the collection", () => {
    const events = [
      event("2", 12, 0, "[p]\\[ MUSIC KITS ][/p][list][*]NIGHTMODE II Music Kits are now available.[/*][/list]"),
      event("1", 13, 0, "[p]ALRT, DOPAMINE HIT[/p]", "NIGHTMODE II Music Kits"),
    ];
    const found = candidates(events, kitTerms("ALRT, DOPAMINE HIT"));
    expect(found.map((c) => c.quotes)).toEqual([
      ["NIGHTMODE II Music Kits are now available."],
      ["ALRT, DOPAMINE HIT"],
    ]);
  });

  test("DATA-14 a kit with no usable term matches nothing", () => {
    expect(candidates([event("1", 12, 0, "[p]Fixed a bug.[/p]")], [])).toEqual([]);
  });
});
