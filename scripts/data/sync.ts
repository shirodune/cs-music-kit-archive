// pnpm data:sync — fetch the upstream subsets we use into data/upstream/ (spec: data.md, DATA-3).
// Every upstream repository is read at one commit, recorded in data/upstream/meta.json.
// Usage: node scripts/data/sync.ts   (set GITHUB_TOKEN to raise the GitHub API rate limit)

import { LOCALES } from "../../src/i18n/locales.ts";
import { writeJson } from "./json.ts";
import { type Kv3Object, parseKv3 } from "./kv3.ts";
import { parseVdf, type VdfObject } from "./vdf.ts";

const OUT = new URL("../../data/upstream/", import.meta.url);

const REPOS = {
  gameTracking: { repo: "SteamTracking/GameTracking-CS2", branch: "master" },
  fileTracker: { repo: "ByMykel/counter-strike-file-tracker", branch: "main" },
  csgoApi: { repo: "ByMykel/CSGO-API", branch: "main" },
} as const;

const AUDIO_MANIFEST = "https://audio.musickitarchive.com/manifest.json";

/** Every kit's cover textures in the game's VPK (DATA-26). Sound files are the ones the sound events play. */
const COVER_TEXTURES = /^materials\/models\/inventory_items\/music_kit\/[^/]+\/mp3_screen_color[^/]*\.vtex_c$/;

/** Localization keys we keep, compared in lower case (DATA-3). */
const KEY_PREFIXES = ["musickit_", "csgo_crate_musickit_"];
const EXTRA_KEYS = ["store_nav_section_coupon_nightmode2", "csgo_type_musickit"];

const headers: Record<string, string> = { "User-Agent": "cs-music-kit-archive data sync" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers });
    if (response.ok) return response;
    if (attempt >= 3 || response.status === 404) throw new Error(`${response.status} ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
}

async function headSha(repo: string, branch: string): Promise<string> {
  const response = await get(`https://api.github.com/repos/${repo}/commits/${branch}`);
  const { sha } = (await response.json()) as { sha: string };
  return sha;
}

const raw = (repo: string, sha: string, path: string) => `https://raw.githubusercontent.com/${repo}/${sha}/${path}`;

function obj(value: unknown, what: string): VdfObject {
  if (value === null || typeof value !== "object") throw new Error(`items_game.txt: missing ${what}`);
  return value as VdfObject;
}

