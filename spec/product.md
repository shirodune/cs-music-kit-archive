# Product

## Purpose

CS Music Kit Archive (musickitarchive.com) is an unofficial, non-commercial fan site that presents every Counter-Strike music kit, from the default CS:GO music of 2012 to today. The in-game preview of music kits is poor. This site lets anyone browse every kit in order of release, listen to every track, and read about the artists, in all 28 languages that CS2 supports.

Audience: Counter-Strike players and music fans. No account, no sign-in, no purchases.

Not in scope:
- Market prices, trading or inventory features.
- 3D item models.
- User accounts, comments or any user-generated content.
- Server-side rendering. The site is fully static (see `decisions.md`).

## Visual design

The reference design is the claude.ai Design canvas "CS Music Kits Archive", page "Current design", style A "Supply Depot":
<https://claude.ai/code/artifact/df9305bc-d874-4959-ac79-7f34326b38f5>.
The other style directions and the retired timeline page are not built.

- Dark olive ground `#1A1C19`, warm off-white text `#E9E4D6`, muted text `#A9A493`, signal orange `#D9762F`.
- Type: Saira Stencil One for small section heads, Saira Condensed 800 for large titles, IBM Plex Mono for labels, IBM Plex Sans for running text. Non-Latin scripts use the fallback fonts in `i18n.md`.
- Motifs: record sleeves on a rack, vinyl discs, the orange in-game record label, hazard stripes.
- PROD-1 Pages work on a phone: the page body never scrolls sideways. Beyond that, the phone layout is not a priority (D-021).

## Global elements

- PROD-2 Header on every page: site name linking to the current locale's home, navigation (Records, Artists, About), the language picker and GitHub's mark linking to the repository (accessible name "GitHub"). Below 640 px the picker shows only its globe (its accessible name still names the language), the GitHub mark is left out (the footer links to the source code), and the navigation wraps rather than overflow.
- PROD-3 The language picker lists all 28 locales by their native name. Choosing one opens the same page in that locale and remembers the choice (see `i18n.md`).
- PROD-4 Footer on every page (on the records page a one-line version: the first two sentences of the disclaimer, `footer.short`, and the links; PROD-13a):
  - "Unofficial fan project. Not affiliated with or endorsed by Valve. Counter-Strike and all music kit names, artwork and audio belong to Valve and the respective artists."
  - A link to the source code on GitHub and the licence notice (see `decisions.md`). There is no contact e-mail address.
  - Data credits: Valve game data via SteamDB GameTracking, translations via ByMykel's file tracker, artist links via MusicBrainz.

## Routes

`{locale}` is a URL segment from the locale table in `i18n.md`, for example `en` or `zh-hans`. Every page exists in all 28 locales.

| Route | Page |
|---|---|
| `/` | Language redirect |
| `/{locale}/` | Records: the rack |
| `/{locale}/kits/{kit-slug}/` | Record: one music kit |
| `/{locale}/artists/` | Artists: index |
| `/{locale}/artists/{artist-slug}/` | Artist: one artist |
| `/{locale}/about/` | About |
| `/{locale}/404.html` | Not found, served with status 404 for unknown paths under that locale. `/404.html` (English) covers paths without a locale |

- PROD-5 `/` sends the visitor to `/{locale}/`, using the remembered choice if there is one, otherwise the best match for the browser's languages, otherwise `en`. Without JavaScript it shows a plain list of the 28 locales.
- PROD-6 Slugs are the same in every locale (see `data.md`).

## Records page (home)

The rack holds every kit in order of release. The rack is the timeline.

