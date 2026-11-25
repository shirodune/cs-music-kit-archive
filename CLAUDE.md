# CS Music Kit Archive

Unofficial site that presents every Counter-Strike music kit with full tracklists. Live at musickitarchive.com.

## Read the spec first

`SPEC.md` is the single source of truth: pages, data rules, languages (PROD-*, DATA-*, I18N-*) and decisions with their reasons (D-*). Read it before changing behaviour, and update it in the same change. It holds only what the code and tests do not show. Tests that check a requirement name its ID in the test title, for example `test("DATA-14a every kit belongs to one release", …)`.

## Stack

Astro 7 (static output) with React islands, Tailwind CSS 4, TypeScript 6 (Astro's checker does not support TypeScript 7 yet), Node 26 (`.node-version`), pnpm, Biome, Vitest, Playwright. Hosted on Cloudflare Workers static assets; audio on R2.

## Rules

- Use `pnpm`, never npm or yarn. pnpm refuses packages published less than a day ago; pick an older version instead of adding exclusions. Build scripts are allowed only for the packages in `pnpm-workspace.yaml` (`allowBuilds`).
- Every change reaches `main` through a squash-merged pull request; a ruleset requires it and the CI checks. Before pushing, run `pnpm verify` (lint, types, i18n check, unit tests, build, end-to-end tests).
- Cloudflare: build with `pnpm build`, deploy with Wrangler (`wrangler.jsonc`, D-019). Never run `cf init`, `cf build` or `cf deploy` here: `cf` treats Astro as a server-rendered app. `cf` is fine for account and resource commands (R2, DNS).
- Astro questions: use the `astro-docs` MCP server (`.mcp.json`) for current APIs instead of memory.
- Never edit `data/generated/` or `data/upstream/` by hand. Change curated files or scripts, then run `pnpm data:build`.
- Never commit audio or game files (`.gitignore` blocks the common types). The one exception is the cover textures in `public/covers/textures/`, written by `pnpm data:textures` (D-022).
- Release dates come only from Valve release notes or same-day announcements, with URL and quote (DATA-13, DATA-14). Never take a date from git history, `first_sale_date`, wikis or the design canvas.
- Official Valve text (kit names, descriptions, box names) is never edited or machine translated.
- UI strings go through `t()` (`src/i18n/t.ts`) in `messages/{segment}.json`: flat dot-separated keys; a plural is an object with exactly the CLDR categories the locale uses, the number is `{count}`. Never build plurals by string concatenation. `pnpm i18n:check` enforces this.
- No translation library in the browser: islands get their strings as props. Format dates in UTC so the day never shifts. Uppercase comes from CSS (`text-transform`), never from changing the string. `font-synthesis: none` everywhere; each script's fallback fonts are in `src/i18n/fonts.ts`.
- New kits: follow "New kits" in `docs/maintainers.md`.
- Written content (stories, introductions, curated facts) is checked fact by fact against its sources by someone other than the writer, such as a second agent, before the owner reviews it; see "Writing and checking" in `content/README.md`. Chinese text puts kit names in 《》, with Valve's official Chinese names.
- Public text stays plain, like comparable fan sites: no extra emphasis. Before writing README- or About-style text, look at popular comparable projects (Paimon.moe, Destiny Item Manager, FFXIV Teamcraft) and match their level of detail. A one-line description says what the site is, every music kit with its full tracklist, not a feature such as its languages.
- A feature that is not thought through: interview the owner with multiple-choice questions until it can be written into the spec, then build it.
- Interface changes start from the common pattern for that kind of element and land in one change, not in a series of small tweaks.
- Code reviews fix only what affects correctness. Leave out style, and code or tests for cases that cannot happen.
- Secrets never go in the repository. The deploy token lives in the GitHub `production` and `preview` environments.

## Language

Spec, code, comments, commit messages and pull requests are in English. The project owner prefers replies in Simplified Chinese.

## Design reference

claude.ai Design canvas "CS Music Kits Archive", page "Current design", style A "Supply Depot":
https://claude.ai/code/artifact/df9305bc-d874-4959-ac79-7f34326b38f5
Fallback font specimen: https://claude.ai/artifact/CjfcNqJMpgT4XQCjsHXm99
