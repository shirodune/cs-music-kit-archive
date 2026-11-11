import { expect, test } from "vitest";
import { parseVdf } from "../../scripts/data/vdf.ts";

test("parses nested objects and strings", () => {
  const doc = parseVdf(`"items_game" { "music_definitions" { "3" { "name" "danielsadowski_01" } } }`);
  expect(doc).toEqual({ items_game: { music_definitions: { "3": { name: "danielsadowski_01" } } } });
});

test("merges repeated object blocks instead of replacing them", () => {
  const doc = parseVdf(`
    "items_game" {
      "music_definitions" { "1" { "name" "a" } }
      "other" { "x" "y" }
      "music_definitions" { "2" { "name" "b" } }
    }`);
  expect(doc).toEqual({
    items_game: { music_definitions: { "1": { name: "a" }, "2": { name: "b" } }, other: { x: "y" } },
  });
});

test("skips comments and platform conditionals, and reads escapes", () => {
  const doc = parseVdf(`
    // comment
    "root" {
      "quote" "say \\"hi\\"" [$WIN32]
      "path" "a\\\\b"
    }`);
  expect(doc).toEqual({ root: { quote: 'say "hi"', path: "a\\b" } });
});

test("rejects unbalanced braces", () => {
  expect(() => parseVdf(`"a" {`)).toThrow(/unclosed/);
  expect(() => parseVdf(`}`)).toThrow(/unexpected closing/);
});
