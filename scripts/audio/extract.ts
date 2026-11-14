// pnpm audio:extract — read every track the site lists from the game's VPK and write the published files
// (spec: DATA-20 to DATA-21).
// 1. The VPK comes from `pnpm game:download` (game-files/game/csgo/) or from a Steam install of CS2 (--game).
//    A track whose game file is unchanged since the last extraction (DATA-26) keeps its manifest entry, so only
//    the archives that hold new or changed tracks are needed. --all reads every track again.
// 2. Each track's compiled sound is copied out of the VPK, checked against its CRC, to audio/vsnd/{internalName}/.
// 3. Source2Viewer-CLI decompiles them to audio/out/{internalName}/{file}.mp3 or .wav: the game's own data, never
//    re-encoded (DATA-20a). Valve strips the header from WAV files; Source2Viewer writes the standard one back.
// 4. Writes data/upstream/audio-manifest.json, and records the CRC and size of every sound file it read in
//    data/upstream/game-files-extracted.json (DATA-26). Next, pnpm audio:upload.
// Needs Source2Viewer-CLI and ffprobe (part of ffmpeg). audio/ is in .gitignore: audio never goes into git (DATA-2).
// Usage: node scripts/audio/extract.ts [--game <folder with pak01_dir.vpk>] [--s2v <path to Source2Viewer-CLI>] [--all]

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readJson, writeJson } from "../data/json.ts";
import { EXTRACTED, pruneRecord, readExtracted, recordOf } from "../game/extracted.ts";
import { archivePath, readVpkDir, readVpkFile } from "../game/vpk.ts";
import { type Manifest, needsExtraction, wantedFiles } from "./lib.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const VSND = join(ROOT, "audio", "vsnd");
const OUT = join(ROOT, "audio", "out");
const MANIFEST = join(ROOT, "data", "upstream", "audio-manifest.json");

const { values: args } = parseArgs({
  options: {
    // On Windows, for example "C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo".
    game: { type: "string", default: join(ROOT, "game-files", "game", "csgo") },
    s2v: { type: "string", default: "Source2Viewer-CLI" },
    all: { type: "boolean", default: false },
  },
});

function durationOf(path: string): number {
  const json = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", path]);
  const { format } = JSON.parse(json.toString()) as { format: { duration: string } };
  return Math.round(Number(format.duration) * 1000) / 1000;
}

async function main(): Promise<void> {
  const dirFile = join(args.game, "pak01_dir.vpk");
  const vpk = await readVpkDir(dirFile);
  const kits = await readJson<Parameters<typeof wantedFiles>[0]>(join(ROOT, "data", "generated", "kits.json"));
  const previous = existsSync(MANIFEST) ? await readJson<Manifest>(MANIFEST) : {};
  const extracted = pruneRecord(await readExtracted(), vpk);

  const manifest: Manifest = {};
  const toRead: string[] = [];
  const read: Record<string, { crc: string; bytes: number }> = {};
  const notInGame: string[] = [];
  const missingArchives = new Set<string>();
  await rm(VSND, { recursive: true, force: true });
  await rm(OUT, { recursive: true, force: true });

  for (const { internalName, base } of wantedFiles(kits)) {
    const entry = vpk.get(`sounds/music/${base}.vsnd_c`);
    if (!entry) {
      notInGame.push(base);
    } else if (!args.all && !needsExtraction(base, entry.crc, extracted, previous)) {
      for (const key of [`${base}.mp3`, `${base}.wav`]) if (previous[key]) manifest[key] = previous[key];
    } else if (!existsSync(archivePath(dirFile, entry))) {
      missingArchives.add(archivePath(dirFile, entry));
    } else {
      await mkdir(join(VSND, internalName), { recursive: true });
      await writeFile(join(VSND, `${base}.vsnd_c`), await readVpkFile(dirFile, entry));
      toRead.push(base);
      read[`sounds/music/${base}.vsnd_c`] = recordOf(entry);
    }
  }
  if (notInGame.length > 0) {
    throw new Error(
      `${notInGame.length} tracks are not in the game's VPK, for example: ${notInGame.slice(0, 5).join(", ")}`,
    );
  }
  if (missingArchives.size > 0) {
    throw new Error(
      `${missingArchives.size} VPK archives are missing (run pnpm game:download): ${[...missingArchives].join(", ")}`,
    );
  }

  if (toRead.length > 0) {
    console.log(`Decompiling ${toRead.length} sounds …`);
    execFileSync(args.s2v, ["-i", VSND, "--recursive", "-d", "-o", OUT, "--threads", "4"], { stdio: "inherit" });
  }
  for (const base of toRead) {
    const key = [`${base}.mp3`, `${base}.wav`].find((k) => existsSync(join(OUT, k)));
    if (!key) throw new Error(`Source2Viewer wrote no MP3 or WAV for ${base}`);
    const bytes = await readFile(join(OUT, key));
    manifest[key] = {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      durationSec: durationOf(join(OUT, key)),
    };
  }

  await writeJson(MANIFEST, manifest);
  await writeJson(EXTRACTED, { ...extracted, ...read });
  const keys = Object.keys(manifest);
  const wavCount = keys.filter((key) => key.endsWith(".wav")).length;
  console.log(
    `${toRead.length} files read from the game, ${keys.length - toRead.length} unchanged; ${keys.length} in the manifest (${wavCount} WAV).` +
      (toRead.length > 0 ? " Next: pnpm audio:upload." : ""),
  );
}

await main();
