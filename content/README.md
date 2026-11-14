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
