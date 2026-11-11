# Data

## Principle

Every field has exactly one owner. A field is either generated from an upstream source, curated by hand, written as content, or derived from the others. Nothing derived is ever edited by hand.

| Owner | Where it lives | Edited by |
|---|---|---|
| Upstream snapshot | `data/upstream/` | `pnpm data:sync` only |
| Curated | `data/curated/` | People, reviewed in pull requests |
| Content | `content/` | People, reviewed in pull requests |
| Derived | `data/generated/` | `pnpm data:build` only |

- DATA-1 `data/generated/` must be byte-identical to a fresh `pnpm data:build` run. CI rebuilds and compares.
- DATA-2 All of `data/` and `content/` is committed. Audio and extracted game files are never committed.

## Upstream sources

| Source | What we take | Pinned by |
|---|---|---|
| [SteamTracking/GameTracking-CS2](https://github.com/SteamTracking/GameTracking-CS2) `game/csgo/pak01_dir/scripts/items/items_game.txt` | Music definitions, music kit boxes and their loot lists | Commit SHA |
| GameTracking-CS2 `game/csgo/pak01_dir/soundevents/music/{internalName}/game_sounds_music.vsndevts` | Tracks per kit: cue, take, file, duration | Commit SHA |
| [ByMykel/counter-strike-file-tracker](https://github.com/ByMykel/counter-strike-file-tracker) `static/csgo_{valveLanguage}.json` | Official localized strings for all 28 languages | Commit SHA |
| [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API) `public/api/en/music_kits.json` | Cover image URL on the Steam CDN, StatTrak availability | Commit SHA |
| Old CS:GO blog, WordPress REST, category "Updates" (id 193) | Release evidence up to February 2023 | URL per release |
| Steam events for app 730 | Release evidence from 2023 on | URL per release |
| [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) | Artist links | MBID per artist |
| Game files on a maintainer's machine | Audio, high-resolution cover textures | File hashes |

- DATA-3 `data/upstream/meta.json` records the commit SHA and fetch time of every upstream repository. `pnpm data:sync` writes only the subsets we use (music definitions, music boxes, the music kit sound events, and localization keys starting with `musickit_`, `csgo_crate_musickit_` and the few others listed in the sync script), so snapshots stay small.
- DATA-4 MusicBrainz requests send a descriptive User-Agent and are spaced at least 1.1 seconds apart.

## Kit set

- DATA-5 A kit is a music definition in `items_game.txt` that has an English name in the localization files. Today there are 101.
- DATA-6 `defIndex` 2 (`valve_02`) has audio but no name in any language. It is not a kit. Its tracks are attached to `defIndex` 70 (Valve, CS:GO) as the alternate set (see PROD-15).
- DATA-7 Unused definition numbers (77 and 97 today) are ignored.
- DATA-8 StatTrak™ is an attribute, not a separate kit. Normal and StatTrak™ entries are merged by `defIndex`.

## Entities

### Kit

| Field | Owner | Notes |
|---|---|---|
| `defIndex` | Upstream | Primary key |
| `internalName` | Upstream | For example `austinwintory_01`. Names the sound folder and the cover |
| `slug` | Derived | DATA-9 |
| `name[locale]` | Upstream | Official full name, for example "Austin Wintory, Desert Fire" |
| `title[locale]` | Derived | DATA-10 |
| `credit[locale]` | Derived | The artist part of the official name |
| `description[locale]` | Upstream | HTML tags removed |
| `edition` | Upstream | `both`, `stattrakOnly` or `standardOnly` |
| `releaseId` | Curated | From `releases.json` |
| `artists` | Curated | From `credits.json`: list of `{ artistId, role }`, role `main` or `with` |
| `cover` | Derived | DATA-18 |
| `tracks` | Upstream | Track list below |
| `alternateTracks` | Upstream | Only on `defIndex` 70 |

- DATA-9 `slug` is the English title in lowercase ASCII words joined by `-`, for example `desert-fire`. Non-ASCII characters are dropped after Unicode normalization (`花脸 Hua Lian (Painted Face)` becomes `hua-lian-painted-face`). When two kits would share a slug, or a title produces an empty slug, `data/curated/overrides.json` sets it. Slugs must be unique and match `^[a-z0-9]+(-[a-z0-9]+)*$`.
- DATA-10 `title` is the official name with the leading credit and its separator removed. Separators seen in the files are `, `, ` - `, ` – `, ` — `, `: `, `，`, `：`. If a name cannot be split, `overrides.json` must give the title for that locale, or the build fails.

### Track

| Field | Owner | Notes |
|---|---|---|
| `cue` | Upstream | `mainmenu`, `chooseteam`, `startofmatch`, `startround`, `startaction`, `bombplanted`, `bombtenseccount`, `roundtenseccount`, `wonround`, `lostround`, `deathcam`, `roundmvpanthem`, `endofmatch` |
| `take` | Upstream | 1-based, for cues with several files |
| `file` | Upstream | File name without extension, for example `startround_02` |
| `durationSec` | Upstream | `vsnd_duration` from the sound event, else measured from the extracted audio |
| `audio` | Derived | `{ path, bytes, sha256 }` from `data/generated/audio-manifest.json`, once audio is extracted |

- DATA-11 When one sound event lists several takes with a single `vsnd_duration`, that duration applies to each take until the extracted audio gives exact values.
- DATA-12 Every kit must have a `mainmenu` and at least one `roundmvpanthem` track.

### Release

A release is one official update that made one or more kits available. Releases live in `data/curated/releases.json`.

```jsonc
{
  "id": "2019-12-16-scarlxrd",
  "date": "2019-12-16",
  "nameKey": null,
  "kits": [41],
  "source": {
    "url": "https://blog.counter-strike.net/2019/12/27541/",
    "title": "Release Notes for 12/16/2019",
    "quote": "A new music kit “King, Scar” by Scarlxrd is now available for purchase in-game."
  },
  "note": null
}
```

- DATA-13 The release date is the day a kit first became obtainable in the game (bought, or opened from a box), as announced by Valve, in US Pacific time.
- DATA-14 Evidence, in order of preference:
  1. The official release notes for that day (old CS:GO blog up to February 2023, Steam events after).
  2. An official announcement post from the same day, only when no release note mentions the kit.

  The GameTracking commit history, `first_sale_date` in `items_game.txt`, the Fandom wiki and the design canvas are only leads for finding the evidence. They are never stored as a source.
- Rules for `releases.json`, all enforced by CI:
  - DATA-14a Every kit belongs to exactly one release.
  - DATA-14b Every release has `date`, `source.url`, `source.title` and `source.quote`. `quote` is one sentence copied from the source that names the kit or its box.
  - DATA-14c `source.url` is on `blog.counter-strike.net`, `store.steampowered.com` or `www.counter-strike.net`.
  - DATA-14d `nameKey` is the localization key of the box or collection name (for example `csgo_crate_musickit_masterminds_capsule`), or `null` for kits released on their own.
- Special cases:
  - `defIndex` 70 (Valve, CS:GO) belongs to the 2014-10-10 release, the day music kits became selectable. Its `note` says it had been the default CS:GO music since 2012.
  - `defIndex` 1 (Valve, Counter-Strike 2) belongs to the 2023-09-27 release ("Added the new CS2 default music kit").
- `pnpm data:suggest-release` lists candidate notes for kits without a release. It prints suggestions only and never writes `releases.json`.

### Artist

Artists live in `data/curated/artists.json`. Credits live in `data/curated/credits.json`.

| Field | Owner | Notes |
|---|---|---|
| `id` | Curated | Also the slug |
| `name` | Curated | As the artist writes it |
| `type` | Curated | `person`, `group` or `brand`. `brand` covers games, companies and compilations, such as Valve, Halo, Half-Life: Alyx, Perfect World and Various Artists (Hotline Miami) |
| `aliases` | Curated | Other official credit spellings, for example Dren and Dren McDonald |
| `members` | Curated | Artist ids, for groups and collaborations that have their own page |
| `musicbrainzId` | Curated | Optional |
| `links` | Upstream | From MusicBrainz, written to `data/generated/` |

- DATA-15 A collaboration credit links to every member that has a kit of their own (Tree Adams and Ben Bromfield; The Verkkars & n0thing links to The Verkkars). A collaboration whose members have no kit of their own is one artist entry (TWERL, Ekko & Sidetrack; Repiet & Julia Kleijn).
- DATA-16 Every kit has at least one `main` credit. Every artist has at least one kit. Every artist id used in `credits.json` exists.
- DATA-17 Real composers behind a `brand` credit may be named in its introduction, with sources (PROD-28). They are not separate credits unless Valve credits them.

## Covers

- DATA-18 Every kit has a cover. The first source is the Steam CDN icon (256 × 198). `pnpm data:build` converts it to WebP at `public/covers/{slug}.webp` and records `cover.source = "icon"`.
- DATA-19 When the game's cover texture is extracted and is larger than the icon, it replaces the icon and `cover.source = "texture"`. The texture estimates are 256² for 2014–2016, 512² for 2019–2022 and 1024² for 2023 on; extraction confirms them.

## Audio

- DATA-20 Audio files are extracted from the game files with Source2Viewer-CLI and uploaded to the R2 bucket that serves `audio.musickitarchive.com`, at `/{internalName}/{file}.mp3`.
- DATA-20a Files the game stores as MP3 are published exactly as stored, without re-encoding. Today that is every cue except most `startofmatch` and `endofmatch` files.
- DATA-20b Files the game stores as uncompressed PCM (most `startofmatch` and `endofmatch` files, 44.1 kHz, 16-bit, stereo) are encoded once with ffmpeg to MP3 at the bitrate of the same kit's `mainmenu` track.
- DATA-21 `data/generated/audio-manifest.json` lists every uploaded file with bytes, SHA-256 and measured duration. The site links only to files in the manifest.

## Content

- DATA-22 Stories are `content/stories/{kit-slug}/{locale}.md`. Introductions are `content/artists/{artist-slug}/{locale}.md`.
- DATA-23 Front matter: `sources` (list of `{ title, url }`, at least one) and `translation` (`original`, `human` or `machine`).

## Weekly sync

- DATA-24 A scheduled workflow runs `pnpm data:sync` and `pnpm data:build` every week. When anything changes it opens a pull request.
- DATA-25 A new kit makes the checks fail until it has a release, credits and, when needed, slug or title overrides. The pull request body lists the missing items and the `data:suggest-release` output.
