# CS Music Kit Archive

Unofficial, non-commercial fan site that presents every Counter-Strike music kit with full tracklists, in all 28 CS2 languages. Live at musickitarchive.com (planned).

## Read the spec first

`spec/` is the single source of truth. Read `spec/README.md`, then the file for the area you are working on, before changing anything.
- `spec/product.md`: pages, routes, interactions (PROD-*)
- `spec/data.md`: data sources, field ownership, release dates (DATA-*)
- `spec/i18n.md`: locales, messages, plurals, fonts (I18N-*)
- `spec/decisions.md`: decisions and their reasons (D-*)

When behaviour changes, update the spec in the same change. Tests that check a requirement name its ID in the test title, for example `test("DATA-14a every kit belongs to one release", …)`.

## Stack

Astro 7 (static output) with React islands, Tailwind CSS 4, TypeScript 6 (Astro's checker does not support TypeScript 7 yet), Node 26 (`.node-version`), pnpm, Biome, Vitest, Playwright. Hosted on Cloudflare Workers static assets; audio on R2.

## Rules

- Use `pnpm`, never npm or yarn. pnpm refuses packages published less than a day ago; pick an older version instead of adding exclusions. Build scripts are allowed only for the packages in `pnpm-workspace.yaml` (`allowBuilds`).
- Before pushing, run `pnpm verify` (lint, types, i18n check, unit tests, build, end-to-end tests).
- Cloudflare: build with `pnpm build`, deploy with Wrangler (`wrangler.jsonc`, D-019). Never run `cf init`, `cf build` or `cf deploy` here: `cf` treats Astro as a server-rendered app. `cf` is fine for account and resource commands (R2, DNS).
- Astro questions: use the `astro-docs` MCP server (`.mcp.json`) for current APIs instead of memory.
- Never edit `data/generated/` or `data/upstream/` by hand. Change curated files or scripts, then run `pnpm data:build`.
- Never commit audio, game files or extracted textures (`.gitignore` blocks the common types).
- Release dates come only from Valve release notes or same-day announcements, with URL and quote (DATA-13, DATA-14). Never take a date from git history, `first_sale_date`, wikis or the design canvas.
- Official Valve text (kit names, descriptions, box names) is never edited or machine translated.
- UI strings go through `t()` with plural objects (I18N-7 to I18N-11). Never build plurals by string concatenation.
- Secrets never go in the repository. The deploy token lives in the GitHub `production` environment.

## Language

Spec, code, comments, commit messages and pull requests are in English. The project owner prefers replies in Simplified Chinese.

## Design reference

claude.ai Design canvas "CS Music Kits Archive", page "Current design", style A "Supply Depot":
https://claude.ai/code/artifact/df9305bc-d874-4959-ac79-7f34326b38f5
Fallback font specimen: https://claude.ai/artifact/CjfcNqJMpgT4XQCjsHXm99
