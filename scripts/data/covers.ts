// pnpm data:covers — download each kit's Steam CDN icon and store it as WebP (spec: DATA-18).
// Writes public/covers/{internalName}.webp and data/upstream/covers.json (size and source URL).
// Reads the snapshot written by `pnpm data:sync`; only covers whose source URL changed are fetched again.
// Usage: node scripts/data/covers.ts

import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { readJson, writeJson } from "./json.ts";

const UPSTREAM = new URL("../../data/upstream/", import.meta.url);
const COVERS = new URL("../../public/covers/", import.meta.url);

export interface CoverInfo {
  sourceUrl: string;
  width: number;
  height: number;
}

interface ItemsGame {
  music: Record<string, { name: string }>;
}
type Editions = Record<string, { image: string | null }>;

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
    const image = sharp(Buffer.from(await response.arrayBuffer()));
    const { width, height } = await image.metadata();
    await writeFile(new URL(`${name}.webp`, COVERS), await image.webp({ quality: 90, effort: 6 }).toBuffer());
    covers[name] = { sourceUrl, width, height };
    fetched++;
  }
  await writeJson(indexUrl, covers);
  console.log(`Covers: ${Object.keys(covers).length} in total, ${fetched} downloaded.`);
}

await main();
