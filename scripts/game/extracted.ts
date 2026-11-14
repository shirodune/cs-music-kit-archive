// The record of the game files the site's audio and cover textures came from (spec: DATA-26), and which files a
// kit's cover is made from. Shared by `pnpm game:download`, `pnpm audio:extract` and `pnpm data:textures`.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readJson } from "../data/json.ts";
import type { VpkEntry } from "./vpk.ts";

export type GameFileRecord = Record<string, { crc: string; bytes: number }>;

export const EXTRACTED = new URL("../../data/upstream/game-files-extracted.json", import.meta.url);

export async function readExtracted(): Promise<GameFileRecord> {
  return existsSync(EXTRACTED) ? readJson<GameFileRecord>(EXTRACTED) : {};
}

/** A VPK entry as the record keeps it: written the way GameTracking's VPK listing writes it (`pnpm data:sync`). */
export function recordOf(entry: VpkEntry): { crc: string; bytes: number } {
  return { crc: entry.crc.toString(16).padStart(10, "0"), bytes: entry.preload.length + entry.length };
}

/** Whether the record holds this game file with the same CRC. */
export function isRecorded(path: string, entry: VpkEntry, record: GameFileRecord): boolean {
  const recorded = record[path];
  return recorded !== undefined && Number.parseInt(recorded.crc, 16) === entry.crc;
}

/** Kits whose cover texture folder is not named after the kit. */
const TEXTURE_FOLDERS: Record<string, string> = { midnightriders_01: "midnight_riders_01" };

/**
 * The cover texture files of a kit (DATA-19): `mp3_screen_color*.vtex_c` in its folder under
 * materials/models/inventory_items/music_kit/. The game ships each cover twice, compressed two ways.
 */
export function coverTextures(vpk: Map<string, VpkEntry>, name: string): [string, VpkEntry][] {
  const prefix = `materials/models/inventory_items/music_kit/${TEXTURE_FOLDERS[name] ?? name}/mp3_screen_color`;
  return [...vpk]
    .filter(([path]) => path.startsWith(prefix) && path.endsWith(".vtex_c"))
    .sort(([a], [b]) => a.localeCompare(b));
}

/** Whether a kit's cover has to be read from the game again: it is not stored, or one of its files changed. */
export function coverNeedsExtraction(files: [string, VpkEntry][], stored: boolean, record: GameFileRecord): boolean {
  return !stored || files.some(([path, entry]) => !isRecorded(path, entry, record));
}

/**
 * The record without game files that are gone from the VPK. A recompiled cover texture gets a new file name (its
 * name holds a hash), so without this the old name would be listed as removed by `pnpm data:changes` forever.
 */
export function pruneRecord(record: GameFileRecord, vpk: Map<string, VpkEntry>): GameFileRecord {
  return Object.fromEntries(Object.entries(record).filter(([path]) => vpk.has(path)));
}

const TEXTURES = fileURLToPath(new URL("../../public/covers/textures/", import.meta.url));

/** Whether a kit's cover texture is stored: listed in data/upstream/textures.json and its PNG is there (DATA-19). */
export function coverStored(name: string, textures: Record<string, unknown>): boolean {
  return name in textures && existsSync(`${TEXTURES}${name}.png`);
}
