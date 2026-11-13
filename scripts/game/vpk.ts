// Read files from the game's VPK archive (spec: DATA-20): pak01_dir.vpk holds the directory, and each file's
// bytes sit in one of the numbered archives next to it (pak01_000.vpk …), after any preload bytes kept in the
// directory itself. Only VPK version 2, which CS2 uses.

import { open, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface VpkEntry {
  crc: number;
  /** Number of the archive, pak01_{archive}.vpk, or 0x7fff for data stored in the directory file. */
  archive: number;
  offset: number;
  length: number;
  preload: Buffer;
}

const SIGNATURE = 0x55aa1234;
const HEADER_SIZE = 28;
const IN_DIRECTORY = 0x7fff;

/** Every file in a VPK directory, by its path with `/` separators. */
export function parseVpkDir(buffer: Buffer): Map<string, VpkEntry> {
  if (buffer.readUInt32LE(0) !== SIGNATURE || buffer.readUInt32LE(4) !== 2) {
    throw new Error("not a version 2 VPK directory");
  }
  const treeEnd = HEADER_SIZE + buffer.readUInt32LE(8);
  const entries = new Map<string, VpkEntry>();
  let p = HEADER_SIZE;
  const text = () => {
    const end = buffer.indexOf(0, p);
    const value = buffer.toString("utf8", p, end);
    p = end + 1;
    return value;
  };
  for (let ext = text(); ext !== ""; ext = text()) {
    for (let folder = text(); folder !== ""; folder = text()) {
      for (let name = text(); name !== ""; name = text()) {
        const preloadBytes = buffer.readUInt16LE(p + 4);
        if (buffer.readUInt16LE(p + 16) !== 0xffff) throw new Error(`VPK directory: bad entry ${folder}/${name}`);
        const archive = buffer.readUInt16LE(p + 6);
        const offset = buffer.readUInt32LE(p + 8);
        entries.set(`${folder === " " ? "" : `${folder}/`}${name}${ext === " " ? "" : `.${ext}`}`, {
          crc: buffer.readUInt32LE(p),
          archive,
          offset: archive === IN_DIRECTORY ? treeEnd + offset : offset,
          length: buffer.readUInt32LE(p + 12),
          preload: buffer.subarray(p + 18, p + 18 + preloadBytes),
        });
        p += 18 + preloadBytes;
      }
    }
  }
  if (p !== treeEnd) throw new Error("VPK directory: tree size does not match");
  return entries;
}

export async function readVpkDir(dirFile: string): Promise<Map<string, VpkEntry>> {
  return parseVpkDir(await readFile(dirFile));
}

/** The archive file that holds an entry's bytes. */
export function archivePath(dirFile: string, entry: VpkEntry): string {
  if (entry.archive === IN_DIRECTORY) return dirFile;
  return join(
    dirname(dirFile),
    dirFile.replace(/^.*[\\/]/, "").replace(/_dir\.vpk$/, `_${String(entry.archive).padStart(3, "0")}.vpk`),
  );
}

/** A file's bytes, checked against the CRC the directory records. */
export async function readVpkFile(dirFile: string, entry: VpkEntry): Promise<Buffer> {
  const body = Buffer.alloc(entry.length);
  const handle = await open(archivePath(dirFile, entry), "r");
  try {
    const { bytesRead } = await handle.read(body, 0, entry.length, entry.offset);
    if (bytesRead !== entry.length) throw new Error(`${archivePath(dirFile, entry)}: short read`);
  } finally {
    await handle.close();
  }
  const file = Buffer.concat([entry.preload, body]);
  if (crc32(file) !== entry.crc) throw new Error(`${archivePath(dirFile, entry)}: CRC mismatch`);
  return file;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = (CRC_TABLE[(c ^ byte) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
