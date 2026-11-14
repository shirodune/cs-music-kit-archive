import { expect, test } from "vitest";
import { type Catalog, createT } from "../../src/i18n/t.ts";

const ru: Catalog = {
  "nav.records": "Пластинки",
  "artist.kitCount": { one: "{count} набор", few: "{count} набора", many: "{count} наборов", other: "{count} набора" },
};

test("picks the plural form with Intl.PluralRules", () => {
  const t = createT("ru", ru);
  expect(t("artist.kitCount", { count: 1 })).toBe("1 набор");
  expect(t("artist.kitCount", { count: 2 })).toBe("2 набора");
  expect(t("artist.kitCount", { count: 5 })).toBe("5 наборов");
  expect(t("artist.kitCount", { count: 21 })).toBe("21 набор");
  expect(t("artist.kitCount", { count: 22 })).toBe("22 набора");
});

test("formats numbers in placeholders for the locale", () => {
  const t = createT("ru", ru);
  const ruNumber = new Intl.NumberFormat("ru").format(1234);
  // 1234 ends in 4, so Russian uses the "few" form.
  expect(t("artist.kitCount", { count: 1234 })).toBe(`${ruNumber} набора`);
  expect(ruNumber).not.toBe("1234");
  expect(createT("en")("artist.kitCount", { count: 1234 })).toBe("1,234 kits");
});

test("falls back to English for a missing key", () => {
  const t = createT("ru", ru);
  expect(t("nav.records")).toBe("Пластинки");
  expect(t("nav.artists")).toBe("Artists");
});

test("falls back to the other form when an English plural is used for another locale", () => {
  expect(createT("pl", {})("artist.kitCount", { count: 2 })).toBe("2 kits");
});

test("reads the real catalogs", () => {
  expect(createT("zh-hans")("nav.records")).toBe("唱片");
  expect(createT("zh-hans")("artist.kitCount", { count: 5 })).toBe("5 个音乐盒");
});

test("a plural message needs a numeric count, and every placeholder needs a value", () => {
  const t = createT("en");
  expect(() => t("artist.kitCount")).toThrow(/numeric \{count\}/);
});
