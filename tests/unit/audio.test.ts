import { describe, expect, test } from "vitest";
import { contentTypeOf, type Manifest, needsExtraction, uploadPlan, wantedFiles } from "../../scripts/audio/lib.ts";

const entry = (sha256: string) => ({ bytes: 1, sha256, durationSec: 1 });

describe("audio scripts", () => {
  test("DATA-20 DATA-6 every track is wanted once, by {internalName}/{file}, the alternate set from its own folder", () => {
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
    expect(files.map((f) => f.base)).toEqual([
      "austinwintory_01/mainmenu",
      "valve_01/mainmenu",
      "valve_01/startround_01",
      "valve_02/mainmenu",
    ]);
  });

  test("DATA-21 only new or changed files are uploaded; files no longer listed stay, as the live site links them", () => {
    const published: Manifest = { "a/x.mp3": entry("1"), "a/y.mp3": entry("2"), "a/old.mp3": entry("5") };
    const next: Manifest = { "a/x.mp3": entry("1"), "a/y.mp3": entry("3"), "b/z.wav": entry("4") };
    expect(uploadPlan(published, next)).toEqual(["a/y.mp3", "b/z.wav"]);
  });

  test("DATA-20 files keep the game's format: MP3 as audio/mpeg, WAV as audio/wav", () => {
    expect(contentTypeOf("valve_01/mainmenu.mp3")).toBe("audio/mpeg");
    expect(contentTypeOf("valve_01/startofmatch.wav")).toBe("audio/wav");
    expect(() => contentTypeOf("valve_01/startofmatch.ogg")).toThrow();
  });

  test("DATA-20 DATA-26 a track is read from the game again when its game file changed or it is not published", () => {
    const extracted = { "sounds/music/a/x.vsnd_c": { crc: "0050b94538" } };
    const manifest: Manifest = { "a/x.mp3": entry("1") };
    expect(needsExtraction("a/x", 0x50b94538, extracted, manifest)).toBe(false);
    expect(needsExtraction("a/x", 0x12345678, extracted, manifest)).toBe(true);
    expect(needsExtraction("a/x", 0x50b94538, extracted, {})).toBe(true);
    expect(needsExtraction("b/new", 1, extracted, manifest)).toBe(true);
  });
});
