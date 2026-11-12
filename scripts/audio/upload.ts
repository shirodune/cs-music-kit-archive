// pnpm audio:upload — uploads the files listed in audio/upload.json to R2, then the manifest (spec: DATA-20, DATA-21).
// Run after `pnpm audio:extract`, signed in with `pnpm exec wrangler login`. The manifest goes last, so the site
// never links to a file that is not uploaded yet; `pnpm data:sync` reads it from audio.musickitarchive.com.

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BUCKET = "cs-music-kit-audio";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const UPLOAD = join(ROOT, "audio", "upload.json");
const MANIFEST = join(ROOT, "data", "upstream", "audio-manifest.json");

// Run Wrangler's own script with Node: spawning pnpm.cmd on Windows would need a shell.
const wranglerBin = join(
  dirname(createRequire(import.meta.url).resolve("wrangler/package.json")),
  "bin",
  "wrangler.js",
);
const wrangler = (args: string[]) =>
  execFileSync(process.execPath, [wranglerBin, ...args], { stdio: "inherit", cwd: ROOT });

const entries = JSON.parse(await readFile(UPLOAD, "utf8")) as unknown[];
if (entries.length > 0) {
  wrangler([
    "r2",
    "bulk",
    "put",
    BUCKET,
    "--filename",
    UPLOAD,
    "--remote",
    "--content-type",
    "audio/mpeg",
    // Paths are stable, but Valve can update a file in a game patch.
    "--cache-control",
    "public, max-age=604800",
  ]);
}
wrangler([
  "r2",
  "object",
  "put",
  `${BUCKET}/manifest.json`,
  "--file",
  MANIFEST,
  "--remote",
  "--content-type",
  "application/json",
  "--cache-control",
  "no-cache",
]);
console.log(`Uploaded ${entries.length} audio files and the manifest to ${BUCKET}.`);
