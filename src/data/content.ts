// Rules for stories and introductions (spec: DATA-22, DATA-23, PROD-27, PROD-28, I18N-17, I18N-18).
// Pure functions, so they can be tested without Astro; the pages call them with the collection entries.

import { z } from "zod";
import { DEFAULT_LOCALE, LOCALE_SEGMENTS, type LocaleSegment } from "../i18n/locales.ts";

/** Front matter (DATA-23). Every factual claim has a source (PROD-28), so there is at least one. */
export const contentSchema = z.strictObject({
  sources: z.array(z.strictObject({ title: z.string().min(1), url: z.url() })).min(1),
  translation: z.enum(["original", "human", "machine"]),
});
export type ContentData = z.infer<typeof contentSchema>;

interface Entry {
  id: string;
  data: ContentData;
}

/** The file for a page in a locale: its own, or else the English one, shown as not translated yet (I18N-18). */
export function pickContent<T extends Entry>(
  entries: readonly T[],
  slug: string,
  segment: LocaleSegment,
): { entry: T; untranslated: boolean } | null {
  const own = entries.find((e) => e.id === `${slug}/${segment}`);
  if (own) return { entry: own, untranslated: false };
  const english = entries.find((e) => e.id === `${slug}/${DEFAULT_LOCALE}`);
  return english ? { entry: english, untranslated: true } : null;
}

/**
 * What is wrong with a collection: a folder that is not a page, a file name that is not a locale, or a page whose
 * English original is missing (stories and introductions are written in English first, i18n "Text sources by kind").
 */
export function contentProblems(kind: string, entries: readonly Entry[], slugs: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const locales: readonly string[] = LOCALE_SEGMENTS;
  for (const { id, data } of entries) {
    const [slug = "", segment = ""] = id.split("/");
    const english = segment === DEFAULT_LOCALE;
    if (!slugs.has(slug)) problems.push(`${kind} ${id}: no page has the slug ${slug}`);
    if (!locales.includes(segment)) problems.push(`${kind} ${id}: ${segment} is not a locale`);
    if (english && data.translation !== "original") problems.push(`${kind} ${id}: English is the original`);
    if (!english && data.translation === "original") problems.push(`${kind} ${id}: only English is the original`);
    if (!english && !entries.some((e) => e.id === `${slug}/${DEFAULT_LOCALE}`))
      problems.push(`${kind} ${id}: ${slug}/${DEFAULT_LOCALE}.md is missing`);
  }
  return problems;
}
