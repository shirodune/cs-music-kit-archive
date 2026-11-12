import { describe, expect, test } from "vitest";
import { changedKeys, type Manifest, nearestBitrate, wantedFiles } from "../../scripts/audio/lib.ts";

const entry = (sha256: string) => ({ bytes: 1, sha256, durationSec: 1, stored: "mp3" as const });

describe("audio scripts", () => {
  test("DATA-20 DATA-6 every track is wanted once, keyed {internalName}/{file}.mp3, the alternate set from its own folder", () => {
    const files = wantedFiles([
      {
        internalName: "valve_01",
        tracks: [{ file: "mainmenu" }, { file: "startround_01" }, { file: "startround_01" }],
        alternateTracks: [{ file: "mainmenu" }],
        alternateInternalName: "valve_02",
      },
      {
        internalName: "austinwintory_01",
        tracks: [{ file: "mainmenu" }],
        alternateTracks: null,
        alternateInternalName: null,
      },
    ]);
    expect(files.map((f) => f.key)).toEqual([
      "austinwintory_01/mainmenu.mp3",
      "valve_01/mainmenu.mp3",
      "valve_01/startround_01.mp3",
      "valve_02/mainmenu.mp3",
    ]);
  });

  test("DATA-21 only new or changed files are uploaded again", () => {
    const previous: Manifest = { "a/x.mp3": entry("1"), "a/y.mp3": entry("2") };
    const next: Manifest = { "a/x.mp3": entry("1"), "a/y.mp3": entry("3"), "b/z.mp3": entry("4") };
    expect(changedKeys(previous, next)).toEqual(["a/y.mp3", "b/z.mp3"]);
  });

  test("DATA-20b PCM files are encoded at the standard bitrate nearest to the kit's main menu track", () => {
    expect(nearestBitrate(128_000)).toBe(128);
    expect(nearestBitrate(127_430)).toBe(128);
    expect(nearestBitrate(158_900)).toBe(160);
    expect(nearestBitrate(256_012)).toBe(256);
  });
});
