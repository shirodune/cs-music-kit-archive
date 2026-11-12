// pnpm data:build — combine data/upstream/ and data/curated/ into data/generated/ (spec: data.md).
// Never edit data/generated/ by hand: CI rebuilds it and fails on any difference (DATA-1).
// Usage: node scripts/data/build.ts

import { readdir, rm } from "node:fs/promises";
import { z } from "zod";
import {
  type Artist,
  artistSchema,
  type Credit,
  type Cue,
  creditSchema,
  cueSchema,
  type GeneratedArtist,
  type Kit,
  kitSchema,
  type LocaleText,
  overridesSchema,
  type Release,
  releaseSchema,
  type Track,
  textSchema,
} from "../../src/data/schema.ts";
import { LOCALES } from "../../src/i18n/locales.ts";
import { readJson, writeJson } from "./json.ts";
import { cleanText, slugify, splitName } from "./text.ts";

const ROOT = new URL("../../data/", import.meta.url);
const UPSTREAM = new URL("upstream/", ROOT);
const CURATED = new URL("curated/", ROOT);
const GENERATED = new URL("generated/", ROOT);

/** Tracks of an unnamed definition shown on another kit (DATA-6): alternate set → kit. */
const ALTERNATE_SETS: Record<number, number> = { 2: 70 };

const CUE_ORDER = cueSchema.options;

interface ItemsGame {
  music: Record<string, { name: string; locName: string | null; locDescription: string | null }>;
  boxes: { itemId: string; name: string; nameKey: string; stattrak: boolean; kits: string[] }[];
}
type SoundEvents = Record<string, { event: string; files: string[]; durationSec: number | null }[]>;
type Editions = Record<string, { standard: boolean; stattrak: boolean; image: string | null }>;
type Covers = Record<string, { width: number; height: number }>;

const errors: string[] = [];
const fail = (message: string) => errors.push(message);

