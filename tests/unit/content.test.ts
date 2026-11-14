import { describe, expect, test } from "vitest";
import { type ContentData, contentProblems, contentSchema, pickContent } from "../../src/data/content.ts";

const sources = [{ title: "Interview", url: "https://example.com/interview" }];
const entry = (id: string, translation: ContentData["translation"]) => ({ id, data: { sources, translation } });

describe("stories and introductions", () => {
  test("DATA-23 front matter has at least one source and a translation kind", () => {
    expect(contentSchema.safeParse({ sources, translation: "machine" }).success).toBe(true);
    expect(contentSchema.safeParse({ sources: [], translation: "original" }).success).toBe(false);
    expect(contentSchema.safeParse({ sources, translation: "auto" }).success).toBe(false);
    // A source is a web page; a javascript: link would run on every page that lists it.
    expect(
      contentSchema.safeParse({ sources: [{ title: "x", url: "javascript:alert(1)" }], translation: "original" })
        .success,
    ).toBe(false);
    expect(
      contentSchema.safeParse({ sources: [{ title: "x", url: "not a url" }], translation: "original" }).success,
    ).toBe(false);
  });

  test("I18N-18 a locale without its own file shows the English one as not translated yet", () => {
    const entries = [entry("red-room/en", "original"), entry("red-room/ja", "machine")];
    expect(pickContent(entries, "red-room", "ja")).toEqual({ entry: entries[1], untranslated: false });
    expect(pickContent(entries, "red-room", "fr")).toEqual({ entry: entries[0], untranslated: true });
    expect(pickContent(entries, "red-room", "en")).toEqual({ entry: entries[0], untranslated: false });
  });

  test("PROD-27 a page without a file has no story", () => {
    expect(pickContent([entry("red-room/en", "original")], "evergreen", "en")).toBeNull();
  });

  test("DATA-22 folders are pages, file names are locales, and English is the one original", () => {
    const slugs = new Set(["red-room"]);
    expect(
      contentProblems("stories", [entry("red-room/en", "original"), entry("red-room/zh-hans", "human")], slugs),
    ).toEqual([]);
    expect(
      contentProblems(
        "stories",
        [
          entry("no-such-kit/en", "original"),
          entry("red-room/xx", "machine"),
          entry("red-room/en", "machine"),
          entry("red-room/fr", "original"),
        ],
        slugs,
      ),
    ).toEqual([
      "stories no-such-kit/en: no page has the slug no-such-kit",
      "stories red-room/xx: xx is not a locale",
      "stories red-room/en: English is the original",
      "stories red-room/fr: only English is the original",
    ]);
    expect(contentProblems("stories", [entry("red-room/ja", "machine")], slugs)).toEqual([
      "stories red-room/ja: red-room/en.md is missing",
    ]);
  });
});
