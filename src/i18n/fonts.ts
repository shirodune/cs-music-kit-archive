// Fallback faces for the non-Latin script groups (SPEC.md: D-013), chosen on the specimen https://claude.ai/artifact/CjfcNqJMpgT4XQCjsHXm99.
// This is the only place the table is written down: astro.config.ts loads the families,
// and Base.astro puts them into the font stacks of the pages that need them.

import type { ScriptGroup } from "./locales.ts";

export type FontRole = "stencil" | "condensed" | "mono" | "sans";

export interface FallbackFamily {
  /** Family name on Google Fonts. */
  readonly name: string;
  readonly cssVariable: `--font-${string}`;
  /** Weights, or a range such as "400 800" for a variable font (its weights share one file). */
  readonly weights: [number | string, ...(number | string)[]];
  /** Only the subsets of its own script: Latin text always uses the Latin faces. */
  readonly subsets: [string, ...string[]];
}

const family = (
  name: string,
  cssVariable: `--font-${string}`,
  weights: [number | string, ...(number | string)[]],
  subsets: [string, ...string[]],
): FallbackFamily => ({ name, cssVariable, weights, subsets });

const CYRILLIC_GREEK: [string, ...string[]] = ["cyrillic", "cyrillic-ext", "greek"];

// Weights follow the specimen; the browser picks the nearest one. Variable fonts take a range:
// listed one by one, their weights would share one file and all but the first would be dropped.
// Noto Sans SC/TC 900 is its own family because stencil heads are set at weight 400 but should
// get the heaviest face; it points at the same files as the 400–800 family.
const tektur = family("Tektur", "--font-tektur", [800], CYRILLIC_GREEK);
const sofiaSansCondensed = family("Sofia Sans Condensed", "--font-sofia-sans-condensed", ["400 800"], CYRILLIC_GREEK);
const jetbrainsMono = family("JetBrains Mono", "--font-jetbrains-mono", ["400 500"], ["greek"]);
const chakraPetch = family("Chakra Petch", "--font-chakra-petch", [700], ["thai"]);
const baiJamjuree = family("Bai Jamjuree", "--font-bai-jamjuree", [400, 600, 700], ["thai"]);
const plexSansThai = family("IBM Plex Sans Thai", "--font-plex-sans-thai", [400, 500], ["thai"]);
const delaGothicOne = family("Dela Gothic One", "--font-dela-gothic-one", [400], ["japanese"]);
const notoSansJp = family("Noto Sans JP", "--font-noto-sans-jp", ["400 800"], ["japanese"]);
const plexSansJp = family("IBM Plex Sans JP", "--font-plex-sans-jp", [400], ["japanese"]);
const blackHanSans = family("Black Han Sans", "--font-black-han-sans", [400], ["korean"]);
const doHyeon = family("Do Hyeon", "--font-do-hyeon", [400], ["korean"]);
const plexSansKr = family("IBM Plex Sans KR", "--font-plex-sans-kr", [400], ["korean"]);
const notoSansScHeavy = family("Noto Sans SC", "--font-noto-sans-sc-900", [900], ["chinese-simplified"]);
const notoSansSc = family("Noto Sans SC", "--font-noto-sans-sc", ["400 800"], ["chinese-simplified"]);
const notoSansTcHeavy = family("Noto Sans TC", "--font-noto-sans-tc-900", [900], ["chinese-traditional"]);
const notoSansTc = family("Noto Sans TC", "--font-noto-sans-tc", ["400 800"], ["chinese-traditional"]);

/** Fallback per role and script group. A missing role means the Latin face covers the script itself. */
export const SCRIPT_FALLBACKS: Record<ScriptGroup, Partial<Record<FontRole, FallbackFamily>>> = {
  latin: {},
  // IBM Plex Mono and Sans have Cyrillic; Plex Sans also has Greek.
  cyrillic: { stencil: tektur, condensed: sofiaSansCondensed },
  greek: { stencil: tektur, condensed: sofiaSansCondensed, mono: jetbrainsMono },
  thai: { stencil: chakraPetch, condensed: baiJamjuree, mono: plexSansThai, sans: plexSansThai },
  ja: { stencil: delaGothicOne, condensed: notoSansJp, mono: plexSansJp, sans: plexSansJp },
  ko: { stencil: blackHanSans, condensed: doHyeon, mono: plexSansKr, sans: plexSansKr },
  "zh-hans": { stencil: notoSansScHeavy, condensed: notoSansSc, mono: notoSansSc, sans: notoSansSc },
  "zh-hant": { stencil: notoSansTcHeavy, condensed: notoSansTc, mono: notoSansTc, sans: notoSansTc },
};

/** Every fallback family once, for the font configuration. */
export const FALLBACK_FAMILIES: readonly FallbackFamily[] = [
  ...new Set(Object.values(SCRIPT_FALLBACKS).flatMap((roles) => Object.values(roles))),
];

const GENERIC: Record<FontRole, string> = {
  stencil: "sans-serif",
  condensed: "sans-serif",
  mono: "monospace",
  sans: "sans-serif",
};

/**
 * Font stacks for a script group: the Latin face, then the group's fallback, then the generic family.
 * The Latin face goes first because the CJK subsets also carry Latin letters. Nothing may sit
 * between them that covers the script, such as a generic family or a local font, or it would win.
 */
export function fontStacks(script: ScriptGroup): Record<FontRole, string> {
  const roles = SCRIPT_FALLBACKS[script];
  const stack = (role: FontRole) =>
    [`var(--font-${role}-latin)`, roles[role] && `var(${roles[role].cssVariable})`, GENERIC[role]]
      .filter(Boolean)
      .join(", ");
  return { stencil: stack("stencil"), condensed: stack("condensed"), mono: stack("mono"), sans: stack("sans") };
}