function parseCurated<T>(schema: z.ZodType<T>, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    for (const issue of result.error.issues) fail(`${file}: ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(errors.join("\n"));
  }
  return result.data;
}

/** Track list for one internal name, in the order a match plays it (PROD-23, DATA-11). */
function buildTracks(internalName: string, events: SoundEvents[string] | undefined): Track[] {
  if (!events) {
    fail(`${internalName}: no sound events`);
    return [];
  }
  const single = new Map<string, number | null>();
  const shared = new Map<string, number | null>();
  for (const { files, durationSec } of events) {
    for (const file of files) {
      const target = files.length === 1 ? single : shared;
      if (!target.has(file) || target.get(file) === null) target.set(file, durationSec);
    }
  }
  const files = new Set([...single.keys(), ...shared.keys()]);
  const tracks: Track[] = [];
  for (const file of files) {
    const match = /^(.*?)(?:_(\d+))?$/.exec(file);
    const cue = cueSchema.safeParse(match?.[1]);
    if (!cue.success) {
      fail(`${internalName}: unknown cue in file ${file}`);
      continue;
    }
    const take = match?.[2] ? Number(match[2]) : null;
    tracks.push({ cue: cue.data, take, file, durationSec: single.get(file) ?? shared.get(file) ?? null });
  }
  const rank = (cue: Cue) => CUE_ORDER.indexOf(cue);
  return tracks.sort((a, b) => rank(a.cue) - rank(b.cue) || (a.take ?? 0) - (b.take ?? 0));
}

async function main(): Promise<void> {
  const itemsGame = await readJson<ItemsGame>(new URL("items-game.json", UPSTREAM));
  const soundEvents = await readJson<SoundEvents>(new URL("sound-events.json", UPSTREAM));
  const editions = await readJson<Editions>(new URL("bymykel-music-kits.json", UPSTREAM));
  const covers = await readJson<Covers>(new URL("covers.json", UPSTREAM));
  const loc = Object.fromEntries(
    await Promise.all(
      LOCALES.map(
        async (l) =>
          [l.segment, await readJson<Record<string, string>>(new URL(`loc/${l.segment}.json`, UPSTREAM))] as const,
      ),
    ),
  );
  const en = loc.en ?? {};

  const releases = parseCurated(
    z.array(releaseSchema),
    await readJson(new URL("releases.json", CURATED)),
    "releases.json",
  );
  const artists = parseCurated(z.array(artistSchema), await readJson(new URL("artists.json", CURATED)), "artists.json");
  const credits = parseCurated(
    z.record(z.string(), creditSchema),
    await readJson(new URL("credits.json", CURATED)),
    "credits.json",
  );
  const overrides = parseCurated(overridesSchema, await readJson(new URL("overrides.json", CURATED)), "overrides.json");

  const artistById = new Map<string, Artist>(artists.map((a) => [a.id, a]));

  // DATA-5: a kit is a music definition with an English name.
  const definitions = Object.entries(itemsGame.music)
    .map(([defIndex, d]) => ({ defIndex: Number(defIndex), ...d }))
    .filter((d) => d.locName && en[d.locName]);

  // DATA-14a: every kit belongs to exactly one release.
  const releaseOf = new Map<number, Release>();
  for (const release of releases) {
    for (const defIndex of release.kits) {
      if (releaseOf.has(defIndex))
        fail(`kit ${defIndex} is in two releases: ${releaseOf.get(defIndex)?.id}, ${release.id}`);
      releaseOf.set(defIndex, release);
      if (!definitions.some((d) => d.defIndex === defIndex)) fail(`${release.id}: kit ${defIndex} is not a kit`);
    }
  }

  // Box releases must list exactly the kits in the box's loot list.
  for (const release of releases) {
    const box = itemsGame.boxes.find((b) => b.nameKey === release.nameKey);
    if (!box) continue;
    const names = release.kits.map((d) => itemsGame.music[d]?.name).sort();
    if (names.join() !== box.kits.join()) {
      fail(`${release.id}: kits ${names.join(", ")} differ from the ${box.name} loot list ${box.kits.join(", ")}`);
    }
  }
  for (const release of releases) {
    if (release.nameKey && !en[release.nameKey]) fail(`${release.id}: nameKey ${release.nameKey} has no English text`);
  }

  // Credit text used to split names into credit and title (DATA-10).
  const creditTexts = (defIndex: number, credit: Credit | undefined): string[] => {
    if (!credit) return [];
    const texts = credit.credit ? [credit.credit] : [];
    for (const { artist } of credit.artists) {
      const a = artistById.get(artist);
      if (a) texts.push(a.name, ...a.aliases);
      else fail(`credits.json: kit ${defIndex} names unknown artist ${artist}`);
    }
    return texts.sort((x, y) => y.length - x.length);
  };

  const kits: Kit[] = [];
  const texts: Record<string, LocaleText> = Object.fromEntries(
    LOCALES.map((l) => [l.segment, { kits: {}, releases: {} }]),
  );
  const slugs = new Map<string, number>();

  for (const d of definitions) {
    const { defIndex } = d;
    const release = releaseOf.get(defIndex);
    if (!release) fail(`kit ${defIndex} (${d.name}) is in no release`);
    const credit = credits[String(defIndex)];
    if (!credit) fail(`kit ${defIndex} (${d.name}) has no credit in credits.json`);
    if (credit && !credit.artists.some((a) => a.role === "main")) fail(`kit ${defIndex} has no main credit`);

    const edition = editions[String(defIndex)];
    if (!edition) fail(`kit ${defIndex} (${d.name}) is missing from the CSGO-API data`);
    if (edition && !edition.image) fail(`kit ${defIndex} (${d.name}) has no cover image`);
    const cover = covers[d.name];
    if (!cover) fail(`kit ${defIndex} (${d.name}) has no stored cover; run pnpm data:covers (DATA-18)`);

    const candidates = creditTexts(defIndex, credit);
    for (const { segment } of LOCALES) {
      const strings = loc[segment] ?? {};
      const rawName = d.locName ? strings[d.locName] : undefined;
      if (!rawName) continue;
      const name = cleanText(rawName, { singleLine: true });
      const override = overrides.splits[String(defIndex)]?.[segment];
      const englishTitle = segment === "en" ? undefined : texts.en?.kits[String(defIndex)]?.title;
      const split = override ?? splitName(name, candidates, englishTitle);
      if (!split) {
        fail(`kit ${defIndex} [${segment}]: cannot split "${name}" into credit and title; add overrides.splits`);
        continue;
      }
      const rawDescription = d.locDescription ? strings[d.locDescription] : undefined;
      const entry = (texts[segment] as LocaleText).kits;
      entry[String(defIndex)] = {
        name,
        title: split.title,
        credit: split.credit,
        description: rawDescription ? cleanText(rawDescription, { singleLine: false }) : null,
      };
    }

    const englishTitle = texts.en?.kits[String(defIndex)]?.title ?? d.name;
    const slug = overrides.slugs[String(defIndex)] ?? slugify(englishTitle);
    if (!slug) fail(`kit ${defIndex}: "${englishTitle}" gives an empty slug; add overrides.slugs`);
    if (slugs.has(slug)) fail(`kits ${slugs.get(slug)} and ${defIndex} share the slug ${slug}; add overrides.slugs`);
    slugs.set(slug, defIndex);

    const tracks = buildTracks(d.name, soundEvents[d.name]);
    if (!tracks.some((t) => t.cue === "mainmenu")) fail(`kit ${defIndex}: no mainmenu track (DATA-12)`);
    if (!tracks.some((t) => t.cue === "roundmvpanthem")) fail(`kit ${defIndex}: no MVP anthem (DATA-12)`);

    const alternateOf = Object.entries(ALTERNATE_SETS).find(([, target]) => target === defIndex)?.[0];
    const alternateName = alternateOf ? itemsGame.music[alternateOf]?.name : undefined;

    if (!release || !credit || !edition || !cover) continue;
    kits.push(
      kitSchema.parse({
        defIndex,
        internalName: d.name,
        slug,
        edition: edition.standard && edition.stattrak ? "both" : edition.stattrak ? "stattrakOnly" : "standardOnly",
        releaseId: release.id,
        releaseDate: release.date,
        artists: credit.artists,
        cover: { source: "icon", path: `/covers/${d.name}.png`, width: cover.width, height: cover.height },
        tracks,
        alternateTracks: alternateName ? buildTracks(alternateName, soundEvents[alternateName]) : null,
        alternateInternalName: alternateName ?? null,
      }),
    );
  }

  // Release names in every locale.
  for (const release of releases) {
    if (!release.nameKey) continue;
    for (const { segment } of LOCALES) {
      const value = loc[segment]?.[release.nameKey];
      if (value) (texts[segment] as LocaleText).releases[release.id] = cleanText(value, { singleLine: true });
    }
  }

  kits.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.defIndex - b.defIndex);
  const order = new Map(kits.map((k, i) => [k.defIndex, i]));

  const generatedArtists: GeneratedArtist[] = artists.map((a) => ({
    ...a,
    kits: kits.filter((k) => k.artists.some((c) => c.artist === a.id)).map((k) => k.defIndex),
  }));
  for (const a of generatedArtists) if (a.kits.length === 0) fail(`artist ${a.id} has no kits (DATA-16)`);

  const generatedReleases = [...releases]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ ...r, kits: [...r.kits].sort((x, y) => (order.get(x) ?? 0) - (order.get(y) ?? 0)) }));

  if (errors.length) {
    for (const e of errors) console.error(`error  ${e}`);
    console.error(`\n${errors.length} problems. data/generated/ was not written.`);
    process.exitCode = 1;
    return;
  }

  await rm(GENERATED, { recursive: true, force: true });
  await writeJson(new URL("kits.json", GENERATED), kits);
  await writeJson(new URL("artists.json", GENERATED), generatedArtists);
  await writeJson(new URL("releases.json", GENERATED), generatedReleases);
  for (const [segment, text] of Object.entries(texts)) {
    await writeJson(new URL(`text/${segment}.json`, GENERATED), textSchema.parse(text));
  }

  const files = await readdir(new URL("text/", GENERATED));
  console.log(
    `Built ${kits.length} kits, ${generatedArtists.length} artists, ${generatedReleases.length} releases, ` +
      `text for ${files.length} locales.`,
  );
}

await main();
