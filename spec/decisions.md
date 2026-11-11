# Decisions

Each entry: what was decided, and why. All entries below were made on 2026-11-11 unless noted.
To change one, add a new entry that replaces it and mark the old one "Replaced by D-NNN".

## D-001 Static site built with Astro 7

The site is generated at build time with Astro (static output). Interactive parts (rack, player, language picker) are React islands.
- Why: the content changes about once a week and is the same for every visitor. Astro is built for content sites, ships no JavaScript by default, and produces about one HTML file per page. That matters with about 190 pages × 28 locales and the 20,000-file limit of Workers static assets on the free plan.
- Considered: Next.js static export (ships the React runtime and RSC payload files for every page); Next.js server rendering on Workers with vinext or OpenNext (vinext is beta, the free plan allows 10 ms CPU per request, and every view would be a Worker invocation); Next.js on Vercel.

## D-002 Hosting on Cloudflare Workers static assets, deployed with `cf`

- Static asset requests are free and unlimited. The audio sits next to it on R2.
- The project is deployed with the `cf` CLI. `cloudflare.config.ts` and `wrangler.config.ts` (with `assetsDirectory`) are written by hand. Never run `cf init` in this project, because it reconfigures Astro or Next.js projects for server rendering.
- Wrangler is used only for the few commands `cf` does not support yet.

## D-003 Deploy from GitHub Actions

Pull requests run all checks and deploy a named preview (`cf previews deploy`). Pushes to `main` deploy to production only after the checks pass.
- The Cloudflare API token has only the "Workers Scripts: Edit" permission and is stored in the GitHub `production` environment.
- Considered: Cloudflare Workers Builds (no secret in GitHub, but deploys do not wait for GitHub checks, and Node 26 was not confirmed in its build image).

## D-004 Toolchain

TypeScript, Node 26 LTS (`.node-version`), pnpm, Biome, Vitest, Playwright, Tailwind CSS 4.

## D-005 Valve game data is the primary data source

GameTracking-CS2 for definitions and tracks; ByMykel's file tracker for the official text in 28 languages. Third-party item sites are not used as sources. See `data.md`.
- Why: it is Valve's own data, updated with every game patch. ByMykel's hosted API only ships two languages and has at least one wrong mapping (`defIndex` 2).

## D-006 StatTrak™ is an attribute of a kit

One kit per `defIndex`. The edition field says whether StatTrak™ exists. Seven Radicals kits exist only as StatTrak™.

## D-007 Full-length audio, hosted on R2, never in git

Every track is the full game file, as csgoskins.gg and the Fandom wiki do.
- MP3 files are published exactly as the game stores them (mostly 128 kbps; a few 160 or 256 kbps). csgoskins.gg serves the same files: its Desert Fire main menu file is 2,615,589 bytes, the game's is 2,616,389 bytes including the container. Only the uncompressed match start and match end files are encoded to MP3 (DATA-20b): as stored they are 926 MB for 2 hours of audio.
- Not in git because of size (about 650 MB), because a takedown on a public repository would remove the whole repository, and because the files can be rebuilt from the game.

## D-008 Release dates come from Valve's release notes

Defined in DATA-13 and DATA-14. All 28 release batches have an official note or post. The design canvas matched 27 of 28. The difference: Scarlxrd's "King, Scar" was released on 2019-12-16 (release notes); the canvas used the next day's blog post.
- GameTracking commit history and `first_sale_date` were rejected as sources: the first is the tracking bot's time and breaks when folders move; the second is an internal date that runs days to months early.

## D-009 Default kits

`defIndex` 70 (Valve, CS:GO) is dated 2014-10-10, the day music kits became selectable. `defIndex` 1 (Valve, Counter-Strike 2) is dated 2023-09-27. `defIndex` 2 is shown as the alternate track set of 70, not as a kit.

## D-010 "Artists", not "Composers"

Bands, rappers, games and companies are credited, not only composers. Artists have a type (`person`, `group`, `brand`) and aliases. Credits keep the official text. See `data.md`.

## D-011 All 28 CS2 languages, prefixed URLs

Every locale, including English, has a URL prefix. `/` picks a locale with a few lines of JavaScript. See `i18n.md`.

## D-012 Own `t()` helper instead of an i18n library

Plurals use `Intl.PluralRules` with one form per CLDR category, checked in CI. Dates, lists and numbers use `Intl`.
- Why: about 20 lines of code, no dependency, nothing shipped to the browser. Astro has no built-in message formatting. Paraglide JS was the alternative.

## D-013 Fallback fonts per script

Google Fonts has no stencil face for any non-Latin script. Each script gets heavy, geometric fallbacks that keep the feel (table in `i18n.md`).

## D-014 Covers start from the Steam icons

256 × 198 icons now. High-resolution textures from the game files replace them where they exist (mostly 2019 and later). No 3D models.

## D-015 Non-commercial fan project

No ads, sponsors or payments. The footer carries a disclaimer and a link to the source code. No contact e-mail address is published.

## D-016 Domain, repository, analytics

- Domain: musickitarchive.com, registered at Cloudflare Registrar. Audio at `audio.musickitarchive.com`.
- Repository: <https://github.com/shirodune/cs-music-kit-archive> (public).
- Analytics: Cloudflare Web Analytics.

## D-017 Stories and introductions are optional and sourced

They are written later, from sourced facts, never copied from wikis (Wikipedia and Fandom are CC BY-SA). English first, then Simplified Chinese, then translation.

## D-018 Licences

| What | Licence |
|---|---|
| Code: `src/`, `scripts/`, tests, configuration | MIT (`LICENSE`) |
| Our curated data: `data/curated/` (release dates, artists, credits, overrides) | CC0 1.0 (`LICENSE-DATA`) |
| Our writing: `content/` (stories, introductions) | CC BY 4.0 (`LICENSE-CONTENT`) |
| Third-party material: Valve's names, descriptions, covers, audio and release-note quotes; the game data excerpts in `data/upstream/`; ByMykel's data (MIT); MusicBrainz links (CC0); fonts (SIL OFL 1.1) | Not licensed by us. Listed with owners and licences in `NOTICE` |

- Why: MIT matches the tools we build on. The curated data is facts (dates, credits); CC0, as MusicBrainz uses for its core data, lets projects such as ByMykel's API absorb it without any conditions. Stories are creative writing, so CC BY 4.0 asks for credit. Share-alike and non-commercial terms were left out because they block wikis and other projects from reusing the work; CC BY content can still go into CC BY-SA wikis.
- Compared with similar projects (ByMykel's API: MIT for everything; PokeAPI: BSD-3 for everything plus a trademark line; GameTracking: no licence), separating our work from third-party material in `NOTICE` is stricter than usual.
- Self-hosted fonts ship with their OFL licence files.
