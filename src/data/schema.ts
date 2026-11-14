// Data shapes for curated input and generated output (spec: data.md).
// Used by scripts/data/build.ts to validate, and by the site to type what it reads.

import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase ASCII words joined by -");
/** A real calendar date: 2023-02-30 has the right shape but is not one. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => {
    const date = new Date(`${d}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(d);
  }, "not a calendar date");

// ---------- Curated input (data/curated/) ----------

export const releaseSchema = z.strictObject({
  id: slug,
  date: isoDate,
  /** Localization key of the box or collection name, or null for kits released on their own (DATA-14d). */
  nameKey: z.string().nullable(),
  kits: z.array(z.number().int().positive()).min(1),
  source: z.strictObject({
    url: z
      .url()
      .refine(
        (u) =>
          ["blog.counter-strike.net", "store.steampowered.com", "www.counter-strike.net"].includes(new URL(u).host),
        "source.url must be a Valve page (DATA-14c)",
      ),
    title: z.string().min(1),
    quote: z.string().min(1),
  }),
  note: z.string().nullable(),
});
export type Release = z.infer<typeof releaseSchema>;

export const artistSchema = z.strictObject({
  id: slug,
  name: z.string().min(1),
  type: z.enum(["person", "group", "brand"]),
  aliases: z.array(z.string().min(1)),
  members: z.array(slug),
  musicbrainzId: z.uuid().nullable(),
});
export type Artist = z.infer<typeof artistSchema>;

export const creditSchema = z.strictObject({
  artists: z.array(z.strictObject({ artist: slug, role: z.enum(["main", "with"]) })).min(1),
  /** The English credit text when it is not an artist name or alias, for example "Tree Adams and Ben Bromfield". */
  credit: z.string().nullable(),
});
export type Credit = z.infer<typeof creditSchema>;

export const overridesSchema = z.strictObject({
  slugs: z.record(z.string(), slug),
  /** Credit and title for names the rules cannot split, by defIndex and locale (DATA-10). */
  splits: z.record(z.string(), z.record(z.string(), z.strictObject({ credit: z.string(), title: z.string().min(1) }))),
  /** MusicBrainz links left out, with the reason: the site is gone or the domain changed hands (DATA-4b). */
  hiddenLinks: z.record(z.url(), z.string().min(1)),
});

// ---------- Generated output (data/generated/) ----------

export const cueSchema = z.enum([
  "mainmenu",
  "chooseteam",
  "startofmatch",
  "startround",
  "startaction",
  "bombplanted",
  "bombtenseccount",
  "roundtenseccount",
  "wonround",
  "lostround",
  "deathcam",
  "roundmvpanthem",
  "endofmatch",
]);
export type Cue = z.infer<typeof cueSchema>;

export const trackSchema = z.strictObject({
  cue: cueSchema,
  take: z.number().int().positive().nullable(),
  file: z.string().min(1),
  durationSec: z.number().positive().nullable(),
  /** The published file (DATA-20, DATA-21): its path on the audio host, size and SHA-256. Null until uploaded. */
  audio: z
    .strictObject({
      path: z.string().regex(/^\/[a-z0-9_]+\/[a-z0-9_]+\.(mp3|wav)$/),
      bytes: z.number().int().positive(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
    })
    .nullable(),
});
export type Track = z.infer<typeof trackSchema>;

export const kitSchema = z.strictObject({
  defIndex: z.number().int().positive(),
  internalName: z.string().min(1),
  slug,
  edition: z.enum(["both", "stattrakOnly", "standardOnly"]),
  releaseId: slug,
  releaseDate: isoDate,
  artists: z.array(z.strictObject({ artist: slug, role: z.enum(["main", "with"]) })).min(1),
  /** Site path of the stored cover and its size in pixels (DATA-18). */
  cover: z.strictObject({
    source: z.enum(["icon", "texture"]),
    path: z.string().regex(/^\/covers\/(textures\/)?[a-z0-9_]+\.png$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  tracks: z.array(trackSchema).min(1),
  alternateTracks: z.array(trackSchema).nullable(),
  /** Game folder of the alternate set's files, `sounds/music/{name}/` (DATA-6, DATA-20). */
  alternateInternalName: z.string().min(1).nullable(),
});
export type Kit = z.infer<typeof kitSchema>;

/** The kinds of link the artist page shows, in this order (PROD-20). */
export const LINK_KINDS = ["official", "bandcamp", "spotify", "apple-music", "soundcloud", "youtube"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const generatedArtistSchema = artistSchema.extend({
  /** defIndex of every kit the artist is credited on, in release order. */
  kits: z.array(z.number().int().positive()).min(1),
  /** From MusicBrainz, one per kind, in LINK_KINDS order, then the MusicBrainz page itself (PROD-20). */
  links: z.array(
    z.strictObject({
      kind: z.enum([...LINK_KINDS, "musicbrainz"]),
      url: z.url({ protocol: /^https?$/ }),
    }),
  ),
});
export type GeneratedArtist = z.infer<typeof generatedArtistSchema>;

/** Official text for one locale. Only strings the game ships in that language are present. */
export const textSchema = z.strictObject({
  kits: z.record(
    z.string(),
    z.strictObject({
      name: z.string(),
      title: z.string(),
      credit: z.string(),
      description: z.string().nullable(),
    }),
  ),
  releases: z.record(z.string(), z.string()),
});
export type LocaleText = z.infer<typeof textSchema>;