- PROD-7 Kits are ordered by release date, then by `defIndex`. Without JavaScript the page lists every kit as a plain list of links.
- PROD-8 Each kit is a sleeve showing its cover. One sleeve is selected at a time and pulled forward, with its disc partly out of the sleeve.
- PROD-9 The selected kit's record label card shows: issue date, artist credit (linked), release batch name, catalogue number `Nº {defIndex, 3 digits}` and edition (`Standard and StatTrak™`, `StatTrak™ only` or `Standard only`). The card links to the kit page.
- PROD-10 The year strip under the shelf lists every year that has a release. Selecting a year jumps to its first kit. Dragging along the strip scrubs through the rack.
- PROD-11 Input: drag or swipe the rack (on touch screens every gesture on the rack moves the rack, PROD-13a); mouse wheel scrolls it; Left and Right arrows select the previous or next kit; Page Up and Page Down jump a year; Home and End go to the first and last kit; Enter opens the selected kit. The rack has an accessible name that explains these keys.
- PROD-12 The selected kit is kept in the URL hash (`#{kit-slug}`), so links and the back button return to the same place. Without a hash the newest kit is selected.
- PROD-13 With `prefers-reduced-motion`, sleeves move without animation.
- PROD-13a The records page fits the screen and does not scroll, so scrolling never competes with moving the rack. The rack takes the height left over and its sleeves shrink to fit, down to 110 px wide. The selected kit's description is cut to a fixed number of lines (two on a phone, three from 640 px wide, one when the screen is under 700 px tall); the record page shows it in full, attributed to Valve, so the records page leaves out the attribution line. It spans the width beside the "Open the record" button. Below 1024 px the label card shows its four fields in two columns. The footer is one line (PROD-4). On a screen too small for all of this, the page scrolls instead of overlapping, and swipes that start on the rack move only the rack.

## Record page (one kit)

Sections, top to bottom:

1. Hero: release year, kit title in the current locale, and the English title when it differs. Cover with the disc half out of the sleeve (a drawn disc, DATA-19a); while a track plays, the disc slides further out and turns (still with reduced motion). Facts: artist credit (linked), released (date and batch), catalogue number, edition.
2. A "Play the MVP anthem" button.
3. Tracklist: every track of the kit (see Audio).
4. The official description, quoted, attributed to Valve.
5. The story (optional, see Content).
6. More by the same artist or artists.
7. Released the same day: the other kits in the same release batch.
8. Previous and next kit on the rack.
9. Sources: a link to the official release note for the kit's release (see `data.md`).

- PROD-14 Sections 5, 6 and 7 are left out when they would be empty.
- PROD-15 The default CS:GO kit (`defIndex` 70) also shows the unnamed alternate track set (`defIndex` 2) as a second tracklist with a short note: it shipped as a second set of the default music and is not a separate item.

## Artists index

- PROD-16 Three groups: "More than one kit" (sorted by number of kits, most first, then by name); "One kit each" (grouped by year of release); "Games and official" (credits that are a game, a company or a compilation, see `data.md`, sorted by first release).
- PROD-17 Each entry shows the artist name, active years, number of kits and the kit covers.

## Artist page

- PROD-18 Shows: name; introduction (optional); a fan of the artist's covers; facts card with number of kits (marked when it is the most of any artist), active years, first and latest kit.
- PROD-19 Discography in order of release. Each row shows: year, cover, release date and batch, title (localized, plus the English title when it differs), collaborators ("with …") and the official description. Between two kits whose release years differ by 3 or more, a divider says "N years later", counting calendar years (2022 to 2025 is 3 years).
- PROD-20 External links from MusicBrainz when known (DATA-4a), under the facts card: official site, Bandcamp, Spotify, Apple Music, SoundCloud, YouTube, then the artist's MusicBrainz page. Service names are not translated. An artist without an MBID shows no links.
- PROD-21 Arriving from a kit page (`?from={kit-slug}`), the back link returns to that kit. Otherwise it goes to the Artists index.

## Audio

