import { describe, expect, test } from "vitest";
import {
  coverNeedsExtraction,
  coverTextures,
  isRecorded,
  pruneRecord,
  recordOf,
} from "../../scripts/game/extracted.ts";
import type { VpkEntry } from "../../scripts/game/vpk.ts";

const entry = (crc: number, length = 10): VpkEntry => ({
  crc,
  archive: 1,
  offset: 0,
  length,
  preload: Buffer.alloc(2),
});

describe("record of extracted game files", () => {
  test("DATA-26 a game file is recorded as GameTracking's VPK listing writes it", () => {
    expect(recordOf(entry(0x50b94538))).toEqual({ crc: "0050b94538", bytes: 12 });
    const record = { "a.vsnd_c": recordOf(entry(0x50b94538)) };
    expect(isRecorded("a.vsnd_c", entry(0x50b94538), record)).toBe(true);
    expect(isRecorded("a.vsnd_c", entry(1), record)).toBe(false);
    expect(isRecorded("b.vsnd_c", entry(0x50b94538), record)).toBe(false);
  });

  test("DATA-19 a kit's cover is made from the mp3_screen_color textures in its folder, renamed for one kit", () => {
    const base = "materials/models/inventory_items/music_kit";
    const vpk = new Map<string, VpkEntry>([
      [`${base}/noisia_01/mp3_screen_color_psd_b.vtex_c`, entry(1)],
      [`${base}/noisia_01/mp3_screen_color_psd_a.vtex_c`, entry(2)],
      [`${base}/noisia_01/mp3_detail_color_psd_c.vtex_c`, entry(3)],
      [`${base}/midnight_riders_01/mp3_screen_color_psd_d.vtex_c`, entry(4)],
    ]);
    expect(coverTextures(vpk, "noisia_01").map(([path]) => path.split("/").pop())).toEqual([
      "mp3_screen_color_psd_a.vtex_c",
      "mp3_screen_color_psd_b.vtex_c",
    ]);
    expect(coverTextures(vpk, "midnightriders_01")).toHaveLength(1);
  });

  test("DATA-26 a cover is read again when it is not stored or one of its textures changed", () => {
    const files: [string, VpkEntry][] = [
      ["x/a.vtex_c", entry(1)],
      ["x/b.vtex_c", entry(2)],
    ];
    const record = { "x/a.vtex_c": recordOf(entry(1)), "x/b.vtex_c": recordOf(entry(2)) };
    expect(coverNeedsExtraction(files, true, record)).toBe(false);
    expect(coverNeedsExtraction(files, false, record)).toBe(true);
    expect(coverNeedsExtraction(files, true, { "x/a.vtex_c": recordOf(entry(1)) })).toBe(true);
  });

  test("DATA-26 files gone from the game drop out of the record, such as a recompiled texture's old name", () => {
    const record = { "old_15a5ebc9.vtex_c": recordOf(entry(1)), "kept.vsnd_c": recordOf(entry(2)) };
    const vpk = new Map([
      ["kept.vsnd_c", entry(2)],
      ["new_9266f3b6.vtex_c", entry(3)],
    ]);
    expect(pruneRecord(record, vpk)).toEqual({ "kept.vsnd_c": recordOf(entry(2)) });
  });
});
