// pnpm data:textures — store each kit's cover texture from the game's VPK (spec: DATA-19, DATA-26).
// 1. The VPK comes from `pnpm game:download` (game-files/game/csgo/) or from a Steam install of CS2 (--game).
//    A cover whose texture files are unchanged since the last extraction (DATA-26) is kept, so only the archives
//    that hold new or changed textures are needed. --all reads every cover again.
// 2. Each kit's `mp3_screen_color` textures are copied out of the VPK, checked against their CRC, to
//    game-files/textures/, and Source2Viewer-CLI decompiles them to PNG. The game ships each cover twice,
//    compressed two ways; the larger PNG is the less compressed one.
// 3. It is stored unchanged at public/covers/textures/{internalName}.png; its size goes to
//    data/upstream/textures.json, and the texture files to data/upstream/game-files-extracted.json.
// Usage: node scripts/data/textures.ts [--game <folder with pak01_dir.vpk>] [--s2v <path to Source2Viewer-CLI>] [--all]

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { coverNeedsExtraction, coverTextures, EXTRACTED, readExtracted, recordOf } from "../game/extracted.ts";
import { archivePath, readVpkDir, readVpkFile, type VpkEntry } from "../game/vpk.ts";
import { readJson, writeJson } from "./json.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const WORK = join(ROOT, "game-files", "textures");
const OUT = join(ROOT, "public/covers/textures");
const INDEX = join(ROOT, "data/upstream/textures.json");

const { values: args } = parseArgs({
  options: {
    // On Windows, for example "C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo".
    game: { type: "string", default: join(ROOT, "game-files", "game", "csgo") },
    s2v: { type: "string", default: "Source2Viewer-CLI" },
    all: { type: "boolean", default: false },
  },
});

interface TextureInfo {
  width: number;
  height: number;
}

async function main(): Promise<void> {
  const dirFile = join(args.game, "pak01_dir.vpk");
  const vpk = await readVpkDir(dirFile);
  const itemsGame = await readJson<{ music: Record<string, { name: string }> }>(
    join(ROOT, "data/upstream/items-game.json"),
  );
  const previous = existsSync(INDEX) ? await readJson<Record<string, TextureInfo>>(INDEX) : {};
  const record = await readExtracted();

  const textures: Record<string, TextureInfo> = {};
  const toRead: { name: string; files: [string, VpkEntry][] }[] = [];
  const missing: string[] = [];
  const missingArchives = new Set<string>();
  await rm(WORK, { recursive: true, force: true });

  for (const { name } of Object.values(itemsGame.music)) {
    const files = coverTextures(vpk, name);
    const stored = name in previous && existsSync(join(OUT, `${name}.png`));
    if (files.length === 0) {
      missing.push(name);
    } else if (!args.all && !coverNeedsExtraction(files, stored, record)) {
      textures[name] = previous[name] as TextureInfo;
    } else if (files.some(([, entry]) => !existsSync(archivePath(dirFile, entry)))) {
      for (const [, entry] of files) missingArchives.add(archivePath(dirFile, entry));
    } else {
      await mkdir(join(WORK, "vtex", name), { recursive: true });
      for (const [path, entry] of files) {
        await writeFile(
          join(WORK, "vtex", name, path.slice(path.lastIndexOf("/") + 1)),
          await readVpkFile(dirFile, entry),
        );
      }
      toRead.push({ name, files });
    }
  }
  if (missingArchives.size > 0) {
    throw new Error(
      `${missingArchives.size} VPK archives are missing (run pnpm game:download): ${[...missingArchives].join(", ")}`,
    );
  }

  if (toRead.length > 0) {
    console.log(`Decompiling the textures of ${toRead.length} covers …`);
    const png = join(WORK, "png");
    execFileSync(args.s2v, ["-i", join(WORK, "vtex"), "--recursive", "-d", "-o", png, "--threads", "4"], {
      stdio: "inherit",
    });
    await mkdir(OUT, { recursive: true });
    for (const { name, files } of toRead) {
      const pngs = (await readdir(join(png, name))).filter((f) => f.endsWith(".png"));
      const sizes = await Promise.all(pngs.map(async (f) => ({ f, bytes: (await stat(join(png, name, f))).size })));
      const best = sizes.toSorted((a, b) => b.bytes - a.bytes)[0]?.f;
      if (!best) throw new Error(`Source2Viewer wrote no PNG for ${name}`);
      const bytes = await readFile(join(png, name, best));
      textures[name] = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
      await copyFile(join(png, name, best), join(OUT, `${name}.png`));
      for (const [path, entry] of files) record[path] = recordOf(entry);
    }
  }

  await writeJson(INDEX, textures);
  await writeJson(EXTRACTED, record);
  console.log(
    `${toRead.length} covers read from the game, ${Object.keys(textures).length - toRead.length} unchanged.` +
      (missing.length ? ` No texture for: ${missing.join(", ")}` : ""),
  );
}

await main();
