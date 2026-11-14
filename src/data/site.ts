// Read-only access to data/generated/ for pages (SPEC.md, "Data").

import artistsJson from "../../data/generated/artists.json";
import kitsJson from "../../data/generated/kits.json";
import releasesJson from "../../data/generated/releases.json";
import type { LocaleSegment } from "../i18n/locales.ts";
import type { GeneratedArtist, Kit, LocaleText, Release } from "./schema.ts";

/** Kits in rack order (PROD-7). */
/** The public repository: source code, issues and the licence notice (PROD-4, PROD-38). */
export const REPOSITORY = "https://github.com/shirodune/cs-music-kit-archive";

export const kits = kitsJson as Kit[];
export const releases = releasesJson as Release[];
export const artists = artistsJson as GeneratedArtist[];

const kitByIndex = new Map(kits.map((k) => [k.defIndex, k]));
const releaseById = new Map(releases.map((r) => [r.id, r]));
const artistById = new Map(artists.map((a) => [a.id, a]));

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what} in data/generated/`);
  return value;
}

export const getKit = (defIndex: number): Kit => must(kitByIndex.get(defIndex), `kit ${defIndex}`);
export const getRelease = (id: string): Release => must(releaseById.get(id), `release ${id}`);
export const getArtist = (id: string): GeneratedArtist => must(artistById.get(id), `artist ${id}`);

const texts = import.meta.glob<LocaleText>("../../data/generated/text/*.json", { eager: true, import: "default" });
const textFor = (segment: LocaleSegment): LocaleText =>
  must(texts[`../../data/generated/text/${segment}.json`], segment);

/**
 * Official text in one locale. `lang` is "en" when the game does not ship the string in that locale
 * and the English text is shown instead (I18N "Text sources by kind", PROD-34); otherwise undefined.
 */
export interface Localized {
  text: string;
  lang: "en" | undefined;
}

type KitField = "name" | "title" | "credit" | "description";

export function kitText(segment: LocaleSegment, defIndex: number, field: KitField): Localized | null {
  const own = textFor(segment).kits[defIndex]?.[field];
  if (own) return { text: own, lang: undefined };
  const english = textFor("en").kits[defIndex]?.[field];
  return english ? { text: english, lang: segment === "en" ? undefined : "en" } : null;
}

/** Like kitText, for fields every kit has in English. */
export function kitTextRequired(segment: LocaleSegment, defIndex: number, field: Exclude<KitField, "description">) {
  return must(kitText(segment, defIndex, field) ?? undefined, `${field} of kit ${defIndex}`);
}

/** Official box or collection name of a release, or null for kits released on their own (DATA-14d). */
export function releaseName(segment: LocaleSegment, releaseId: string): Localized | null {
  const own = textFor(segment).releases[releaseId];
  if (own) return { text: own, lang: undefined };
  const english = textFor("en").releases[releaseId];
  return english ? { text: english, lang: segment === "en" ? undefined : "en" } : null;
}
