# CS Music Kit Archive: spec

What the site does and the rules its data follows, limited to what the code and tests do not already show. Change it in the same pull request as the behaviour. Requirements have IDs; a test that checks one names its ID in the title. Numbers skip where a requirement was removed. Decisions are at the end (D-*).

## Purpose

An unofficial fan site that presents every Counter-Strike music kit, from the default CS:GO music of 2012 to today, at musickitarchive.com. The game's own preview of a kit is short; here every track plays in full. All 28 languages CS2 ships. No accounts, no user content, no prices or trading, no 3D models, no server rendering.

The design reference is the claude.ai Design canvas "CS Music Kits Archive", page "Current design", style A "Supply Depot" (link in `CLAUDE.md`).

## Pages

| Route | Page |
|---|---|
| `/` | Picks a locale (PROD-5) |
| `/{locale}/` | Records: the rack |
| `/{locale}/kits/{kit-slug}/` | Record: one kit |
| `/{locale}/artists/` and `/{locale}/artists/{artist-slug}/` | Artists |
| `/{locale}/about/` | About |
| `/{locale}/404.html`, `/404.html` | Not found, status 404 |

- PROD-1 Pages work on a phone and never scroll sideways. Beyond that, phones are not a priority (D-021).
- PROD-2 Header: site name, Records, Artists, About, the language picker (all 28 locales by native name; opens the same page, keeping `#kit` and `?from=`) and a GitHub link. Below 640 px the picker shows only its globe and the GitHub link is left out.
- PROD-4 Footer: "Unofficial fan project. Not affiliated with or endorsed by Valve. Counter-Strike and all music kit names, artwork and audio belong to Valve and the respective artists.", data credits, links to the source code and `NOTICE`. No contact e-mail. The records page has a one-line version.
- PROD-5 `/` opens the remembered locale (`localStorage` `mka:locale`), else the best match for the browser's languages, else `en`. Without JavaScript it lists the 28 locales.
- PROD-6 Slugs are the same in every locale.
- PROD-7 The rack holds every kit by release date, then `defIndex`. Without JavaScript it is a list of links.
- PROD-12 The selected kit is kept in the URL hash (`#{kit-slug}`). Without a hash the newest kit is selected.
- PROD-13a The records page fits the screen and does not scroll, so scrolling never competes with moving the rack; on a screen too small it scrolls instead of overlapping.
- PROD-14 Record page, top to bottom: hero (title, English title when different, cover, facts), MVP anthem button, tracklist, Valve's description, story, more by the same artists, released the same day, previous and next, sources (the release note). Empty sections are left out.
- PROD-15 The default CS:GO kit (`defIndex` 70) also shows the unnamed alternate set (`defIndex` 2) as a second tracklist with a note.
- PROD-16 Artists index: more than one kit (most first); one kit each, by year; games and official (`brand`), by first release.
- PROD-19 An artist's discography is in release order, with "N years later" between kits whose release years differ by 3 or more.
- PROD-20 An artist with an MBID shows its MusicBrainz links (DATA-4a), service names untranslated, the MusicBrainz page last.
- PROD-21 An artist page opened from a kit (`?from={kit-slug}`) links back to that kit, else to the Artists index.
- PROD-22 Every track is the full file from the game.
- PROD-23a When match start and match end are the same audio (same SHA-256), the kit shows one row, "Match start and end".
- PROD-24 One player per record page; one track at a time; playback starts only on a click; leaving the page stops it (D-020).
- PROD-25a A kit whose audio is not published yet shows its tracklist without play buttons or MVP button, and says so.
- PROD-26 Audio comes only from `https://audio.musickitarchive.com/`.
- PROD-27 Stories (kit pages, "Story") and introductions (artist pages, "About", before the discography) are optional.
- PROD-28 Every factual claim in a story or introduction has a source, listed under the text. Primary or secondary sources (Wikipedia, the press) are fine, facts only, never copied text. Release dates still come only from DATA-14.
- PROD-29 Every page has a localized title and description, a canonical URL, `hreflang` for all 28 locales plus `x-default` (`en`), and Open Graph tags with the cover.
- PROD-30 The sitemap lists every page in every locale, without the root and not-found pages and without `hreflang` (the page heads have it).
- PROD-31 WCAG 2.2 AA: contrast, real buttons and links reachable by keyboard with a visible focus outline. The end-to-end tests run axe on each kind of page and Tab through each.
- PROD-34 Every page sets `lang`; text in another language (an English kit title on a Russian page) has its own `lang`.
- PROD-35 No JavaScript beyond the root page's locale pick, the language picker, the analytics loader, the rack (a React island), the record page's player (about 3 KB, no framework) and the artist page's back link.
- PROD-36 Lighthouse desktop performance 90 or more on the Records, Record and Artist pages: median of three runs in CI (`pnpm lighthouse`).
- PROD-37 Cloudflare Web Analytics only, loaded only on musickitarchive.com. No cookies, no banner.
- PROD-38 About page: what the site is, where the data comes from, links to the code, issues and licences.

