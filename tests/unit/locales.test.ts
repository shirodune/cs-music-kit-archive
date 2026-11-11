import { describe, expect, test } from "vitest";
import { DEFAULT_LOCALE, getLocale, isLocaleSegment, LOCALE_SEGMENTS, LOCALES } from "../../src/i18n/locales.ts";

describe("locale table", () => {
  test("I18N-1 has the 28 CS2 languages with English as the default", () => {
    expect(LOCALES).toHaveLength(28);
    expect(DEFAULT_LOCALE).toBe("en");
  });

  test("I18N-2 segments are unique lowercase URL segments and tags are valid BCP 47", () => {
    expect(new Set(LOCALE_SEGMENTS).size).toBe(LOCALES.length);
    for (const l of LOCALES) {
      expect(l.segment).toMatch(/^[a-z]{2}(-[a-z0-9]+)?$/);
      expect(Intl.getCanonicalLocales(l.tag)).toEqual([l.tag]);
      expect(new Set(LOCALES.map((x) => x.valve)).size).toBe(LOCALES.length);
    }
  });

  test("I18N-2 lookups by segment", () => {
    expect(getLocale("zh-hans").tag).toBe("zh-Hans");
    expect(isLocaleSegment("pt-br")).toBe(true);
    expect(isLocaleSegment("pt-BR")).toBe(false);
    expect(isLocaleSegment(undefined)).toBe(false);
  });

  test("I18N-8 plural categories per locale are the ones listed in the spec", () => {
    const expected: Record<string, string[]> = {
      other: ["vi", "th", "ja", "ko", "zh-hans", "zh-hant"],
      "one,other": ["en", "de", "nl", "da", "nb", "sv", "fi", "hu", "tr", "bg", "el"],
      "many,one,other": ["fr", "es", "es-419", "pt-br", "pt-pt", "it"],
      "few,one,other": ["ro"],
      "few,many,one,other": ["pl", "cs", "ru", "uk"],
    };
    const actual: Record<string, string[]> = {};
    for (const l of LOCALES) {
      const key = [...new Intl.PluralRules(l.tag).resolvedOptions().pluralCategories].sort().join(",");
      actual[key] = [...(actual[key] ?? []), l.segment];
    }
    for (const list of Object.values(actual)) list.sort();
    for (const list of Object.values(expected)) list.sort();
    expect(actual).toEqual(expected);
  });
});
