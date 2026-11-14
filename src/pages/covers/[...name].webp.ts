// WebP copies of the stored PNG covers, made at build time (DATA-19): /covers/{name}.webp for icons and
// /covers/textures/{name}.webp (at most 768 px) plus {name}-320.webp for textures. The PNG stays the original.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import sharp from "sharp";
import { COVER_LARGE, COVER_SMALL } from "../../data/cover.ts";
import { kits } from "../../data/site.ts";

export const getStaticPaths = (() =>
  kits.flatMap(({ cover }) => {
    const name = cover.path.replace(/^\/covers\/(.+)\.png$/, "$1");
    const large = { params: { name }, props: { path: cover.path, width: Math.min(cover.width, COVER_LARGE) } };
    if (cover.source !== "texture" || cover.width <= COVER_SMALL) return [large];
    return [large, { params: { name: `${name}-${COVER_SMALL}` }, props: { path: cover.path, width: COVER_SMALL } }];
  })) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await readFile(join(process.cwd(), "public", props.path as string));
  // Lossy colour at quality 90 with lossless alpha: no visible change at the sizes shown.
  const webp = await sharp(png)
    .resize({ width: props.width as number, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer();
  return new Response(new Uint8Array(webp), { headers: { "Content-Type": "image/webp" } });
};
