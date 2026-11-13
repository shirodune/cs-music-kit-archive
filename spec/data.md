# Data

## Principle

Every field has exactly one owner. A field is either generated from an upstream source, curated by hand, written as content, or derived from the others. Nothing derived is ever edited by hand.

| Owner | Where it lives | Edited by |
|---|---|---|
| Upstream snapshot | `data/upstream/` | The `pnpm data:*` and `pnpm audio:*` scripts only |
| Curated | `data/curated/` | People, reviewed in pull requests |
| Content | `content/` | People, reviewed in pull requests |
| Derived | `data/generated/` | `pnpm data:build` only |

- DATA-1 `data/generated/` must be byte-identical to a fresh `pnpm data:build` run. CI rebuilds and compares.
- DATA-2 All of `data/`, `content/` and `public/covers/` is committed. Audio and extracted game files are never committed, with one exception: the cover textures in `public/covers/textures/` (DATA-19, D-022).

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

- DATA-3 `data/upstream/meta.json` records the commit SHA and fetch time of every upstream repository. `pnpm data:sync` writes only the subsets we use (music definitions, music boxes, the music kit sound events, the VPK listing of each kit's sound files and cover textures (DATA-26), and localization keys starting with `musickit_`, `csgo_crate_musickit_` and the few others listed in the sync script), so snapshots stay small.
- DATA-4 MusicBrainz requests send a descriptive User-Agent and are spaced at least 1.1 seconds apart.
- DATA-4a `pnpm data:links` reads each artist's MusicBrainz URL relations that have not ended and keeps one link of each kind the artist page shows: official site, Bandcamp, Spotify, Apple Music, SoundCloud and YouTube, in that order (the first by URL when there are several). It writes them to `data/upstream/musicbrainz.json`, keyed by MBID. `pnpm data:build` adds the MusicBrainz page itself as the last link, and fails when an artist has an MBID that the file does not list.
- DATA-4b MusicBrainz can keep a link after the site is gone or its domain has changed hands. `overrides.json` → `hiddenLinks` lists such URLs with the reason and the date checked; `pnpm data:build` leaves them out, and fails when one is no longer on MusicBrainz. Five official sites were hidden on 2026-11-13, two of them now casino or gambling sites. Check the official sites again when adding an MBID.

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
- DATA-10 `credit` and `title` split the official name `Credit<separator>Title`. A separator is one punctuation mark (`,` `，` `:` `：` `、` or a dash), with or without spaces; separators inside book-title marks or quotation marks (`《》` `「」` `“”` `«»`) do not count. The build tries, in order:
  1. a known credit text at the start: an artist's name or alias, or the `credit` in `credits.json`;
  2. the English title at the end, when the locale kept it untranslated;
  3. a separator from ` — ` ` – ` ` - ` `: ` `：` `，` `、` `, ` that occurs exactly once.

  When none applies, or the result is wrong (some locales put the title first), `overrides.json` → `splits` gives the credit and title for that kit and locale, or the build fails. Credits are translated in some locales ("Various Artists", "TWERL and Ekko & Sidetrack", "Perfect World" → "完美世界"); that is official text and is kept.

### Track

| Field | Owner | Notes |
|---|---|---|
| `cue` | Upstream | `mainmenu`, `chooseteam`, `startofmatch`, `startround`, `startaction`, `bombplanted`, `bombtenseccount`, `roundtenseccount`, `wonround`, `lostround`, `deathcam`, `roundmvpanthem`, `endofmatch` |
| `take` | Upstream | 1-based, for cues with several files |
| `file` | Upstream | File name without extension, for example `startround_02` |
| `durationSec` | Upstream | Measured from the published file (DATA-21), else `vsnd_duration` from the sound event |
| `audio` | Derived | `{ path, bytes, sha256 }` from `data/upstream/audio-manifest.json`; `null` while the file is not published |

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

- DATA-13 The release date is the day a kit first became obtainable in the game (bought, or opened from a box), as announced by Valve, in US Pacific time. For a default kit, which every player has, it is the day its music first shipped with the game.
- DATA-14 Evidence, in order of preference:
  1. The official release notes for that day (old CS:GO blog up to February 2023, Steam events after).
  2. An official announcement post from the same day, only when no release note mentions the kit.
  3. For a game launch only: the launch announcement, even if posted a day later, with the Steam store release date. `note` explains the gap.

  The GameTracking commit history, `first_sale_date` in `items_game.txt`, the Fandom wiki and the design canvas are only leads for finding the evidence. They are never stored as a source.
- Rules for `releases.json`, all enforced by CI:
  - DATA-14a Every kit belongs to exactly one release.
  - DATA-14b Every release has `date`, `source.url`, `source.title` and `source.quote`. `quote` is one or more sentences copied verbatim from the source that announce the release (naming the kits, their box, or the number of kits added).
  - DATA-14c `source.url` is on `blog.counter-strike.net`, `store.steampowered.com` or `www.counter-strike.net`.
  - DATA-14d `nameKey` is the localization key of the box or collection name (for example `csgo_crate_musickit_masterminds_capsule`), or `null` for kits released on their own.
  - DATA-14e When `nameKey` is a music kit box in `items_game.txt`, the release's kits are exactly the box's loot list.
- Special cases:
  - `defIndex` 70 (Valve, CS:GO) belongs to the 2012-08-21 release, the launch of CS:GO (D-009). Its `note` records that it became selectable on 2014-10-10 and a separate item on 2023-09-27.
  - `defIndex` 1 (Valve, Counter-Strike 2) belongs to the 2023-09-27 release ("Added the new CS2 default music kit").
- `pnpm data:suggest-release` lists candidate notes for kits without a release. It prints suggestions only and never writes `releases.json`.

### Artist

Artists live in `data/curated/artists.json`. Credits live in `data/curated/credits.json`, keyed by `defIndex`: `{ artists: [{ artist, role }], credit }`, where `credit` is the English credit text when it is not an artist's name or alias (for example "Tree Adams and Ben Bromfield"), otherwise `null`.

| Field | Owner | Notes |
|---|---|---|
| `id` | Curated | Also the slug |
| `name` | Curated | As the artist writes it |
| `type` | Curated | `person`, `group` or `brand`. `brand` covers games, companies and compilations, such as Valve, Halo, Half-Life: Alyx, Perfect World and Various Artists (Hotline Miami) |
| `aliases` | Curated | Other official credit spellings, for example Dren and Dren McDonald |
| `members` | Curated | Artist ids, for groups and collaborations that have their own page |
| `musicbrainzId` | Curated | Set only when the MusicBrainz entry is clearly the credited artist: its releases include the kit's music, or its description fits (DATA-15a) |
| `links` | Upstream | From MusicBrainz (DATA-4a), written to `data/generated/` |

- DATA-15 A collaboration credit links to every member that has a kit of their own (Tree Adams and Ben Bromfield; The Verkkars & n0thing links to The Verkkars). A collaboration whose members have no kit of their own is one artist entry (TWERL, Ekko & Sidetrack; Repiet & Julia Kleijn).
- DATA-15a `musicbrainzId` stays `null` when no single entry fits: brands without a music entry of their own (Halo, Half-Life: Alyx, Perfect World, Various Artists), collaborations that MusicBrainz lists only as their members (TWERL, Ekko & Sidetrack; Repiet & Julia Kleijn), and names that match several artists or none (Skog, Tim Huling, Matt Levine). 69 of 78 artists have one (2026-11-13).
- DATA-16 Every kit has at least one `main` credit. Every artist has at least one kit. Every artist id used in `credits.json` exists.
- DATA-17 Real composers behind a `brand` credit may be named in its introduction, with sources (PROD-28). They are not separate credits unless Valve credits them.

### Generated files

`pnpm data:build` writes:

| File | Contents |
|---|---|
| `data/generated/kits.json` | Kits in rack order (PROD-7), without localized text |
| `data/generated/releases.json` | Releases by date |
| `data/generated/artists.json` | Artists with the `defIndex` of their kits in rack order |
| `data/generated/text/{segment}.json` | Official text for one locale: kit `name`, `credit`, `title`, `description`, and release names. Only strings the game ships in that locale are present; the site falls back to English (I18N, "Text sources by kind") |

## Covers

- DATA-18 Every kit has a cover. The first source is the Steam CDN icon (256 × 198), which already shows the sleeve with the disc half out. `pnpm data:covers` downloads each icon whose URL changed, stores the original PNG unchanged at `public/covers/{internalName}.png` and records its size in `data/upstream/covers.json`. `pnpm data:build` records `cover = { source: "icon", path, width, height }` and fails when a kit has no stored cover.
- DATA-18a Pages show WebP copies of each stored cover, made at build time next to the PNG (quality 90, lossless alpha): `{name}.webp` at most 768 px wide, and for a texture also `{name}-320.webp`, which thumbnails pick through `srcset`. They are a small part of the PNG's size, which keeps the rack's first cover fast to load (PROD-36). The Open Graph image stays the PNG, because not every link preview reads WebP.
- DATA-19 When the game's cover texture is extracted, it replaces the icon and `cover.source = "texture"`. A maintainer exports `materials/models/inventory_items/music_kit/` with Source2Viewer-CLI into `game-files/` (the README has the command); `pnpm data:textures` stores each kit's `mp3_screen_color` texture unchanged at `public/covers/textures/{internalName}.png` and records its size in `data/upstream/textures.json`. The game ships each cover twice, compressed two ways; the larger PNG is the less compressed one. All 101 kits have one (2026-11-13): 37 at 256², 29 at 512², 35 at 1024². Even 256² is sharper than the icon, whose sleeve is about 190 px wide. One folder is named differently from its kit (`midnight_riders_01`).
- DATA-19a A texture is the flat sleeve art, so pages draw the disc half out of the sleeve, in the icon's 256:198 frame (`Cover.astro`, `.record` in `global.css`). The texture is shown as stored, even where the game lightens it with its material (the grey of Desert Fire).

## Audio

- DATA-20 Audio files are read from the game's VPK and uploaded to the R2 bucket `cs-music-kit-audio`, which serves `audio.musickitarchive.com`, at `/{internalName}/{file}.mp3` or `.wav`. `pnpm game:download` downloads, anonymously from Steam with DepotDownloader (app 730, depot 2347770), the VPK directory `pak01_dir.vpk` and only the archives (about 100 MB each) that hold tracks to extract; no Steam account is needed. A maintainer with CS2 installed can point `pnpm audio:extract --game` at the Steam folder instead. `pnpm audio:extract` reads each track whose game file is new or changed since the last extraction (DATA-26), or every track with `--all`, checks it against the CRC in the directory, and has Source2Viewer-CLI decompile it; the other tracks keep their manifest entry. `pnpm audio:upload` publishes them (the README has the steps). The files never pass through git. Checked 2026-11-13: the 67 tracks in two downloaded archives, MP3 and WAV, in both sound resource versions the game uses (4 and 5), came out byte-identical to the published files.
- DATA-20a Every file is published exactly as the game stores it, without re-encoding: MP3 as `.mp3` (`audio/mpeg`), uncompressed PCM as `.wav` (`audio/wav`). Today the WAV files are most `startofmatch` and `endofmatch` cues (44.1 kHz, 16-bit, stereo).
- DATA-21 `data/upstream/audio-manifest.json` lists every uploaded file by key (its path, with the extension) with bytes, SHA-256 and measured duration. `pnpm audio:extract` writes it. `pnpm audio:upload` compares it with the published `/manifest.json`, uploads new or changed files, then the manifest, then deletes the files it no longer lists, so the published manifest never names a missing file. The site links only to files in the manifest. `pnpm data:sync` copies the published manifest to `data/upstream/audio-manifest.json`, and `pnpm data:build` takes each track's `audio` and duration from it. The sound events' `vsnd_duration` is off by more than a second for about one track in twelve, so the measured duration wins.
- DATA-21a Uploaded files are served with `Cache-Control: public, max-age=604800`: the paths are stable, but a game patch can change a file.

## Content

- DATA-22 Stories are `content/stories/{kit-slug}/{locale}.md`. Introductions are `content/artists/{artist-slug}/{locale}.md`.
- DATA-23 Front matter: `sources` (list of `{ title, url }`, at least one) and `translation` (`original`, `human` or `machine`).

## Weekly sync

- DATA-24 A scheduled workflow runs `pnpm data:sync`, `pnpm data:covers` and `pnpm data:build` every week. When anything changes it opens a pull request. Its body includes the `pnpm data:changes` output (DATA-26).
- DATA-25 A new kit makes the checks fail until it has a release, credits and, when needed, slug or title overrides. The pull request body lists the missing items and the `data:suggest-release` output.
- DATA-26 The site's audio and cover textures are extracted from the game files by hand (DATA-19, DATA-20), so a sync records when those files change. `pnpm data:sync` writes `data/upstream/game-files.json`: the CRC and size of every file under `sounds/music/{folder}/` and every `mp3_screen_color` texture under `materials/models/inventory_items/music_kit/`, from the VPK listing GameTracking-CS2 keeps (`game/csgo/pak01_dir.txt`). `data/upstream/game-files-extracted.json` holds the same for the files the published audio and stored textures came from. `pnpm data:changes` lists every file that is new, changed or removed between the two and exits with 1 if there is any; nothing needs downloading to tell. After extracting and uploading, a maintainer runs `pnpm data:sync` and then `pnpm data:changes --accept`, which copies the first file to the second. The first record (2026-11-13) was accepted without a new extraction: these entries in the VPK listing have not changed since at least 2026-11-03, before the audio and textures were extracted, and every published audio file is 772 to 1,347 bytes (the container header) smaller than its game file.
