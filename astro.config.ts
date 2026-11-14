import { rename, rm } from "node:fs/promises";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
import { defineConfig, fontProviders } from "astro/config";
import { FALLBACK_FAMILIES } from "./src/i18n/fonts.ts";
import { DEFAULT_LOCALE, LOCALE_SEGMENTS } from "./src/i18n/locales.ts";

// Cloudflare serves the nearest `404.html` for unknown paths ("404-page" handling).
// Astro writes `[locale]/404.astro` to `{locale}/404/index.html`; move it to `{locale}/404.html`
// so `/ru/no-such-page/` gets the Russian not-found page.
const localizedNotFound: AstroIntegration = {
  name: "localized-not-found",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      for (const segment of LOCALE_SEGMENTS) {
        await rename(new URL(`${segment}/404/index.html`, dir), new URL(`${segment}/404.html`, dir));
        await rm(new URL(`${segment}/404/`, dir), { recursive: true });
      }
    },
  },
};

// Fonts are downloaded at build time and self-hosted. Each face is split by script
// (`unicode-range`), so a page downloads only the files for the characters it shows.
// The Latin faces of the "Supply Depot" design (the design reference in CLAUDE.md) also bring the
// Cyrillic and Greek that IBM Plex has; the other scripts use the fallbacks in src/i18n/fonts.ts.
// No family gets a generic or metric-adjusted fallback here: those would come before the script
// fallbacks in the font stack and take their characters. Base.astro writes the stacks (fontStacks).
const latinSubsets: [string, ...string[]] = ["latin", "latin-ext", "vietnamese"];
// The fallbacks come from Google Fonts: Fontsource serves each CJK weight as one file of about
// 1 MB, Google as about 100 slices, so a page downloads only the slices for its characters.
const face = (
  name: string,
  cssVariable: string,
  weights: [number | string, ...(number | string)[]],
  subsets: [string, ...string[]],
  provider = fontProviders.fontsource(),
) => ({
  provider,
  name,
  cssVariable,
  weights,
  styles: ["normal"] as ["normal"],
  subsets,
  fallbacks: [],
  optimizedFallbacks: false,
});

// PROD-30: every page in every locale. The alternates live only in each page's head (PROD-29).
// The root page only picks a locale (noindex), and not-found pages are left out.
const site = "https://musickitarchive.com";
const sitemapIntegration = sitemap({
  filter: (page) => page !== `${site}/` && !/\/404\/?$/.test(page),
  namespaces: { news: false, xhtml: false, image: false, video: false },
});

export default defineConfig({
  site,
  trailingSlash: "always",
  integrations: [react(), localizedNotFound, sitemapIntegration],
  i18n: {
    locales: [...LOCALE_SEGMENTS],
    defaultLocale: DEFAULT_LOCALE,
    routing: {
      // Every locale, English too, has a URL prefix (I18N-3).
      prefixDefaultLocale: true,
      // `/` is our own page that picks a locale in the browser (PROD-5).
      redirectToDefaultLocale: false,
    },
  },
  fonts: [
    face("Saira Stencil One", "--font-stencil-latin", [400], latinSubsets),
    face("Saira Condensed", "--font-condensed-latin", [400, 600, 800], latinSubsets),
    face("IBM Plex Mono", "--font-mono-latin", [400, 500], [...latinSubsets, "cyrillic", "cyrillic-ext"]),
    face("IBM Plex Sans", "--font-sans-latin", [400, 500, 600], [...latinSubsets, "cyrillic", "cyrillic-ext", "greek"]),
    ...FALLBACK_FAMILIES.map((f) => face(f.name, f.cssVariable, f.weights, f.subsets, fontProviders.google())),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
