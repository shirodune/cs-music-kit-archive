import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { FALLBACK_FAMILIES, fontStacks, SCRIPT_FALLBACKS } from "../../src/i18n/fonts.ts";
import { LOCALES } from "../../src/i18n/locales.ts";

const LATIN_FAMILIES = ["Saira Stencil One", "Saira Condensed", "IBM Plex Mono", "IBM Plex Sans"];

describe("fonts", () => {
  test("every stack starts with the Latin face, then the group fallback, then a generic family", () => {
    for (const { script } of LOCALES) {
      for (const [role, stack] of Object.entries(fontStacks(script))) {
        const parts = stack.split(", ");
        expect(parts[0]).toBe(`var(--font-${role}-latin)`);
        expect(parts.at(-1)).toMatch(/^(sans-serif|monospace)$/);
        const fallback = SCRIPT_FALLBACKS[script][role as keyof ReturnType<typeof fontStacks>];
        expect(parts.slice(1, -1)).toEqual(fallback ? [`var(${fallback.cssVariable})`] : []);
      }
    }
    expect(fontStacks("zh-hans").stencil).toBe("var(--font-stencil-latin), var(--font-noto-sans-sc-900), sans-serif");
  });

  test("the fallbacks load only their own script, never Latin", () => {
    for (const family of FALLBACK_FAMILIES) {
      expect(
        family.subsets.filter((s) => s.startsWith("latin") || s === "vietnamese"),
        family.name,
      ).toEqual([]);
    }
  });

  test("D-018 every self-hosted font has its copyright notice in public/fonts/LICENSE.txt", () => {
    const licence = readFileSync(new URL("../../public/fonts/LICENSE.txt", import.meta.url), "utf8");
    expect(licence).toContain("SIL OPEN FONT LICENSE Version 1.1");
    for (const name of [...LATIN_FAMILIES, ...FALLBACK_FAMILIES.map((f) => f.name)]) {
      expect(licence, name).toMatch(new RegExp(`^${name}\\n  Copyright`, "m"));
    }
  });
});
