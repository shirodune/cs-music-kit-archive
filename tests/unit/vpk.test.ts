import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { archivePath, crc32, parseVpkDir, readVpkDir, readVpkFile } from "../../scripts/game/vpk.ts";

/** A version 2 VPK directory with the given files: `[path, bytes, archive, offset, preload bytes]`. */
function vpkDir(files: [string, Buffer, number, number, number][]): Buffer {
  const parts: Buffer[] = [];
  const text = (s: string) => parts.push(Buffer.from(`${s}\0`, "utf8"));
  for (const [path, data, archive, offset, preload] of files) {
    const slash = path.lastIndexOf("/");
    const dot = path.lastIndexOf(".");
    text(path.slice(dot + 1));
    text(path.slice(0, slash));
    text(path.slice(slash + 1, dot));
    const entry = Buffer.alloc(18);
    entry.writeUInt32LE(crc32(data), 0);
    entry.writeUInt16LE(preload, 4);
    entry.writeUInt16LE(archive, 6);
    entry.writeUInt32LE(offset, 8);
    entry.writeUInt32LE(data.length - preload, 12);
    entry.writeUInt16LE(0xffff, 16);
    parts.push(entry, data.subarray(0, preload));
    text("");
    text("");
  }
  text("");
  const tree = Buffer.concat(parts);
  const header = Buffer.alloc(28);
  header.writeUInt32LE(0x55aa1234, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(tree.length, 8);
  return Buffer.concat([header, tree]);
}

describe("VPK reader", () => {
  test("DATA-20 crc32 is the standard CRC-32 the VPK directory records", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });

  test("DATA-20 files are read from their numbered archive, preload bytes first, and checked against the CRC", async () => {
    const sound = Buffer.from("preload+body of the sound");
    const folder = await mkdtemp(join(tmpdir(), "vpk-"));
    try {
      const dirFile = join(folder, "pak01_dir.vpk");
      await writeFile(dirFile, vpkDir([["sounds/music/a/x.vsnd_c", sound, 3, 4, 8]]));
      await writeFile(join(folder, "pak01_003.vpk"), Buffer.concat([Buffer.from("...."), sound.subarray(8)]));
      const entries = await readVpkDir(dirFile);
      const entry = entries.get("sounds/music/a/x.vsnd_c");
      expect(entry && archivePath(dirFile, entry)).toBe(join(folder, "pak01_003.vpk"));
      expect(entry && (await readVpkFile(dirFile, entry))).toEqual(sound);
      await writeFile(
        join(folder, "pak01_003.vpk"),
        Buffer.concat([Buffer.from("...."), Buffer.from("changed!body of the sound")]),
      );
      await expect(entry && readVpkFile(dirFile, entry)).rejects.toThrow("CRC mismatch");
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });

  test("DATA-20 a directory that is not VPK version 2 is refused", () => {
    expect(() => parseVpkDir(Buffer.alloc(28))).toThrow("not a version 2 VPK directory");
  });
});
