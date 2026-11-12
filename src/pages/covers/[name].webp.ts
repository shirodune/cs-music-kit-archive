// WebP copies of the stored PNG covers, made at build time (DATA-18a). The PNG stays the original;
// the copy is about a sixth of its size, which matters most for the rack above the fold (PROD-36).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import sharp from "sharp";
import { kits } from "../../data/site.ts";

export const getStaticPaths = (() =>
  [...new Set(kits.map((kit) => kit.cover.path))].map((path) => ({
    params: { name: path.replace(/^\/covers\/(.+)\.png$/, "$1") },
    props: { path },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await readFile(join(process.cwd(), "public", props.path as string));
  // Lossy colour at quality 90 with lossless alpha: no visible change at the sizes shown.
  const webp = await sharp(png).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
  return new Response(new Uint8Array(webp), { headers: { "Content-Type": "image/webp" } });
};
