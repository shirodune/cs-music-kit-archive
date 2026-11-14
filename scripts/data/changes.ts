// pnpm data:changes — list the game files that changed since the site's audio and covers were extracted (spec: DATA-26).
// Compares data/upstream/game-files.json (the current game, written by `pnpm data:sync`) with
// data/upstream/game-files-extracted.json (the game files the published audio and stored textures came from).
// Exits with 1 when anything is new, changed or removed, so a workflow can tell.
// `pnpm audio:extract` and `pnpm data:textures` record the files they read and drop the ones gone from the game, so
// the weekly sync's extraction step also clears a removed file. Nothing else writes the record: marking a file as
// extracted without reading it would hide it from the extraction for good.
// Usage: node scripts/data/changes.ts

import { existsSync } from "node:fs";
import { readJson } from "./json.ts";

type GameFiles = Record<string, { crc: string; bytes: number }>;

const UPSTREAM = new URL("../../data/upstream/", import.meta.url);
const CURRENT = new URL("game-files.json", UPSTREAM);
const EXTRACTED = new URL("game-files-extracted.json", UPSTREAM);

const current = await readJson<GameFiles>(CURRENT);

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
    "Extract them with pnpm game:download, pnpm audio:extract, pnpm data:textures and pnpm audio:upload " +
      "(the weekly sync does this; docs/maintainers.md, “Audio”).",
  );
  process.exitCode = 1;
}
