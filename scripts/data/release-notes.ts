// Finding the Steam events that announce a kit (spec: DATA-14, `pnpm data:suggest-release`).

import { splitName } from "./text.ts";

/** One CS2 event from the Steam events API, with the fields used here. */
export interface SteamEvent {
  gid: string;
  event_name: string;
  /** 12 is release notes; 13 and others are announcements. */
  event_type: number;
  announcement_body: { posttime: number; body: string };
}

export interface Candidate {
  date: string;
  title: string;
  url: string;
  releaseNotes: boolean;
  /** Sentences that name the kit or its box, BBCode removed. */
  quotes: string[];
}

const RELEASE_NOTES = 12;
/** Shorter terms (a credit like "ALRT" is fine, "II" is not) match too much. */
const MIN_TERM = 4;

/** The day an event was posted, in US Pacific time (DATA-13). */
export function pacificDate(seconds: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(seconds * 1000));
}

/** The sentences of an event body: one per list item or paragraph, split again after `.`, `!` or `?`. */
export function sentencesOf(body: string): string[] {
  return body
    .replace(/\[img\][^[]*\[\/img\]/gi, "")
    .replace(/\[\/?\*\]|\[\/?(p|h\d|list|olist)\]/gi, "\n")
    .replace(/\[\/?[a-z0-9]+(=[^\]]*)?\]/gi, "")
    .replaceAll("\\[", "[")
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'])/))
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** What an announcement may call a kit: its English name, the credit and title in it, and its box's name. */
export function kitTerms(name: string, boxName?: string): string[] {
  const split = splitName(name, []);
  const terms = [name, split?.title, split?.credit, boxName, boxName?.replace(/\s+Music Kit Box$/i, "")];
  return [...new Set(terms.filter((t): t is string => t !== undefined && t.length >= MIN_TERM))];
}

const normalize = (text: string) => text.normalize("NFKC").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole words, in the case Valve writes them: the credit HEALTH, not "health". */
function matcher(terms: string[]): RegExp {
  const words = terms.map((t) => `(?<![\\p{L}\\p{N}])${escapeRegExp(normalize(t))}(?![\\p{L}\\p{N}])`);
  return new RegExp(words.join("|"), "u");
}

/**
 * Events that name the kit, and the release notes of the first day one did that mention music kits (a collection's
 * notes may name only the collection). Release notes first (DATA-14), then the oldest first: later posts that name a
 * kit are usually fixes.
 */
export function candidates(events: SteamEvent[], terms: string[]): Candidate[] {
  // No terms would make an empty pattern, which matches every sentence.
  if (terms.length === 0) return [];
  const names = matcher(terms);
  const scanned = events.map((event) => ({
    date: pacificDate(event.announcement_body.posttime),
    title: event.event_name,
    url: `https://store.steampowered.com/news/app/730/view/${event.gid}`,
    releaseNotes: event.event_type === RELEASE_NOTES,
    sentences: sentencesOf(event.announcement_body.body),
  }));
  const naming = scanned.map(({ sentences, ...c }) => ({
    ...c,
    quotes: sentences.filter((s) => names.test(normalize(s))),
  }));
  const first = naming
    .filter((c) => c.quotes.length > 0)
    .map((c) => c.date)
    .sort()[0];
  return naming
    .map((c, i) =>
      c.quotes.length === 0 && c.releaseNotes && c.date === first
        ? { ...c, quotes: (scanned[i]?.sentences ?? []).filter((s) => /music kit/i.test(s) && !/^\[.*\]$/.test(s)) }
        : c,
    )
    .filter((c) => c.quotes.length > 0)
    .sort((a, b) => Number(b.releaseNotes) - Number(a.releaseNotes) || a.date.localeCompare(b.date));
}
