# CS Music Kit Archive

An unofficial, non-commercial fan site that presents every Counter-Strike music kit, from the default CS:GO music of 2012 to today, with full tracklists, in all 28 languages that CS2 supports.

Not affiliated with or endorsed by Valve. See [NOTICE](NOTICE).

## Status

Live at <https://musickitarchive.com>, still in development. The records rack, record pages, artist pages and the sitemap are built in all 28 languages. Every track plays on its record page, from the game's own files. The specification is in [`spec/`](spec/README.md).

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
| `pnpm data:changes` | Lists the game's sound files and cover textures that changed since the site's audio and covers were extracted (needs `pnpm data:sync` first; spec DATA-26) |
| `pnpm data:links` | Fetches artist links from MusicBrainz for every `musicbrainzId` in `data/curated/artists.json`; run `pnpm data:build` after |
| `pnpm lighthouse` | Lighthouse desktop performance check (PROD-36, needs `pnpm build` first) |

## Audio (maintainers)

The audio comes from the game files on a maintainer's machine and goes straight to Cloudflare R2. It never passes through git or CI (spec DATA-20, DATA-21). On Windows:

1. Install CS2 through Steam and let it update.
2. Install the tools: Git, Node 26, pnpm (`winget install pnpm.pnpm`) and ffmpeg (`winget install Gyan.FFmpeg`; the script uses its `ffprobe` to measure durations). Download `cli-windows-x64.zip` from the [ValveResourceFormat releases](https://github.com/ValveResourceFormat/ValveResourceFormat/releases) and unzip it, for example to `C:\tools\s2v\`.
3. Run, in a clone of this repository, with about 2 GB free (the published files are hard links to the extracted ones):

   ```powershell
   pnpm install
   pnpm exec wrangler login
   pnpm audio:extract --s2v C:\tools\s2v\Source2Viewer-CLI.exe
   pnpm audio:upload
   ```

Cover textures (spec DATA-19) come from the same game files. Export them and store them in `public/covers/textures/`, which is committed:

```powershell
C:\tools\s2v\Source2Viewer-CLI.exe -i "steam:730/game/csgo/pak01_dir.vpk" -f materials/models/inventory_items/music_kit/ -e vtex_c -d -o game-files
pnpm data:textures
pnpm data:build
```

After extracting audio or textures, record the game files they came from, so `pnpm data:changes` stops listing them:

```powershell
pnpm data:sync
pnpm data:changes --accept
```

`audio:extract` finds CS2 through Steam, writes the files to `audio/` (ignored by git) and the manifest to `data/upstream/audio-manifest.json`. `audio:upload` compares it with the published manifest: it uploads new or changed files, then the manifest, then deletes files that are no longer listed. Run both again after a game update that adds kits.

Deploys run from GitHub Actions (spec D-003): every pull request gets a preview on workers.dev, and every push to `main` deploys to production after all checks pass.

## Licence

- Code: [MIT](LICENSE)
- Our curated data (`data/curated/`): [CC0 1.0](LICENSE-DATA), public domain
- Our writing (`content/`): [CC BY 4.0](LICENSE-CONTENT)
- Third-party material (Valve's names, artwork, audio and game data; ByMykel's data; MusicBrainz links; fonts): see [NOTICE](NOTICE)
