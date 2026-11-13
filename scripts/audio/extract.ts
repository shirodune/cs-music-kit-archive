// pnpm audio:extract — run on a maintainer's machine with CS2 installed through Steam (spec: DATA-20 to DATA-21).
// 1. Source2Viewer-CLI decompiles every file under sounds/music/ in the game's VPK into audio/raw/.
// 2. Every file the site lists is published as the game stores it, MP3 or WAV, never re-encoded (DATA-20a).
//    The files are hard-linked (or copied) to audio/out/{internalName}/{file}.mp3 or .wav.
// 3. Writes data/upstream/audio-manifest.json; `pnpm audio:upload` compares it with the published one.
// Needs Source2Viewer-CLI and ffprobe (part of ffmpeg). audio/ is in .gitignore: audio never goes into git (DATA-2).
// Usage: node scripts/audio/extract.ts [--s2v <path to Source2Viewer-CLI>] [--input <vpk>] [--skip-extract]

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, link, mkdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readJson, writeJson } from "../data/json.ts";
import type { Manifest } from "./lib.ts";
import { wantedFiles } from "./lib.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RAW = join(ROOT, "audio", "raw");
const OUT = join(ROOT, "audio", "out");
const MANIFEST = join(ROOT, "data", "upstream", "audio-manifest.json");

const { values: args } = parseArgs({
  options: {
    s2v: { type: "string", default: "Source2Viewer-CLI" },
    // A path relative to the Steam install of CS2 (app 730); Source2Viewer-CLI finds the Steam library.
    input: { type: "string", default: "steam:730/game/csgo/pak01_dir.vpk" },
    "skip-extract": { type: "boolean", default: false },
  },
});

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  );

function durationOf(path: string): number {
  const json = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", path]);
  const { format } = JSON.parse(json.toString()) as { format: { duration: string } };
  return Math.round(Number(format.duration) * 1000) / 1000;
}

async function main(): Promise<void> {
  if (!args["skip-extract"]) {
    console.log(`Extracting sounds/music/ from ${args.input} …`);
    execFileSync(
      args.s2v,
      ["-i", args.input, "-f", "sounds/music/", "-e", "vsnd_c", "-d", "-o", RAW, "-q", "--threads", "4"],
      { stdio: "inherit" },
    );
  }

  const kits = await readJson<Parameters<typeof wantedFiles>[0]>(join(ROOT, "data", "generated", "kits.json"));
  const wanted = wantedFiles(kits);
  const manifest: Manifest = {};
  const missing: string[] = [];
  await rm(OUT, { recursive: true, force: true });

  for (const { internalName, base } of wanted) {
    let key: string | undefined;
    for (const ext of ["mp3", "wav"]) {
      if (await exists(join(RAW, "sounds", "music", `${base}.${ext}`))) key = `${base}.${ext}`;
    }
    if (!key) {
      missing.push(base);
      continue;
    }
    const source = join(RAW, "sounds", "music", key);
    const target = join(OUT, key);
    await mkdir(join(OUT, internalName), { recursive: true });
    // A hard link takes no extra disk space; copy where links are not possible (another drive).
    await link(source, target).catch(() => copyFile(source, target));
    const bytes = await readFile(target);
    manifest[key] = {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      durationSec: durationOf(target),
    };
  }

  if (missing.length > 0) {
    throw new Error(`${missing.length} files not found under ${RAW}, for example: ${missing.slice(0, 5).join(", ")}`);
  }

  await writeJson(MANIFEST, manifest);
  const entries = Object.entries(manifest);
  const wavCount = entries.filter(([key]) => key.endsWith(".wav")).length;
  const totalMb = entries.reduce((sum, [, e]) => sum + e.bytes, 0) / 1e6;
  console.log(`${entries.length} files (${wavCount} WAV), ${totalMb.toFixed(0)} MB. Next: pnpm audio:upload.`);
}

await main();
