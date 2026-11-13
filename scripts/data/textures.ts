// pnpm data:textures — store each kit's cover texture from the game files (spec: DATA-19).
// A maintainer exports materials/models/inventory_items/music_kit/ with Source2Viewer-CLI (the README has the
// command) into game-files/, which git ignores. Each kit's folder holds its cover twice, compressed two ways
// (`mp3_screen_color_*.png`); the larger PNG is the less compressed one. It is stored unchanged at
// public/covers/textures/{internalName}.png, and its size goes to data/upstream/textures.json.
// Usage: node scripts/data/textures.ts [folder with materials/ inside, default game-files]

import { copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./json.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE = join(process.argv[2] ?? join(ROOT, "game-files"), "materials/models/inventory_items/music_kit");
const OUT = join(ROOT, "public/covers/textures");
const INDEX = join(ROOT, "data/upstream/textures.json");

/** Kits whose texture folder is not named after the kit. */
const FOLDERS: Record<string, string> = { midnightriders_01: "midnight_riders_01" };

export interface TextureInfo {
  width: number;
  height: number;
}

async function main(): Promise<void> {
  const itemsGame = await readJson<{ music: Record<string, { name: string }> }>(
    join(ROOT, "data/upstream/items-game.json"),
  );
  await mkdir(OUT, { recursive: true });
  const textures: Record<string, TextureInfo> = {};
  const missing: string[] = [];
  for (const { name } of Object.values(itemsGame.music)) {
    const folder = join(SOURCE, FOLDERS[name] ?? name);
    const files = await readdir(folder).catch(() => [] as string[]);
    const candidates = files.filter((f) => f.startsWith("mp3_screen_color") && f.endsWith(".png"));
    if (candidates.length === 0) {
      missing.push(name);
      continue;
    }
    const sizes = await Promise.all(candidates.map(async (f) => ({ f, bytes: (await stat(join(folder, f))).size })));
    const best = sizes.toSorted((a, b) => b.bytes - a.bytes)[0]?.f as string;
    const bytes = await readFile(join(folder, best));
    textures[name] = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    await copyFile(join(folder, best), join(OUT, `${name}.png`));
  }
  await writeJson(INDEX, textures);
  console.log(
    `Textures: ${Object.keys(textures).length} stored.${missing.length ? ` None for: ${missing.join(", ")}` : ""}`,
  );
}

await main();
