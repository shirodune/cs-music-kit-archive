# CS Music Kit Archive: spec

What the site does, the rules its data follows, and why. Only what the code and tests do not already show; how things are built is in the code, and coding conventions are in `CLAUDE.md`. Change this file in the same pull request as the behaviour. Requirements have IDs, and a test that checks one names its ID in the title; numbers skip where a requirement was removed. Decisions are at the end (D-*).

## Purpose

An unofficial site that presents every Counter-Strike music kit, from the default CS:GO music of 2012 to today, at musickitarchive.com. The game's own preview of a kit is short; here every track plays in full, in every language CS2 ships. No accounts, no user content, no prices or trading, no 3D models.

The design reference is the claude.ai Design canvas "CS Music Kits Archive", page "Current design", style A "Supply Depot" (link in `CLAUDE.md`).

## Pages

Records (the rack, the home page), one page per kit, the artists index, one page per artist, About, and a not-found page, each in every language.

- PROD-2 Header: site name, Records, Artists, About, the language picker (opens the same page in another language, keeping the selected kit) and a link to the source code (on phones only in the footer).
- PROD-4 Footer: not affiliated with Valve; the names, artwork and audio belong to Valve and the artists; data credits; links to the source code and licences. The records page has no footer: it is the one-screen home page, and the header links to the source code.
- PROD-5 The root address opens the visitor's remembered language, else the best match for the browser, else English.
- PROD-6 A page has the same address in every language apart from the language segment.
- PROD-7 The rack holds every kit by release date. It works without JavaScript as a list of links.
- PROD-12 The selected kit is kept in the address, so links and the back button return to it. Without one, the newest kit is selected.
- PROD-13a The records page fits the screen, so scrolling never competes with moving the rack. Only a screen too small for it scrolls, rather than overlap.
- PROD-14 A kit page shows: title, cover and facts; the MVP anthem; the tracklist; Valve's description; the story; more by the same artists; kits released the same day; previous and next; the release note as source. Empty sections are left out.
- PROD-15 The default CS:GO kit also shows its unnamed alternate set of tracks, with a note that it is not a separate item.
- PROD-16 Artists index: more than one kit (most first); one kit each, by year; games and official, by first release.
- PROD-19 An artist's kits are in release order, with "N years later" between kits whose release years differ by 3 or more.
- PROD-20 An artist page links the artist's official site and music services found on MusicBrainz, and the MusicBrainz page.
- PROD-21 An artist page opened from a kit links back to that kit, else to the artists index.
- PROD-22 Every track is the full file from the game.
- PROD-23a When a kit's match start and match end are the same audio, they are one row, "Match start and end".
- PROD-24 One track plays at a time, only after a click, and stops when the visitor leaves the page (D-020).
- PROD-25a A kit whose audio is not published yet shows its tracklist without play buttons, and says so.
- PROD-26 Audio is served only from the site's own audio host.
- PROD-27 Stories (on kit pages) and introductions (on artist pages, before the kits) are optional.
- PROD-28 Every factual claim in a story or introduction has a source, listed under the text. Primary or secondary sources (Wikipedia, the press) are fine, for facts only, never copied text. Release dates still come only from DATA-14.
- PROD-29 Every page has a title and description in its language, and tells search engines and link previews about its other languages and its cover.
- PROD-30 A sitemap lists every page in every language.
- PROD-31 Accessible to WCAG 2.2 AA: readable contrast, every control usable by keyboard with a visible focus, text marked with its language.
- PROD-36 Fast: a Lighthouse desktop performance score of 90 or more on the records, kit and artist pages. Only the rack, the player, the language picker and a few small scripts use JavaScript.
- PROD-37 Visits are counted with Cloudflare Web Analytics only, on the live site only. No cookies, no banner.
- PROD-38 About page: what the site is, where the data comes from, links to the code, issues and licences.

## Data

Every field has one owner, and derived data is never edited by hand:

| Owner | Where | Edited by |
|---|---|---|
| Upstream snapshot | `data/upstream/` | The `pnpm data:*` and `pnpm audio:*` scripts |
| Curated | `data/curated/` | People, in pull requests |
| Content | `content/` | People, in pull requests |
| Derived | `data/generated/` | `pnpm data:build` |

- DATA-2 Audio and game files are never committed. The one exception is the cover textures (D-022).
- DATA-3 Sources: Valve's game data via SteamTracking/GameTracking-CS2; the game's text in every language via ByMykel/counter-strike-file-tracker; editions and Steam icons via ByMykel/CSGO-API; artist links via MusicBrainz; audio and covers from the game files. Each upstream snapshot records the commit it came from.
- DATA-4 MusicBrainz is used as it asks: requests name the project with a contact, about one a second.
- DATA-4b Links whose site is gone or has changed hands (some became casino sites) are hidden in `overrides.json`. Check an artist's official site when adding them.
- DATA-5 A kit is a music definition with an English name: 101 today.
- DATA-6 The unnamed definition 2 is the alternate track set of the default CS:GO kit, not a kit.
- DATA-8 StatTrak™ is an edition of a kit, not another kit.
- DATA-9 A kit's address uses its English title (`desert-fire`); `overrides.json` sets it when two would clash.
- DATA-10 Official names are split into credit and title by the build; `overrides.json` gives the split where the build cannot. Translated credits are official text and kept.
- DATA-12 Every kit has a main menu track and an MVP anthem.
- DATA-13 A kit's release date is the day it first became obtainable in the game, as announced by Valve, in US Pacific time. A default kit is dated by the launch its music shipped with (D-009).
- DATA-14 Evidence, in order: the release notes of that day; an official post the same day when no release note names the kit; for a game launch only, the launch announcement with the Steam store date, the gap explained in the release's note. GameTracking history, `first_sale_date`, wikis and the design canvas are leads, never sources.
  - DATA-14a Every kit is in exactly one release.
  - DATA-14b A release cites its source with a quote copied verbatim that announces the release.
  - DATA-14c The source is a Valve page: the Counter-Strike blog, the Steam store or counter-strike.net.
  - DATA-14d A release names its box or collection, or none for a kit released on its own.
  - DATA-14e A box release lists exactly the box's kits.
  - `pnpm data:suggest-release` finds candidate posts for a kit without a release; a person checks them and writes the entry.
