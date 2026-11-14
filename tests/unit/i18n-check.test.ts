import { expect, test } from "vitest";
import enMessages from "../../messages/en.json";
import { checkCatalog } from "../../scripts/i18n-check.ts";

const en = {
  "nav.records": "Records",
  "artist.kitCount": { one: "{count} kit", other: "{count} kits" },
};

test("I18N-11 a key that is not in English is an error", () => {
  const { errors } = checkCatalog("de", "de", { "nav.extra": "x" }, en);
  expect(errors).toEqual(['de: "nav.extra" is not in en.json']);
});

test("I18N-11 a plural must have exactly the categories the locale uses", () => {
  const missing = checkCatalog("ru", "ru", { "artist.kitCount": { one: "{count}", other: "{count}" } }, en);
  expect(missing.errors.join()).toMatch(/missing plural forms: few, many/);
  const extra = checkCatalog("ja", "ja", { "artist.kitCount": { one: "{count}", other: "{count}" } }, en);
  expect(extra.errors.join()).toMatch(/does not use: one/);
});

test("I18N-11 placeholders must match English", () => {
  const { errors } = checkCatalog(
    "fr",
    "fr",
    { "artist.kitCount": { one: "{n} kit", many: "{count}", other: "{count}" } },
    en,
  );
  expect(errors.join()).toMatch(/placeholders \{n\} differ from English \{count\}/);
});

test("I18N-11 a string where English has a plural is an error", () => {
  const { errors } = checkCatalog("de", "de", { "artist.kitCount": "kits" }, en);
  expect(errors.join()).toMatch(/must be a plural object/);
});

test("I18N-11 missing keys are warnings, not errors", () => {
  const { errors, warnings } = checkCatalog("de", "de", {}, en);
  expect(errors).toEqual([]);
  expect(warnings).toHaveLength(2);
});

test("I18N-7 keys are flat and dot-separated; a value is a string or a plural object", () => {
  for (const [key, value] of Object.entries(enMessages)) {
    expect(key).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/);
    if (typeof value === "string") continue;
    for (const [form, text] of Object.entries(value)) {
      expect(["zero", "one", "two", "few", "many", "other"], key).toContain(form);
      expect(typeof text, key).toBe("string");
    }
  }
});
