import { expect, test } from "vitest";
import { matchLocale, matchTag } from "../../src/i18n/match.ts";

test.each([
  ["zh-CN", "zh-hans"],
  ["zh-SG", "zh-hans"],
  ["zh-Hans", "zh-hans"],
  ["zh", "zh-hans"],
  ["zh-TW", "zh-hant"],
  ["zh-HK", "zh-hant"],
  ["zh-MO", "zh-hant"],
  ["zh-Hant-TW", "zh-hant"],
  ["zh-Hans-TW", "zh-hans"],
  ["pt-BR", "pt-br"],
  ["pt", "pt-pt"],
  ["pt-AO", "pt-pt"],
  ["es", "es"],
  ["es-ES", "es"],
  ["es-MX", "es-419"],
  ["es-419", "es-419"],
  ["no", "nb"],
  ["nn-NO", "nb"],
  ["nb", "nb"],
  ["de-AT", "de"],
  ["EN-us", "en"],
  ["uk-UA", "uk"],
])("I18N-4 maps %s to %s", (tag, segment) => {
  expect(matchTag(tag)).toBe(segment);
});

test("I18N-4 unknown languages do not match", () => {
  expect(matchTag("ar-EG")).toBeNull();
  expect(matchTag("")).toBeNull();
});

test("I18N-4 the first matching browser language wins", () => {
  expect(matchLocale(["ar", "he", "ru-RU", "en"])).toBe("ru");
  expect(matchLocale(["ar", "he"])).toBeNull();
  expect(matchLocale([])).toBeNull();
});
