import { expect, test } from "vitest";
import { cleanText, slugify, splitName } from "../../scripts/data/text.ts";

test("DATA-9 slugs are lowercase ASCII words joined by -", () => {
  expect(slugify("Desert Fire")).toBe("desert-fire");
  expect(slugify("花脸 Hua Lian (Painted Face)")).toBe("hua-lian-painted-face");
  expect(slugify("Death’s Head Demolition")).toBe("deaths-head-demolition");
  expect(slugify("CHAIN$AW.LXADXUT.")).toBe("chain-aw-lxadxut");
  expect(slugify("Skeletá")).toBe("skeleta");
  expect(slugify("花脸")).toBe("");
});

test("DATA-10 splits on a known credit, with or without spaces around the separator", () => {
  expect(splitName("Austin Wintory, Desert Fire", ["Austin Wintory"])).toEqual({
    credit: "Austin Wintory",
    title: "Desert Fire",
  });
  expect(splitName("Scarlxrd: King, Scar", ["Scarlxrd"])).toEqual({ credit: "Scarlxrd", title: "King, Scar" });
  expect(splitName("New Beat Fund —Sponge Fingerz", ["New Beat Fund"])).toEqual({
    credit: "New Beat Fund",
    title: "Sponge Fingerz",
  });
});

test("DATA-10 does not split inside a translated credit", () => {
  // "Tree Adams" is followed by a word, not a separator, so rule 3 splits at " - ".
  expect(splitName("Tree Adams 和 Ben Bromfield - M.U.D.D. 军团", ["Tree Adams", "Ben Bromfield"])).toEqual({
    credit: "Tree Adams 和 Ben Bromfield",
    title: "M.U.D.D. 军团",
  });
});

test("DATA-10 finds an untranslated English title at the end", () => {
  expect(splitName("TWERL и Ekko & Sidetrack — Under Bright Lights", [], "Under Bright Lights")).toEqual({
    credit: "TWERL и Ekko & Sidetrack",
    title: "Under Bright Lights",
  });
});

test("DATA-10 ignores separators inside book-title marks", () => {
  expect(splitName("《半衰期：爱莉克斯》，反叛者", ["Half-Life: Alyx"], "Anti-Citizen")).toEqual({
    credit: "《半衰期：爱莉克斯》",
    title: "反叛者",
  });
  expect(splitName("《光环：士官长合集》", ["Halo"])).toBeNull();
});

test("cleans official strings", () => {
  expect(cleanText('\\"HAPPY HOLIDAYS\\"\\n    -Midnight Riders', { singleLine: false })).toBe(
    '"HAPPY HOLIDAYS"\n-Midnight Riders',
  );
  expect(cleanText("NIGHTMODE II<br>Music Kits", { singleLine: true })).toBe("NIGHTMODE II Music Kits");
  expect(cleanText("feel... <i>different</i> &amp; more", { singleLine: true })).toBe("feel... different & more");
});
