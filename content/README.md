# Stories and introductions

Written for this site (spec: DATA-22, DATA-23, PROD-27, PROD-28, I18N-17, I18N-18).

- `stories/{kit-slug}/{locale}.md`: the story on a kit page, for example `stories/red-room/en.md`.
- `artists/{artist-slug}/{locale}.md`: the introduction on an artist page, for example `artists/adam-beyer/en.md`.

The slugs are the ones in the page URLs; the locales are the URL segments (`en`, `zh-hans`, `pt-br`, …).

```markdown
---
sources:
  - title: Interview with the artist, Example Magazine, 2025
    url: https://example.com/interview
translation: original
---
Text in Markdown. Use `###` for subheadings: the page gives the section its heading.
```

- Write in English first: `en.md` is the original (`translation: original`). Simplified Chinese comes next; other languages may be machine translated (`translation: machine`, shown with a notice) or translated by a person (`human`).
- A language without a file shows the English text with a notice that it is not translated yet.
- Every factual claim needs a source in `sources`; the page lists them under the text. Primary sources (Valve, the artist, interviews) and secondary ones (Wikipedia, the press) are both fine; prefer the artist's own words where they say the same.
- Official Valve text (kit names, descriptions, box names) is quoted as it is, never rewritten or translated.

The build fails on a folder that is not a kit or artist, a file name that is not a locale, a missing `en.md`, or front matter without sources.

## Writing and checking

A writer and a separate checker go through every text before the owner reviews it (`CLAUDE.md`). The checker splits the text into single claims, checks each against the page it cites, and compares the Chinese with the English. Problems the checks found before, worth giving every writer up front:

- Close paraphrase: a Wikipedia lead or an official biography retold in the same order of facts counts as copied. Take the facts and write your own text.
- Claims broader than the source: "won" for an award the source lists only as a nomination, "his one kit", "best known for", "first-ever", "six years later" for five years and eight months.
- Connections the writer made up: a word in Valve's description that is also a song title is not a link between them.
- Filler, such as the label posting a preview on YouTube, and promotional quotes.
- Which kits a box holds: cite the box's Steam Market listing, not release notes that do not list the kits.
- Chinese box and album names: when only the English names match, write "英文名…同名", not "《中文盒名》与专辑《English》同名".
- Give writers the release's `note` from `data/curated/releases.json` as well as `data/generated/`, and check the note too.

A story opens with the work itself, not with "X shares its name with…": the kit page already shows the English title under the translated one. A kit with nothing sourced beyond its own page gets no story.
