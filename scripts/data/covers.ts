// pnpm data:covers — download each kit's Steam CDN icon and store the original PNG (spec: DATA-19, the icon is the fallback).
// Writes public/covers/{internalName}.png and data/upstream/covers.json (size and source URL).
// Reads the snapshot written by `pnpm data:sync`; only covers whose source URL changed are fetched again.
// Usage: node scripts/data/covers.ts

import { mkdir, writeFile } from "node:fs/promises";
import { readJson, writeJson } from "./json.ts";

const UPSTREAM = new URL("../../data/upstream/", import.meta.url);
const COVERS = new URL("../../public/covers/", import.meta.url);
const PNG_SIGNATURE = "89504e470d0a1a0a";

export interface CoverInfo {
  sourceUrl: string;
  width: number;
  height: number;
}

interface ItemsGame {
  music: Record<string, { name: string }>;
}
type Editions = Record<string, { image: string | null }>;

/** Width and height from the PNG header (IHDR, the first chunk). */
function pngSize(bytes: Buffer, url: string): { width: number; height: number } {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) throw new Error(`not a PNG: ${url}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function main(): Promise<void> {
  const itemsGame = await readJson<ItemsGame>(new URL("items-game.json", UPSTREAM));
  const editions = await readJson<Editions>(new URL("bymykel-music-kits.json", UPSTREAM));
  const indexUrl = new URL("covers.json", UPSTREAM);
  const previous = await readJson<Record<string, CoverInfo>>(indexUrl).catch(() => ({}) as Record<string, CoverInfo>);

  await mkdir(COVERS, { recursive: true });
  const covers: Record<string, CoverInfo> = {};
  let fetched = 0;
  for (const [defIndex, { name }] of Object.entries(itemsGame.music)) {
    const sourceUrl = editions[defIndex]?.image;
    if (!sourceUrl) continue;
    const known = previous[name];
    if (known?.sourceUrl === sourceUrl) {
      covers[name] = known;
      continue;
    }
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`${response.status} ${sourceUrl}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    // Check before writing, so an error page never replaces a committed cover.
    const size = pngSize(bytes, sourceUrl);
    await writeFile(new URL(`${name}.png`, COVERS), bytes);
    covers[name] = { sourceUrl, ...size };
    fetched++;
  }
  await writeJson(indexUrl, covers);
  console.log(`Covers: ${Object.keys(covers).length} in total, ${fetched} downloaded.`);
}

await main();
