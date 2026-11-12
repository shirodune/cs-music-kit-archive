import { rename, rm } from "node:fs/promises";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
import { defineConfig, fontProviders } from "astro/config";
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

// Latin faces of the "Supply Depot" design (spec: product.md "Visual design", i18n.md "Fonts").
// Fonts are downloaded at build time and self-hosted (I18N-19).
// The fallback faces for the other script groups are added in a later change.
const latinSubsets: [string, ...string[]] = ["latin", "latin-ext", "vietnamese"];

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
      // `/` is our own page that picks a locale in the browser (I18N-4).
      redirectToDefaultLocale: false,
    },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Saira Stencil One",
      cssVariable: "--font-stencil-latin",
      weights: [400],
      styles: ["normal"],
      subsets: latinSubsets,
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Saira Condensed",
      cssVariable: "--font-condensed-latin",
      weights: [400, 600, 800],
      styles: ["normal"],
      subsets: latinSubsets,
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Mono",
      cssVariable: "--font-mono-latin",
      weights: [400, 500],
      styles: ["normal"],
      subsets: latinSubsets,
      fallbacks: ["monospace"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Sans",
      cssVariable: "--font-sans-latin",
      weights: [400, 500, 600],
      styles: ["normal"],
      subsets: latinSubsets,
      fallbacks: ["sans-serif"],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
