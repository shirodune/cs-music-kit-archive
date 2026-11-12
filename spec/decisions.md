# Decisions

Each entry: what was decided, and why. All entries below were made on 2026-11-11 unless noted.
To change one, add a new entry that replaces it and mark the old one "Replaced by D-NNN".

## D-001 Static site built with Astro 7

The site is generated at build time with Astro (static output). Interactive parts (rack, player, language picker) are React islands.
- Why: the content changes about once a week and is the same for every visitor. Astro is built for content sites, ships no JavaScript by default, and produces about one HTML file per page. That matters with about 190 pages × 28 locales and the 20,000-file limit of Workers static assets on the free plan.
- Considered: Next.js static export (ships the React runtime and RSC payload files for every page); Next.js server rendering on Workers with vinext or OpenNext (vinext is beta, the free plan allows 10 ms CPU per request, and every view would be a Worker invocation); Next.js on Vercel.

## D-002 Hosting on Cloudflare Workers static assets, deployed with `cf`

The deploy tool part is replaced by D-019. Hosting on Workers static assets still holds.

- Static asset requests are free and unlimited. The audio sits next to it on R2.
- The project is deployed with the `cf` CLI. `cloudflare.config.ts` and `wrangler.config.ts` (with `assetsDirectory`) are written by hand. Never run `cf init` in this project, because it reconfigures Astro or Next.js projects for server rendering.
- Wrangler is used only for the few commands `cf` does not support yet.

## D-003 Deploy from GitHub Actions

Pull requests run all checks and deploy a named preview. Pushes to `main` deploy to production only after the checks pass. The commands are in D-019.
- The Cloudflare API token has only the "Workers Scripts: Edit" permission. The same token is stored in two GitHub environments: `production` (deployments from `main` only) and `preview`. Pull requests from forks get no secrets and no preview.
- Each pull request gets the preview `pr-<number>` on workers.dev, and a comment with its URL. Cloudflare serves previews with `X-Robots-Tag: noindex`. Closing the pull request deletes the preview (`preview-cleanup.yml`).
- Adding or changing a custom domain needs the "Workers Routes: Edit" permission on the zone, which the token does not have. A maintainer does that once with `wrangler deploy` from their own machine (done 2026-11-12). After that, deploys that leave the domain unchanged need only the token.
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

Defined in DATA-13 and DATA-14. All 26 releases have an official note or post. The design canvas matched 24 of the 25 music kit releases it showed. The difference: Scarlxrd's "King, Scar" was released on 2019-12-16 (release notes); the canvas used the next day's blog post.
- GameTracking commit history and `first_sale_date` were rejected as sources: the first is the tracking bot's time and breaks when folders move; the second is an internal date that runs days to months early.

## D-009 Default kits

`defIndex` 70 (Valve, CS:GO) is dated 2012-08-21, the launch of CS:GO. `defIndex` 1 (Valve, Counter-Strike 2) is dated 2023-09-27, the launch of CS2. `defIndex` 2 is shown as the alternate track set of 70, not as a kit.
- Why: the archive is about the music. Valve's own description of 70 says "The default CS:GO music kit, introduced with the launch of CS:GO in 2012", so a default kit is dated by the launch its music shipped with.
- Evidence: the Steam store gives the release date as "21 Aug, 2012". The launch announcement ("Counter-Strike: Global Offensive is now available on Steam!") was posted on 2012-08-22 Pacific time, so this release cites it under DATA-14 rule 3 and explains the gap in `note`.
- History kept in the release `note`: selectable as a music kit from 2014-10-10 (inferred: the release notes introduce music kits but do not name the default one); granted as a separate inventory item on 2023-09-27 (CS2 launch notes: "CS:GO Players who started playing more than a week ago will receive a commemorative CS:GO coin and CS:GO Music Kit").
- Rejected: 2014-10-10 (an inference, no quote names the kit) and 2023-09-27 (dates the inventory item, not the music).

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

- Domain: musickitarchive.com, registered at Cloudflare Registrar on 2026-11-12. `www` redirects to it with a 301 (a Cloudflare redirect rule). Audio at `audio.musickitarchive.com`, the custom domain of the R2 bucket `cs-music-kit-audio`.
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
- Self-hosted fonts ship with the OFL and their copyright notices in `public/fonts/LICENSE.txt`.

## D-019 Deploy with Wrangler, not `cf` (replaces the deploy tool in D-002)

Decided 2026-11-11 while building the skeleton.

- `wrangler.jsonc` points `assets.directory` at `./dist`, with `html_handling: "auto-trailing-slash"` and `not_found_handling: "404-page"`. There is no Worker code (`main`).
- Production is served only at the custom domain musickitarchive.com (`routes`, `workers_dev: false`). `preview_urls: true` turns on the workers.dev URLs that previews use; `wrangler deploy` applies it, not `wrangler preview`.
- `public/_headers` caches the hashed files under `/_astro/` for a year. Everything else keeps Cloudflare's default (revalidate with the ETag).
- Build with `pnpm build` (Astro), then deploy with `wrangler deploy`. Pull request previews use `wrangler preview --name pr-<number>` and `wrangler preview delete`.
- `cf` is still used for account and resource commands (R2 buckets, DNS) from a maintainer's machine. It is not a project dependency.
- Why: `cf deploy` detects Astro, runs `astro build` itself and then expects the Build Output that only the `@astrojs/cloudflare` adapter writes. That adapter is for on-demand rendering, which this site does not use. Cloudflare's own guide for fully prerendered Astro sites uses a Wrangler configuration and `wrangler deploy`. The Cloudflare plugin's rule ("a project with a Wrangler configuration keeps Wrangler for deploy; `cf` resource commands are fine alongside it") matches this.
- Revisit when `cf` supports static framework output without an adapter.
