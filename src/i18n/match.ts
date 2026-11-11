import { isLocaleSegment, type LocaleSegment } from "./locales.ts";

/** `localStorage` key for the visitor's chosen locale (I18N-4, I18N-5). */
export const LOCALE_STORAGE_KEY = "mka:locale";

/**
 * Maps one browser language tag to a site locale, or `null` when none fits (I18N-4).
 * Examples: `zh-TW` → `zh-hant`, `pt-AO` → `pt-pt`, `es-MX` → `es-419`, `de-AT` → `de`.
 */
export function matchTag(tag: string): LocaleSegment | null {
  const lower = tag.trim().toLowerCase();
  if (lower === "") return null;
  const [primary, ...rest] = lower.split("-");
  const subtags = new Set(rest);

  if (primary === "zh") {
    // A script subtag wins over the region: zh-Hans-TW is Simplified.
    if (subtags.has("hant")) return "zh-hant";
    if (subtags.has("hans")) return "zh-hans";
    if (subtags.has("tw") || subtags.has("hk") || subtags.has("mo")) return "zh-hant";
    return "zh-hans";
  }
  if (primary === "pt") return subtags.has("br") ? "pt-br" : "pt-pt";
  if (primary === "es") return rest.length === 0 || subtags.has("es") ? "es" : "es-419";
  if (primary === "no" || primary === "nb" || primary === "nn") return "nb";

  return isLocaleSegment(primary) ? primary : null;
}

/** Picks the first browser language that maps to a site locale (I18N-4). */
export function matchLocale(languages: readonly string[]): LocaleSegment | null {
  for (const tag of languages) {
    const match = matchTag(tag);
    if (match) return match;
  }
  return null;
}