- DATA-15 A collaboration links every member that has a kit of their own (Tree Adams and Ben Bromfield); otherwise the collaboration is one artist (TWERL, Ekko & Sidetrack).
- DATA-15a An artist gets a MusicBrainz entry only when it is clearly the credited artist; brands, collaborations MusicBrainz lists only as members, and ambiguous names (Skog, Tim Huling, Matt Levine) get none.
- DATA-16 Every kit has a main credit, and every artist has a kit.
- DATA-17 Composers behind a game or company credit may be named in its introduction, with sources; they are not credits unless Valve credits them.
- DATA-19 Covers are the game's own cover textures, stored unchanged; the Steam icon is the fallback until a texture is extracted.
- DATA-19a A texture is flat sleeve art, so pages draw the disc half out, in the icon's frame.
- DATA-20 Audio comes from the game files, downloaded anonymously from Steam, and is published exactly as the game stores it, never re-encoded.
- DATA-21 The site links only to audio files that are published, with their measured durations. Publishing never deletes a file: the live site may still link it until the sync's pull request is merged.
- DATA-22 Stories and introductions are Markdown files per page and language in `content/`. English is the original and must exist (`content/README.md`).
- DATA-23 Each states its sources and whether it is the original, a human translation or a machine translation.
- DATA-24 A weekly sync fetches the data, extracts new or changed audio and covers from the game, publishes the audio, and opens one pull request with the rest. It rebuilds that pull request's branch from `main` every time.
- DATA-25 A new kit fails the build until it has a release and credits. The pull request lists what is missing and suggests the release; the fixes go to `main`, then the sync runs again.
- DATA-26 The sync tells from GameTracking's listing of the game files which audio and covers changed, so nothing is downloaded when nothing changed.

## Languages

- I18N-1 Every language CS2 ships: 28 today, all left to right, English the default. When Valve adds one, add it to `src/i18n/locales.ts`, `messages/` and, for a new script, `src/i18n/fonts.ts`.
- I18N-3 Every address starts with its language, English included.
- I18N-12a Every language has every interface message. The translations are machine translations; Simplified Chinese is reviewed by the project owner, the others are not reviewed yet. Game terms follow the game's own translations.
- I18N-17 A story or introduction that is a machine translation says so.
- I18N-18 A story or introduction missing in a language shows the English text, marked as English, with a "not translated yet" notice.

| Text | Source | Translation |
|---|---|---|
| Kit names, descriptions, box names | The game | Never edited or machine translated; missing in a language → English |
| Interface messages | `messages/` | Machine translation allowed |
| Stories and introductions | `content/` | English first, Simplified Chinese next, others may be machine translated |

## Decisions

Each: the decision, then why. To change one, add a new one and mark the old one replaced.

- D-001 A static site built with Astro, on Cloudflare Workers static assets. The content changes weekly and is the same for everyone.
- D-003 Every pull request gets a preview; `main` deploys after all checks. Pull requests from forks get no secrets.
- D-005 Valve's own game data is the source, not item sites: it updates with every game patch.
- D-007 Full-length audio on R2, never in git: about 1.6 GB, and a takedown of a public repository would remove all of it. Match start and end stay lossless at the owner's choice.
- D-009 Default kits are dated by their game's launch (CS:GO 2012-08-21, CS2 2023-09-27): the archive is about the music, and Valve's description dates the CS:GO kit to that launch.
- D-010 "Artists", not "Composers": bands, rappers, games and companies are credited too.
- D-012 An own small translation helper instead of an i18n library, so nothing ships to the browser.
- D-013 Each script gets heavy, geometric fallback fonts, because no stencil font exists for non-Latin scripts.
- D-016 Domain musickitarchive.com, audio at audio.musickitarchive.com, a public repository.
- D-018 Licences: code MIT, curated data CC0, writing CC BY 4.0; third-party material in `NOTICE`. No share-alike or non-commercial terms, so wikis and other projects can reuse the work.
- D-019 Deploy with Wrangler, not `cf deploy`, which expects a server build this static site does not have.
- D-020 The player lives on the kit page: playing across pages would need client-side navigation everywhere and a now-playing bar the design does not have.
- D-021 Phones are supported, not prioritized: pages must not scroll sideways on a phone, but work goes to content and desktop first. Revisit if most visitors use phones.
- D-022 Covers are the game's textures, committed as stored (about 69 MB), so the build is self-contained.
- D-023 The weekly sync extracts and publishes audio itself. The step that runs third-party tools gets no secrets; only the upload gets the storage credentials, limited to the one bucket.
