// pnpm data:changes — list the game files that changed since the site's audio and covers were extracted (spec: DATA-26).
// Compares data/upstream/game-files.json (the current game, written by `pnpm data:sync`) with
// data/upstream/game-files-extracted.json (the game files the published audio and stored textures came from).
// Exits with 1 when anything is new, changed or removed, so a workflow can tell.
// `pnpm audio:extract` records the sound files it reads. After exporting textures (README, "Audio"), run
// `pnpm data:sync` and then `pnpm data:changes --accept`, which records all current game files as extracted.
// Usage: node scripts/data/changes.ts [--accept]

import { existsSync } from "node:fs";
import { readJson, writeJson } from "./json.ts";

type GameFiles = Record<string, { crc: string; bytes: number }>;

const UPSTREAM = new URL("../../data/upstream/", import.meta.url);
const CURRENT = new URL("game-files.json", UPSTREAM);
const EXTRACTED = new URL("game-files-extracted.json", UPSTREAM);

const current = await readJson<GameFiles>(CURRENT);

if (process.argv.includes("--accept")) {
  await writeJson(EXTRACTED, current);
  console.log(`Recorded ${Object.keys(current).length} game files as extracted.`);
  process.exit(0);
}

const extracted = existsSync(EXTRACTED) ? await readJson<GameFiles>(EXTRACTED) : {};
const lines: string[] = [];
for (const path of Object.keys({ ...extracted, ...current }).sort()) {
  const before = extracted[path];
  const now = current[path];
  if (!before) lines.push(`new      ${path}`);
  else if (!now) lines.push(`removed  ${path}`);
  else if (Number.parseInt(before.crc, 16) !== Number.parseInt(now.crc, 16)) lines.push(`changed  ${path}`);
}

if (lines.length === 0) {
  console.log("The published audio and covers match the current game files.");
} else {
  console.log(`${lines.length} game files differ from the ones the site's audio and covers came from:`);
  for (const line of lines) console.log(`  ${line}`);
  console.log(
    "Sound files: pnpm game:download, pnpm audio:extract, pnpm audio:upload (the weekly sync does this). " +
      "Cover textures: export them (README, “Audio”), then pnpm data:sync and pnpm data:changes --accept.",
  );
  process.exitCode = 1;
}
