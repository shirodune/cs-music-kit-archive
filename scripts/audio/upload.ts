// pnpm audio:upload — publishes data/upstream/audio-manifest.json to the R2 bucket (spec: DATA-20, DATA-21, D-023).
// Run after `pnpm audio:extract`. It compares the local manifest with the published one, uploads new or changed
// files, then the manifest, so the published manifest never names a missing file; `pnpm data:sync` reads it.
// It deletes nothing: the live site keeps linking a file that is no longer listed until the weekly sync's pull
// request is merged, and a few stale files cost next to nothing.
// Uploads through R2's S3-compatible API with a token limited to this one bucket ("Object Read & Write"), which
// Wrangler cannot use. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY to its S3 credentials (docs/maintainers.md, "Weekly sync").

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AwsClient } from "aws4fetch";
import { readJson } from "../data/json.ts";
import { contentTypeOf, type Manifest, uploadPlan } from "./lib.ts";

const ACCOUNT_ID = "19524d21b66b788897a77e139f8d261e"; // Not a secret; also in wrangler.jsonc.
const BUCKET_URL = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/cs-music-kit-audio`;
const PUBLISHED = "https://audio.musickitarchive.com/manifest.json";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = join(ROOT, "audio", "out");
const MANIFEST = join(ROOT, "data", "upstream", "audio-manifest.json");
const PARALLEL = 8;

const { R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
if (!accessKeyId || !secretAccessKey) throw new Error("Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY");
const r2 = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });

async function put(key: string, body: Buffer, headers: Record<string, string>) {
  const url = `${BUCKET_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;
  for (let attempt = 1; ; attempt++) {
    const response = await r2.fetch(url, { method: "PUT", body: new Uint8Array(body), headers });
    if (response.ok) return;
    if (attempt >= 3) throw new Error(`PUT ${key}: HTTP ${response.status} ${await response.text()}`);
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

// Paths are stable, but Valve can update a file in a game patch.
const putAudio = async (key: string) =>
  put(key, await readFile(join(OUT, key)), {
    "Content-Type": contentTypeOf(key),
    "Cache-Control": "public, max-age=604800",
  });

const response = await fetch(PUBLISHED, { cache: "no-store" });
if (!response.ok && response.status !== 404) throw new Error(`${PUBLISHED}: HTTP ${response.status}`);
const published = (response.ok ? await response.json() : {}) as Manifest;
const plan = uploadPlan(published, await readJson<Manifest>(MANIFEST));
console.log(`${plan.length} files to upload.`);

const queue = [...plan];
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    for (let key = queue.shift(); key; key = queue.shift()) await putAudio(key);
  }),
);
await put("manifest.json", await readFile(MANIFEST), {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache",
});
console.log(`Uploaded ${plan.length} files and the manifest.`);
