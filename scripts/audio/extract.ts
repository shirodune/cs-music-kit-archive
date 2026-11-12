// pnpm audio:extract — run on a maintainer's machine with CS2 installed through Steam (spec: DATA-20 to DATA-21).
// 1. Source2Viewer-CLI decompiles every file under sounds/music/ in the game's VPK into audio/raw/.
// 2. Files the game stores as MP3 are hard-linked (or copied) unchanged; WAV (PCM) files are encoded once to MP3 with ffmpeg
//    at the bitrate of the same kit's mainmenu track. Results go to audio/out/{internalName}/{file}.mp3.
// 3. Writes data/upstream/audio-manifest.json and audio/upload.json (the files that are new or changed).
// Needs Source2Viewer-CLI, ffmpeg and ffprobe. audio/ is in .gitignore: audio never goes into git (DATA-2).
// Usage: node scripts/audio/extract.ts [--s2v <path to Source2Viewer-CLI>] [--input <vpk>] [--skip-extract]

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, link, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readJson, writeJson } from "../data/json.ts";
import { changedKeys, type Manifest, nearestBitrate, wantedFiles } from "./lib.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RAW = join(ROOT, "audio", "raw");
const OUT = join(ROOT, "audio", "out");
const MANIFEST = join(ROOT, "data", "upstream", "audio-manifest.json");
const UPLOAD = join(ROOT, "audio", "upload.json");

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

function probe(path: string): { durationSec: number; bitRate: number } {
  const json = execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration,bit_rate",
    "-of",
    "json",
    path,
  ]);
  const { format } = JSON.parse(json.toString()) as { format: { duration: string; bit_rate: string } };
  return { durationSec: Math.round(Number(format.duration) * 1000) / 1000, bitRate: Number(format.bit_rate) };
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
  const previous = await readJson<Manifest>(MANIFEST).catch(() => ({}) as Manifest);
  const manifest: Manifest = {};
  const missing: string[] = [];

  for (const { internalName, file, key } of wanted) {
    const folder = join(RAW, "sounds", "music", internalName);
    const mp3 = join(folder, `${file}.mp3`);
    const wav = join(folder, `${file}.wav`);
    const target = join(OUT, internalName, `${file}.mp3`);
    await mkdir(join(OUT, internalName), { recursive: true });

    let stored: "mp3" | "wav";
    if (await exists(mp3)) {
      stored = "mp3";
      // A hard link takes no extra disk space; copy where links are not possible (another drive).
      await rm(target, { force: true });
      await link(mp3, target).catch(() => copyFile(mp3, target));
    } else if (await exists(wav)) {
      stored = "wav";
      const mainmenu = join(folder, "mainmenu.mp3");
      if (!(await exists(mainmenu))) throw new Error(`${key}: no mainmenu.mp3 to take the bitrate from (DATA-20b)`);
      const kbps = nearestBitrate(probe(mainmenu).bitRate);
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-y",
        "-i",
        wav,
        "-map_metadata",
        "-1",
        "-c:a",
        "libmp3lame",
        "-b:a",
        `${kbps}k`,
        target,
      ]);
    } else {
      missing.push(key);
      continue;
    }
    const bytes = await readFile(target);
    manifest[key] = {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      durationSec: probe(target).durationSec,
      stored,
    };
  }

  if (missing.length > 0) {
    throw new Error(`${missing.length} files not found under ${RAW}, for example: ${missing.slice(0, 5).join(", ")}`);
  }

  const upload = changedKeys(previous, manifest).map((key) => ({ key, file: join(OUT, key) }));
  await writeJson(MANIFEST, manifest);
  await writeFile(UPLOAD, `${JSON.stringify(upload, null, 2)}\n`);
  const wavCount = Object.values(manifest).filter((e) => e.stored === "wav").length;
  const totalMb = Object.values(manifest).reduce((sum, e) => sum + e.bytes, 0) / 1e6;
  console.log(
    `${wanted.length} files (${wavCount} encoded from WAV), ${totalMb.toFixed(0)} MB. ${upload.length} new or changed: run pnpm audio:upload.`,
  );
}

await main();
