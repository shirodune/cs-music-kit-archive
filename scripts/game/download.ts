// pnpm game:download — download the parts of CS2's VPK that `pnpm audio:extract` needs, anonymously from Steam
// (spec: DATA-20). Uses DepotDownloader (https://github.com/SteamRE/DepotDownloader); no Steam account is needed.
// First the VPK directory, pak01_dir.vpk (about 8 MB), then only the archives (about 100 MB each) that hold tracks
// to extract: new or changed ones (DATA-26), or every one with --all (about 9 GB).
// Files go to game-files/game/csgo/, which git ignores. DepotDownloader skips files it already has.
// Usage: node scripts/game/download.ts [--depotdownloader <path>] [--all]

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { type Manifest, needsExtraction, wantedFiles } from "../audio/lib.ts";
import { readJson } from "../data/json.ts";
import { archivePath, readVpkDir } from "./vpk.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const GAME_FILES = join(ROOT, "game-files");
const DIR_FILE = join(GAME_FILES, "game", "csgo", "pak01_dir.vpk");
const UPSTREAM = join(ROOT, "data", "upstream");

/** Counter-Strike 2, and its depot with the game content (`game/csgo/pak01_*.vpk`). */
const APP = "730";
const DEPOT = "2347770";

const { values: args } = parseArgs({
  options: {
    depotdownloader: { type: "string", default: "DepotDownloader" },
    all: { type: "boolean", default: false },
  },
});

async function download(paths: string[]): Promise<void> {
  const list = join(GAME_FILES, "filelist.txt");
  await mkdir(GAME_FILES, { recursive: true });
  await writeFile(list, `${paths.join("\n")}\n`);
  execFileSync(args.depotdownloader, ["-app", APP, "-depot", DEPOT, "-filelist", list, "-dir", GAME_FILES], {
    stdio: "inherit",
  });
}

async function main(): Promise<void> {
  await download(["game/csgo/pak01_dir.vpk"]);
  const vpk = await readVpkDir(DIR_FILE);
  const kits = await readJson<Parameters<typeof wantedFiles>[0]>(join(ROOT, "data", "generated", "kits.json"));
  const manifest = await readJson<Manifest>(join(UPSTREAM, "audio-manifest.json"));
  const extracted = existsSync(join(UPSTREAM, "game-files-extracted.json"))
    ? await readJson<Record<string, { crc: string }>>(join(UPSTREAM, "game-files-extracted.json"))
    : {};

  const archives = new Set<string>();
  let tracks = 0;
  for (const { base } of wantedFiles(kits)) {
    const entry = vpk.get(`sounds/music/${base}.vsnd_c`);
    if (!entry || !(args.all || needsExtraction(base, entry.crc, extracted, manifest))) continue;
    tracks++;
    const archive = archivePath(DIR_FILE, entry);
    if (archive !== DIR_FILE) archives.add(relative(GAME_FILES, archive).replaceAll("\\", "/"));
  }
  if (archives.size === 0) {
    console.log("Every track is unchanged since the last extraction; no archives to download.");
    return;
  }
  console.log(`${tracks} tracks to extract, in ${archives.size} archives.`);
  await download([...archives].sort());
}

await main();