- PROD-22 Every track is the full-length file from the game.
- PROD-23 Tracks are listed in the order a match plays them: main menu, choose team, match start, round start (each take), round start action (each take), bomb planted, bomb 10-second warning, round 10-second warning, round won, round lost, death cam, MVP anthem (each take), match end. Each row shows the localized cue name, the take number when there is more than one, the duration and a play or pause button. The current track's row also shows elapsed and total time and a slider that seeks.
- PROD-23a When the match start and match end files of a kit are the same audio (same SHA-256 after extraction), the kit shows one row labelled "Match start and end".
- PROD-24 The record page has one player for its tracklists and the MVP button. Only one track plays at a time. Playback starts only after a click or tap. Leaving the page stops it (D-020).
- PROD-25 A status line under the cover shows the playing or paused track, or a clear message when a file cannot load. Phones show the track, kit and cover on the lock screen (Media Session API).
- PROD-25a Until a kit's audio is published (DATA-21), its page shows the tracklist without play buttons, leaves out the MVP button, and the status line says the audio is not published yet.
- PROD-26 Audio is served from `https://audio.musickitarchive.com/`, never from third-party hosts in production.

## Content

- PROD-27 Stories (kit pages) and introductions (artist pages) are optional. A page without one hides that section. The story is section 5 of the record page, headed "Story". The introduction, headed "About", comes after the artist's facts and links and before the discography.
- PROD-28 Every factual claim in a story or introduction has a source listed with it. Sources are shown under the text, as a numbered list of links. Sources may be primary (Valve, the artist, interviews) or secondary (encyclopedias such as Wikipedia, the press); a claim taken from a source is checked against it. Release dates still come only from DATA-14's sources.

## About page

- PROD-38 Three short sections: what the site is, where its data comes from (game files, Valve's text, release notes, MusicBrainz, the weekly check), and open source (licences, with links to the source code, GitHub issues for reporting a mistake, and the licence notice). UI messages, so every locale has it.

## SEO and sharing

- PROD-29 Each page has a localized title and description, a canonical URL, `hreflang` links to all 28 locales plus `x-default` (English), and Open Graph tags with the cover image.
- PROD-30 A sitemap lists every page in every locale. `robots.txt` points to `/sitemap-index.xml`. The root page (`noindex`) and not-found pages are left out. The sitemap has no `hreflang` alternates: the page head already has them (PROD-29), and Google says using both methods brings no benefit in Search.

## Accessibility

- PROD-31 Text contrast meets WCAG 2.2 AA (4.5:1 for body text, 3:1 for large text).
- PROD-32 Every control is a real `button`, `a` or form element, reachable by keyboard, with a visible focus outline. Icon-only buttons have an accessible name.
- PROD-32a The end-to-end tests check PROD-31 and PROD-32 with axe (WCAG 2.2 A and AA rules) on each kind of page in English and two other scripts, and press Tab through the start of each kind of page to check that every focused control shows an outline. A link's accessible name is its visible text, so screen readers and voice control use the same words.
- PROD-33 Withdrawn on 2026-11-13 (D-021).
- PROD-34 Every page sets `lang` on `<html>`. Text in another language, such as an English kit title on a Russian page, carries its own `lang`.

## Performance

- PROD-35 Pages without interactive parts ship no JavaScript except the language picker, the analytics loader (PROD-37) and, on artist pages, the few inline lines that point the back link at the kit in `?from` (PROD-21). The record page adds its player as one small inline script (about 3 KB), without a framework.
- PROD-36 Lighthouse performance score of 90 or more on desktop for the Records, Record and Artist pages. CI runs `pnpm lighthouse`: Lighthouse's desktop preset, one unscored warm-up run, then three runs per page against the built site served by Wrangler, and the median counts. Local scores swing with machine load, so CI is the reference.

## Analytics

- PROD-37 Cloudflare Web Analytics only. No cookies, no consent banner. A few inline lines load Cloudflare's beacon only on the production host musickitarchive.com, so local runs, tests and pull request previews are not counted. The site token in the page is public by design. Automatic injection is off, so the loader in the code is the only one.

## Open questions

- Phone layout of the rack. Not a priority (D-021). Below 900 px the label card sits above a smaller rack and only the selected year is labelled on the strip.
