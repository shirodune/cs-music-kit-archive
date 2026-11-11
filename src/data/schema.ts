// Data shapes for curated input and generated output (spec: data.md).
// Used by scripts/data/build.ts to validate, and by the site to type what it reads.

import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase ASCII words joined by -");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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
  cover: z.strictObject({ source: z.enum(["icon", "texture"]), url: z.url() }),
  tracks: z.array(trackSchema).min(1),
  alternateTracks: z.array(trackSchema).nullable(),
});
export type Kit = z.infer<typeof kitSchema>;

export const generatedArtistSchema = artistSchema.extend({
  /** defIndex of every kit the artist is credited on, in release order. */
  kits: z.array(z.number().int().positive()).min(1),
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
