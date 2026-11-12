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
- PROD-1 Pages must work from 360 px wide. At phone width menus stack and tables scroll inside their own box; the rack follows the phone design (see Open questions). The page body never scrolls sideways.

## Global elements

- PROD-2 Header on every page: site name linking to the current locale's home, navigation (Records, Artists) and the language picker.
- PROD-3 The language picker lists all 28 locales by their native name. Choosing one opens the same page in that locale and remembers the choice (see `i18n.md`).
- PROD-4 Footer on every page:
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
| `/{locale}/404.html` | Not found, served with status 404 for unknown paths under that locale. `/404.html` (English) covers paths without a locale |

- PROD-5 `/` sends the visitor to `/{locale}/`, using the remembered choice if there is one, otherwise the best match for the browser's languages, otherwise `en`. Without JavaScript it shows a plain list of the 28 locales.
- PROD-6 Slugs are the same in every locale (see `data.md`).

## Records page (home)

The rack holds every kit in order of release. The rack is the timeline.

- PROD-7 Kits are ordered by release date, then by `defIndex`.
- PROD-8 Each kit is a sleeve showing its cover. One sleeve is selected at a time and pulled forward, with its disc partly out of the sleeve.
- PROD-9 The selected kit's record label card shows: issue date, artist credit (linked), release batch name, catalogue number `Nº {defIndex, 3 digits}` and edition (`Standard and StatTrak™`, `StatTrak™ only` or `Standard only`). The card links to the kit page.
- PROD-10 The year strip under the shelf lists every year that has a release. Selecting a year jumps to its first kit. Dragging along the strip scrubs through the rack.
- PROD-11 Input: drag or swipe the rack; mouse wheel scrolls it; Left and Right arrows select the previous or next kit; Page Up and Page Down jump a year; Enter opens the selected kit. The rack has an accessible name that explains these keys.
- PROD-12 The selected kit is kept in the URL hash (`#{kit-slug}`), so links and the back button return to the same place.
- PROD-13 With `prefers-reduced-motion`, sleeves move without animation.

## Record page (one kit)

Sections, top to bottom:

1. Hero: release year, kit title in the current locale, and the English title when it differs. Cover with the disc half out of the sleeve (the icon already shows this; a cover texture gets a drawn disc, DATA-19). Facts: artist credit (linked), released (date and batch), catalogue number, edition.
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

- PROD-16 Three groups: "More than one kit" (sorted by number of kits, most first, then by name); "One kit each" (grouped by year of release); "Games and official" (credits that are a game, a company or a compilation, see `data.md`).
- PROD-17 Each entry shows the artist name, active years, number of kits and the kit covers.

## Artist page

- PROD-18 Shows: name; introduction (optional); a fan of the artist's covers; facts card with number of kits (marked when it is the most of any artist), active years, first and latest kit.
- PROD-19 Discography in order of release. Each row shows: year, cover, release date and batch, title (localized, plus the English title when it differs), collaborators ("with …") and the official description. Between two kits that are 3 or more years apart, a divider says "N years later".
- PROD-20 External links from MusicBrainz (official site, Bandcamp, Spotify and similar) when known.
- PROD-21 Arriving from a kit page (`?from={kit-slug}`), the back link returns to that kit. Otherwise it goes to the Artists index.

## Audio

- PROD-22 Every track is the full-length file from the game.
- PROD-23 Tracks are listed in the order a match plays them: main menu, choose team, match start, round start (each take), round start action (each take), bomb planted, bomb 10-second warning, round 10-second warning, round won, round lost, death cam, MVP anthem (each take), match end. Each row shows the localized cue name, the take number when there is more than one, the duration and a play or stop button.
- PROD-23a When the match start and match end files of a kit are the same audio (same SHA-256 after extraction), the kit shows one row labelled "Match start and end".
- PROD-24 One player for the whole site. Only one track plays at a time. Playback starts only after a click or tap. Changing page within the site does not stop it.
- PROD-25 A status line shows the playing track, or a clear message when a file cannot load.
- PROD-25a Until a kit's audio is published (DATA-21), its page shows the tracklist without play buttons, leaves out the MVP button, and the status line says the audio is not published yet.
- PROD-26 Audio is served from `https://audio.musickitarchive.com/`, never from third-party hosts in production.

## Content

- PROD-27 Stories (kit pages) and introductions (artist pages) are optional. A page without one hides that section.
- PROD-28 Every factual claim in a story or introduction has a source listed with it. Sources are shown under the text.

## SEO and sharing

- PROD-29 Each page has a localized title and description, a canonical URL, `hreflang` links to all 28 locales plus `x-default` (English), and Open Graph tags with the cover image.
- PROD-30 A sitemap lists every page in every locale with its alternates.

## Accessibility

- PROD-31 Text contrast meets WCAG 2.2 AA (4.5:1 for body text, 3:1 for large text).
- PROD-32 Every control is a real `button`, `a` or form element, reachable by keyboard, with a visible focus outline. Icon-only buttons have an accessible name.
- PROD-33 Touch targets are at least 44 × 44 px.
- PROD-34 Every page sets `lang` on `<html>`. Text in another language, such as an English kit title on a Russian page, carries its own `lang`.

## Performance

- PROD-35 Pages without interactive parts ship no JavaScript except the language picker.
- PROD-36 Lighthouse performance score of 90 or more on mobile for the Records, Record and Artist pages.

## Analytics

- PROD-37 Cloudflare Web Analytics only. No cookies, no consent banner.

## Open questions

- Phone layout of the rack. The project owner designs it in the design canvas; the build follows that design.