## Data

Every field has one owner, and derived data is never edited by hand:

| Owner | Where | Edited by |
|---|---|---|
| Upstream snapshot | `data/upstream/` | `pnpm data:*` and `pnpm audio:*` scripts |
| Curated | `data/curated/` | People, in pull requests |
| Content | `content/` | People, in pull requests |
| Derived | `data/generated/` | `pnpm data:build` |

- DATA-1 `data/generated/` is exactly what `pnpm data:build` writes (`pnpm data:verify` in CI).
- DATA-2 Audio and game files are never committed. The one exception is the cover textures in `public/covers/textures/` (D-022).
- DATA-3 Sources, each pinned by commit in `data/upstream/meta.json`: SteamTracking/GameTracking-CS2 (music definitions, boxes, sound events, the VPK listing), ByMykel/counter-strike-file-tracker (the game's text in 28 languages), ByMykel/CSGO-API (editions, Steam icons). `pnpm data:sync` keeps only the subsets the site uses.
- DATA-4 MusicBrainz requests send `cs-music-kit-archive/1.0 ( https://github.com/shirodune/cs-music-kit-archive )` and are at least 1.1 s apart.
- DATA-4a `pnpm data:links` keeps one current link per kind: official site, Bandcamp, Spotify, Apple Music, SoundCloud, YouTube.
- DATA-4b `overrides.json` → `hiddenLinks` hides links whose site is gone or has changed hands (some became casino sites); the build fails when one is no longer on MusicBrainz. Check official sites when adding an MBID.
- DATA-5 A kit is a music definition with an English name: 101 today.
- DATA-6 `defIndex` 2 has audio but no name: it is the alternate set of 70, not a kit.
- DATA-8 StatTrak™ is an edition, not a kit: one kit per `defIndex`.
- DATA-9 The slug is the English title in lowercase ASCII words joined by `-`; `overrides.json` sets it when two would clash or it would be empty.
- DATA-10 The official name `Credit<separator>Title` is split into credit and title: a known credit at the start, else the English title at the end, else a separator that occurs once outside quotation marks. Otherwise `overrides.json` → `splits`, or the build fails. Translated credits are official text and kept.
- DATA-12 Every kit has a main menu track and an MVP anthem.
- DATA-13 A kit's release date is the day it first became obtainable in the game, as announced by Valve, in US Pacific time. A default kit is dated by the launch its music shipped with (D-009).
- DATA-14 Evidence, in order: the release notes of that day (old CS:GO blog to February 2023, Steam events after); an official post the same day when no release note names the kit; for a game launch only, the launch announcement with the Steam store date, the gap explained in `note`. GameTracking history, `first_sale_date`, wikis and the design canvas are leads, never sources.
  - DATA-14a Every kit is in exactly one release.
  - DATA-14b A release has `date`, `source.url`, `source.title` and `source.quote`, the quote copied verbatim and announcing the release.
  - DATA-14c `source.url` is on `blog.counter-strike.net`, `store.steampowered.com` or `www.counter-strike.net`.
  - DATA-14d `nameKey` is the box or collection's localization key, or `null`.
  - DATA-14e A box release lists exactly the box's loot.
  - `pnpm data:suggest-release` finds candidate posts for a kit without a release; it never writes `releases.json`.
- DATA-15 A collaboration credit links every member that has a kit of their own (Tree Adams and Ben Bromfield); otherwise the collaboration is one artist (TWERL, Ekko & Sidetrack).
- DATA-15a `musicbrainzId` is set only when the entry is clearly the credited artist, and stays `null` for brands without one, collaborations MusicBrainz lists only as members, and ambiguous names (Skog, Tim Huling, Matt Levine).
- DATA-16 Every kit has a main credit; every artist has a kit.
- DATA-17 Composers behind a `brand` credit may be named in its introduction, with sources; they are not credits unless Valve credits them.
- DATA-19 Covers are the game's own textures (`mp3_screen_color`), stored unchanged as PNG; pages show WebP copies. The Steam icon is the fallback until a texture is extracted.
- DATA-19a A texture is flat sleeve art: pages draw the disc, in the icon's 256:198 frame.
- DATA-20 Audio is read from the game's VPK (downloaded anonymously from Steam, app 730, depot 2347770, only the archives needed) and published to R2 at `/{internalName}/{file}.mp3` or `.wav`, exactly as the game stores it, never re-encoded.
- DATA-21 `audio-manifest.json` lists every published file with bytes, SHA-256 and measured duration; the site links only to listed files, and the measured duration wins over the sound events'. `pnpm audio:upload` uploads, then the manifest, then deletes, so the manifest never names a missing file.
- DATA-22 Stories are `content/stories/{kit-slug}/{locale}.md`, introductions `content/artists/{artist-slug}/{locale}.md`. `en.md` is the original and must exist (`content/README.md`).
- DATA-23 Front matter: `sources` (at least one `{ title, url }`, http or https) and `translation` (`original` only for English, `human` or `machine`).
- DATA-24 The weekly sync (`.github/workflows/weekly-sync.yml`, Mondays and on demand) fetches the data, extracts changed audio and covers, uploads the audio, and opens one pull request on `data-sync`. Every run rebuilds that branch from `main`.
- DATA-25 A new kit fails the build until it has a release and credits. The pull request lists the errors and the release suggestions; the fixes go to `main` in their own pull request, then the workflow runs again.
- DATA-26 `game-files.json` (from GameTracking's VPK listing) and `game-files-extracted.json` record the CRC of every sound file and cover texture the site uses, so `pnpm data:changes` tells what to extract without downloading anything. Only the extractors write the second file.

## Languages

- I18N-1 28 locales, all left to right, default `en`. The table lives once, in `src/i18n/locales.ts`.
- I18N-3 Every route starts with the locale, English included.
- I18N-7 UI messages are `messages/{segment}.json`, English the source. Keys are flat and dot-separated; a value is a string or a plural object with exactly the CLDR categories the locale uses; placeholders are `{name}`, the number `{count}`. `pnpm i18n:check` enforces this.
- I18N-12 No translation library ships to the browser; islands get their strings as props.
- I18N-12a Every locale has every message. The 27 translations are machine translated; Simplified Chinese is reviewed by the project owner, the other 26 are not reviewed yet. Game terms follow the game's own localization.
- I18N-13 Dates are formatted in UTC, so the day never shifts.
- I18N-16 Uppercase comes from CSS, never from changing the string.
- I18N-17 Content marked `machine` says so.
- I18N-18 A story or introduction missing in a locale shows the English text with `lang="en"` and a "not translated yet" notice.
- I18N-19 Fonts are self-hosted and split by script; a page loads the Latin faces plus its own script's fallbacks (`src/i18n/fonts.ts`).
- I18N-20 `font-synthesis: none` everywhere.

| Text | Source | Translation |
|---|---|---|
| Kit names, descriptions, box names | The game | Never edited or machine translated; missing in a locale → English with `lang="en"` |
| UI messages | `messages/` | Machine translation allowed |
| Stories and introductions | `content/` | English first, Simplified Chinese next, others may be machine translated |

## Decisions

Each: the decision, then why. To change one, add a new one and mark the old one replaced.

- D-001 Static site with Astro; the rack is a React island. The content changes weekly and is the same for everyone; about 5,000 pages fit Workers static assets.
- D-003 GitHub Actions deploy: every pull request gets a preview `pr-<number>` and a comment; `main` deploys after all checks. The Cloudflare token can only edit Workers scripts; fork pull requests get no secrets.
- D-005 Valve's game data (GameTracking, ByMykel's file tracker) is the source, not item sites: it is Valve's own and updates with every patch.
- D-007 Full-length audio on R2, never in git: about 1.6 GB, and a takedown of a public repository would remove all of it. Match start and end stay lossless WAV at the owner's choice.
- D-009 Default kits are dated by their game's launch (CS:GO 2012-08-21, CS2 2023-09-27): the archive is about the music, and Valve's description dates 70 to the CS:GO launch.
- D-010 "Artists", not "Composers": bands, rappers, games and companies are credited too.
- D-012 Own `t()` helper (about 20 lines) instead of an i18n library: nothing ships to the browser.
- D-013 Each script gets heavy, geometric fallback fonts: no stencil face exists for non-Latin scripts.
- D-016 Domain musickitarchive.com (Cloudflare), audio at audio.musickitarchive.com, public repository, Cloudflare Web Analytics.
- D-018 Licences: code MIT, `data/curated/` CC0, `content/` CC BY 4.0; third-party material is listed in `NOTICE`. No share-alike or non-commercial terms, so wikis and other projects can reuse the work.
- D-019 Build with Astro and deploy with Wrangler, not `cf deploy`: `cf` expects an adapter's server output, which a static site does not have. `cf` is fine for account and resource commands.
- D-020 The player lives on the record page: a site-wide player would need client-side routing on every page and a now-playing bar the design does not have.
- D-021 Phones are supported, not prioritized: work goes to content and desktop first; revisit if analytics show mostly phones.
- D-022 Covers are the game's textures, committed as stored (about 69 MB): the build stays self-contained.
- D-023 The weekly sync extracts and uploads audio in GitHub Actions. The job that runs third-party tools gets no secrets; only the upload job gets the R2 credentials, limited to the one bucket and only on `main`. R2's S3 API is used because Wrangler cannot use a bucket-scoped token. The sync starts CI on its branch with `workflow_dispatch`, because pushes with the workflow token start none.
