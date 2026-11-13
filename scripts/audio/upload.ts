// pnpm audio:upload — makes the R2 bucket match data/upstream/audio-manifest.json (spec: DATA-20, DATA-21).
// Run after `pnpm audio:extract`, signed in with `pnpm exec wrangler login`. It compares the local manifest with
// the published one, uploads new or changed files, then the manifest, then deletes files the manifest no longer
// lists. So the published manifest never names a missing file; `pnpm data:sync` reads it.

import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "../data/json.ts";
import { contentTypeOf, type Manifest, uploadPlan } from "./lib.ts";

const BUCKET = "cs-music-kit-audio";
const PUBLISHED = "https://audio.musickitarchive.com/manifest.json";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = join(ROOT, "audio", "out");
const MANIFEST = join(ROOT, "data", "upstream", "audio-manifest.json");

// Run Wrangler's own script with Node: spawning pnpm.cmd on Windows would need a shell.
const wranglerBin = join(
  dirname(createRequire(import.meta.url).resolve("wrangler/package.json")),
  "bin",
  "wrangler.js",
);
const wrangler = (args: string[]) =>
  execFileSync(process.execPath, [wranglerBin, ...args], { stdio: "inherit", cwd: ROOT });

const response = await fetch(PUBLISHED, { cache: "no-store" });
if (!response.ok && response.status !== 404) throw new Error(`${PUBLISHED}: HTTP ${response.status}`);
const published = (response.ok ? await response.json() : {}) as Manifest;
const plan = uploadPlan(published, await readJson<Manifest>(MANIFEST));
console.log(`${plan.put.length} files to upload, ${plan.remove.length} to delete.`);

// One bulk upload per content type: Wrangler sets one type for the whole batch.
for (const type of new Set(plan.put.map(contentTypeOf))) {
  const list = join(ROOT, "audio", `upload-${type.replace("/", "-")}.json`);
  const keys = plan.put.filter((key) => contentTypeOf(key) === type);
  await writeFile(list, JSON.stringify(keys.map((key) => ({ key, file: join(OUT, key) }))));
  wrangler([
    "r2",
    "bulk",
    "put",
    BUCKET,
    "--filename",
    list,
    "--remote",
    "--content-type",
    type,
    // Paths are stable, but Valve can update a file in a game patch (DATA-21a).
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
for (const key of plan.remove) wrangler(["r2", "object", "delete", `${BUCKET}/${key}`, "--remote"]);
console.log(`Uploaded ${plan.put.length} files and the manifest, deleted ${plan.remove.length} files.`);
