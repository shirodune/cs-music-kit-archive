import { expect, test } from "vitest";
import { parseKv3 } from "../../scripts/data/kv3.ts";

const sample = `<!-- kv3 encoding:text:version{e21c7f3c-8a33-41c5-9977-a76d3a32aa0d} format:generic:version{7412167c-06e9-4698-aff2-e63eb59037e7} -->
{
	Music.MVPPreview.austinwintory_01 =
	{
		type = "csgo_music"
		volume = 0.8
		stop_music = "true"
		vsnd_files =
		[
			"sounds/music/austinwintory_01/roundmvpanthem_01.vsnd",
		]
		vsnd_duration = 10.736326
	}
	// a comment
	Music.Background.austinwintory_01 = { vsnd_files = "sounds/music/austinwintory_01/mainmenu.vsnd" loop = true }
}`;

test("parses a sound event file", () => {
  expect(parseKv3(sample)).toEqual({
    "Music.MVPPreview.austinwintory_01": {
      type: "csgo_music",
      volume: 0.8,
      stop_music: "true",
      vsnd_files: ["sounds/music/austinwintory_01/roundmvpanthem_01.vsnd"],
      vsnd_duration: 10.736326,
    },
    "Music.Background.austinwintory_01": { vsnd_files: "sounds/music/austinwintory_01/mainmenu.vsnd", loop: true },
  });
});

test("reads flagged values, multi-line strings, null and block comments", () => {
  const doc = parseKv3(`{ a = resource:"x.vsnd" /* note */ b = """
line one
line two
""" c = null d = -1.5 }`);
  expect(doc).toEqual({ a: "x.vsnd", b: "line one\nline two", c: null, d: -1.5 });
});

test("reports the line of a syntax error", () => {
  expect(() => parseKv3("{\n a = \n}")).toThrow(/line 3/);
});

test("DATA-3 a __proto__ key is refused, so it cannot change any object's prototype", () => {
  expect(() => parseKv3("{ __proto__ = { polluted = 1 } }")).toThrow("__proto__");
});
