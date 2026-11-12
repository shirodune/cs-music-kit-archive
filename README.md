# CS Music Kit Archive

An unofficial, non-commercial fan site that presents every Counter-Strike music kit, from the default CS:GO music of 2012 to today, with full tracklists, in all 28 languages that CS2 supports.

Not affiliated with or endorsed by Valve. See [NOTICE](NOTICE).

## Status

Live at <https://musickitarchive.com>, still in development. The records rack, record pages, artist pages and the sitemap are built in all 28 languages. Audio is not published yet. The specification is in [`spec/`](spec/README.md).

## Development

Requires Node 26 (`.node-version`) and pnpm.

```sh
pnpm install
pnpm dev          # local dev server
pnpm verify       # lint, types, i18n check, unit tests, build, end-to-end tests
```

| Command | What it does |
|---|---|
| `pnpm build` | Builds the static site into `dist/` |
| `pnpm preview` | Serves `dist/` with Wrangler, the same way Cloudflare does |
| `pnpm i18n:check` | Checks `messages/` against English (plural forms, placeholders, unknown keys) |
| `pnpm test` / `pnpm test:e2e` | Unit tests (Vitest) / end-to-end tests (Playwright, needs `pnpm build` first) |
| `pnpm lighthouse` | Lighthouse mobile performance check (PROD-36, needs `pnpm build` first) |

Deploys run from GitHub Actions (spec D-003): every pull request gets a preview on workers.dev, and every push to `main` deploys to production after all checks pass.

## Licence

- Code: [MIT](LICENSE)
- Our curated data (`data/curated/`): [CC0 1.0](LICENSE-DATA), public domain
- Our writing (`content/`): [CC BY 4.0](LICENSE-CONTENT)
- Third-party material (Valve's names, artwork, audio and game data; ByMykel's data; MusicBrainz links; fonts): see [NOTICE](NOTICE)
