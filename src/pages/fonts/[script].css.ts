// The @font-face rules of a script group's fallback faces, as one cacheable stylesheet (I18N-19).
// <Font> would inline them into every page: a CJK group has hundreds of rules (one per slice).
// The CSS comes from the same module Astro's own <Font> component reads.

// @ts-expect-error The module has types only while Astro runs.
import { componentDataByCssVariable } from "virtual:astro:assets/fonts/internal";
import type { APIRoute, GetStaticPaths } from "astro";
import { SCRIPT_FALLBACKS } from "../../i18n/fonts.ts";
import type { ScriptGroup } from "../../i18n/locales.ts";

const fontCss = componentDataByCssVariable as Map<string, { css: string }>;

export const getStaticPaths = (() =>
  Object.keys(SCRIPT_FALLBACKS)
    .filter((script) => script !== "latin")
    .map((script) => ({ params: { script } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const families = new Set(Object.values(SCRIPT_FALLBACKS[params.script as ScriptGroup]));
  const css = [...families].map((family) => {
    const data = fontCss.get(family.cssVariable);
    if (!data) throw new Error(`no font data for ${family.cssVariable}`);
    return data.css;
  });
  return new Response(css.join("\n"), { headers: { "Content-Type": "text/css; charset=utf-8" } });
};