/** Music definitions, and the music kit boxes with their loot lists. */
function extractItemsGame(text: string) {
  const root = obj(parseVdf(text).items_game, "items_game");
  const definitions = obj(root.music_definitions, "music_definitions");
  const items = obj(root.items, "items");
  const revolving = obj(root.revolving_loot_lists, "revolving_loot_lists");
  const lootLists = obj(root.client_loot_lists, "client_loot_lists");

  const music = Object.fromEntries(
    Object.entries(definitions).map(([defIndex, value]) => {
      const d = obj(value, `music definition ${defIndex}`);
      return [
        defIndex,
        {
          name: d.name,
          locName: typeof d.loc_name === "string" ? d.loc_name.replace(/^#/, "").toLowerCase() : null,
          locDescription:
            typeof d.loc_description === "string" ? d.loc_description.replace(/^#/, "").toLowerCase() : null,
          imageInventory: d.image_inventory ?? null,
        },
      ];
    }),
  );

  const boxes = Object.entries(items)
    .filter(([, value]) => typeof value === "object" && String((value as VdfObject).name).startsWith("crate_musickit"))
    .map(([itemId, value]) => {
      const item = value as VdfObject;
      const attributes = obj(item.attributes ?? {}, "crate attributes");
      const series = obj(attributes["set supply crate series"] ?? {}, "crate series");
      const listName = revolving[String(series.value)];
      const list = typeof listName === "string" ? obj(lootLists[listName], `loot list ${listName}`) : {};
      const kits = Object.keys(list)
        .map((entry) => /^\[(.+)\]musickit$/.exec(entry)?.[1])
        .filter((name): name is string => Boolean(name))
        .sort();
      return {
        itemId,
        name: item.name,
        nameKey: String(item.item_name ?? "")
          .replace(/^#/, "")
          .toLowerCase(),
        stattrak: list.will_produce_stattrak === "1",
        kits,
      };
    })
    .sort((a, b) => Number(a.itemId) - Number(b.itemId));

  return { music, boxes };
}

/** One entry per sound event: the files it plays and its duration. */
function extractSoundEvents(internalName: string, text: string) {
  const doc: Kv3Object = parseKv3(text);
  return Object.entries(doc)
    .map(([event, value]) => {
      const e = value as Kv3Object;
      const files = (Array.isArray(e.vsnd_files) ? e.vsnd_files : [e.vsnd_files])
        .filter((f): f is string => typeof f === "string")
        .map((f) => {
          const match = /^sounds\/music\/([^/]+)\/([^/]+)\.vsnd$/.exec(f);
          if (!match || match[1] !== internalName) throw new Error(`${internalName}: unexpected file ${f}`);
          return match[2];
        });
      return {
        event: event.replace(`.${internalName}`, ""),
        files,
        durationSec: typeof e.vsnd_duration === "number" ? e.vsnd_duration : null,
      };
    })
    .filter((e) => e.files.length > 0);
}

function keepKeys(tokens: Record<string, unknown>): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    const lower = key.toLowerCase();
    if (typeof value !== "string") continue;
    if (KEY_PREFIXES.some((p) => lower.startsWith(p)) || EXTRA_KEYS.includes(lower)) kept[lower] = value;
  }
  return kept;
}

async function main(): Promise<void> {
  const shas = Object.fromEntries(
    await Promise.all(
      Object.entries(REPOS).map(async ([id, { repo, branch }]) => [id, await headSha(repo, branch)] as const),
    ),
  ) as Record<keyof typeof REPOS, string>;

  // Game data
  const gt = REPOS.gameTracking.repo;
  const itemsGameText = await (
    await get(raw(gt, shas.gameTracking, "game/csgo/pak01_dir/scripts/items/items_game.txt"))
  ).text();
  const itemsGame = extractItemsGame(itemsGameText);
  await writeJson(new URL("items-game.json", OUT), itemsGame);

  const names = Object.values(itemsGame.music).map((m) => String(m.name));
  const soundEvents: Record<string, ReturnType<typeof extractSoundEvents>> = {};
  for (const name of names) {
    const path = `game/csgo/pak01_dir/soundevents/music/${name}/game_sounds_music.vsndevts`;
    soundEvents[name] = extractSoundEvents(name, await (await get(raw(gt, shas.gameTracking, path))).text());
  }
  await writeJson(new URL("sound-events.json", OUT), soundEvents);

  // The game files the site publishes, with their CRC and size from the VPK listing (DATA-26): every sound file a
  // kit's sound events play, and every cover texture. A kit folder also holds files no event plays; they are left out.
  const played = new Set(
    Object.entries(soundEvents).flatMap(([name, events]) =>
      events.flatMap((e) => e.files.map((file) => `sounds/music/${name}/${file}.vsnd_c`)),
    ),
  );
  const listing = await (await get(raw(gt, shas.gameTracking, "game/csgo/pak01_dir.txt"))).text();
  const gameFiles: Record<string, { crc: string; bytes: number }> = {};
  for (const line of listing.split("\n")) {
    const match = /^(\S+) CRC:([0-9a-f]+) size:(\d+)$/.exec(line.trim());
    if (match && (played.has(match[1] as string) || COVER_TEXTURES.test(match[1] as string))) {
      gameFiles[match[1] as string] = { crc: match[2] as string, bytes: Number(match[3]) };
    }
  }
  if (Object.keys(gameFiles).length === 0) throw new Error("pak01_dir.txt: no music kit files");
  await writeJson(new URL("game-files.json", OUT), gameFiles);

  // Official text in 28 languages
  for (const { segment, valve } of LOCALES) {
    const url = raw(REPOS.fileTracker.repo, shas.fileTracker, `static/csgo_${valve}.json`);
    const { lang } = (await (await get(url)).json()) as { lang: { Tokens: Record<string, unknown> } };
    await writeJson(new URL(`loc/${segment}.json`, OUT), keepKeys(lang.Tokens));
  }

  // Cover image URLs and StatTrak availability
  const apiUrl = raw(REPOS.csgoApi.repo, shas.csgoApi, "public/api/en/music_kits.json");
  const apiKits = (await (await get(apiUrl)).json()) as { id: string; def_index: string; image: string }[];
  const editions: Record<string, { standard: boolean; stattrak: boolean; image: string | null }> = {};
  for (const kit of apiKits) {
    let entry = editions[kit.def_index];
    if (!entry) {
      entry = { standard: false, stattrak: false, image: null };
      editions[kit.def_index] = entry;
    }
    if (kit.id.endsWith("_st")) entry.stattrak = true;
    else entry.standard = true;
    entry.image ??= kit.image;
  }
  await writeJson(new URL("bymykel-music-kits.json", OUT), editions);

  // The published audio manifest (DATA-21). It names only files that are uploaded.
  const audio = (await (await get(AUDIO_MANIFEST)).json()) as Record<string, unknown>;
  await writeJson(new URL("audio-manifest.json", OUT), audio);

  await writeJson(new URL("meta.json", OUT), {
    fetchedAt: new Date().toISOString(),
    sources: Object.fromEntries(
      Object.entries(REPOS).map(([id, { repo, branch }]) => [
        id,
        { repo, branch, sha: shas[id as keyof typeof REPOS] },
      ]),
    ),
  });

  console.log(
    `Synced ${Object.keys(itemsGame.music).length} music definitions, ${itemsGame.boxes.length} boxes, ` +
      `${names.length} sound event files, ${Object.keys(gameFiles).length} game files, ${LOCALES.length} languages, ${apiKits.length} API entries, ${Object.keys(audio).length} audio files.`,
  );
}

await main();
