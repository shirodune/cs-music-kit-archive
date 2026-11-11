# Spec

This folder is the single source of truth for what the site does and where its data comes from.
Code, data scripts and tests follow the spec. When behaviour changes, change the spec in the same pull request.

| File | Covers |
|---|---|
| [product.md](product.md) | Pages, routes, interactions, audio, SEO, accessibility |
| [data.md](data.md) | Data sources, entities, field ownership, release dates, validation |
| [i18n.md](i18n.md) | Locales, routing, UI messages, plurals, formatting, fonts |
| [decisions.md](decisions.md) | Decisions already made, with the reason for each |

## Rules

- Keep it simple. Write only what changes how the site is built or checked.
- Requirements have IDs such as `DATA-12`. Tests that check a requirement mention its ID.
- "Must" means CI should fail when it is broken. "Should" is a strong default that can be argued.
- Open questions stay in the "Open questions" section of the file they belong to until they are decided. Decisions then move to `decisions.md`.
