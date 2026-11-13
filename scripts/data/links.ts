// pnpm data:links — fetch each artist's links from MusicBrainz into data/upstream/musicbrainz.json (spec: PROD-20, DATA-4).
// Reads the `musicbrainzId` of every artist in data/curated/artists.json. Keeps one link of each kind the artist
// page shows, from relations that have not ended.
// Usage: node scripts/data/links.ts

import { LINK_KINDS, type LinkKind } from "../../src/data/schema.ts";
import { readJson, writeJson } from "./json.ts";

const ROOT = new URL("../../data/", import.meta.url);

// DATA-4: a descriptive User-Agent, requests at least 1.1 seconds apart.
const headers = { "User-Agent": "cs-music-kit-archive data sync", Accept: "application/json" };
const SPACING_MS = 1100;

interface Relation {
  type: string;
  ended: boolean;
  url?: { resource: string };
}

function kindOf(type: string, url: URL): LinkKind | null {
  if (type === "official homepage") return "official";
  if (type === "bandcamp") return "bandcamp";
  if (type === "soundcloud") return "soundcloud";
  if (type === "youtube" && url.host !== "music.youtube.com") return "youtube";
  if (url.host === "open.spotify.com" && url.pathname.startsWith("/artist/")) return "spotify";
  if (url.host === "music.apple.com") return "apple-music";
  return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function links(mbid: string): Promise<{ kind: LinkKind; url: string }[]> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`, { headers });
    if (response.ok) {
      const { relations = [] } = (await response.json()) as { relations?: Relation[] };
      // The first of each kind in URL order, so the result does not depend on the order MusicBrainz returns.
      const found = new Map<LinkKind, string>();
      const current = relations
        .flatMap((r) => (!r.ended && r.url ? [{ type: r.type, url: r.url.resource }] : []))
        .sort((a, b) => a.url.localeCompare(b.url));
      for (const { type, url } of current) {
        const kind = kindOf(type, new URL(url));
        if (kind && !found.has(kind)) found.set(kind, url);
      }
      return LINK_KINDS.flatMap((kind) => {
        const url = found.get(kind);
        return url ? [{ kind, url }] : [];
      });
    }
    // MusicBrainz answers 503 when requests come too fast.
    if (attempt >= 4 || response.status === 404) throw new Error(`${response.status} MusicBrainz artist ${mbid}`);
    await sleep(SPACING_MS * 3 * attempt);
  }
}

const artists = await readJson<{ musicbrainzId: string | null }[]>(new URL("curated/artists.json", ROOT));
const out: Record<string, { kind: LinkKind; url: string }[]> = {};
for (const { musicbrainzId } of artists) {
  if (!musicbrainzId || out[musicbrainzId]) continue;
  out[musicbrainzId] = await links(musicbrainzId);
  await sleep(SPACING_MS);
}
await writeJson(new URL("upstream/musicbrainz.json", ROOT), out);
console.log(`Fetched links for ${Object.keys(out).length} MusicBrainz artists.`);
