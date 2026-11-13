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

The audio comes from the game's own files and goes straight to Cloudflare R2. It never passes through git (spec DATA-20, DATA-21). No Steam account or CS2 install is needed:

1. Install the tools: Node 26, pnpm, ffmpeg (the script uses its `ffprobe` to measure durations), [DepotDownloader](https://github.com/SteamRE/DepotDownloader/releases) and the Source2Viewer CLI (`cli-*.zip` from the [ValveResourceFormat releases](https://github.com/ValveResourceFormat/ValveResourceFormat/releases)).
2. Run, in a clone of this repository:

   ```sh
   pnpm install
   pnpm exec wrangler login
   pnpm game:download --depotdownloader <path to DepotDownloader>
   pnpm audio:extract --s2v <path to Source2Viewer-CLI>
   pnpm audio:upload
   ```

`game:download` downloads, anonymously from Steam, the game's VPK directory (about 8 MB) and only the archives that hold new or changed tracks, about 100 MB each, into `game-files/` (ignored by git). `audio:extract` reads those tracks, has Source2Viewer decompile them into `audio/out/` (ignored by git) and writes the manifest to `data/upstream/audio-manifest.json`; the other tracks keep their entry. Add `--all` to both to read every track again (about 9 GB of archives). With CS2 installed through Steam, skip `game:download` and pass `--game "C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo"` to `audio:extract`. `audio:upload` compares the manifest with the published one: it uploads new or changed files, then the manifest, then deletes files that are no longer listed.

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

Deploys run from GitHub Actions (spec D-003): every pull request gets a preview on workers.dev, and every push to `main` deploys to production after all checks pass.

## Licence

- Code: [MIT](LICENSE)
- Our curated data (`data/curated/`): [CC0 1.0](LICENSE-DATA), public domain
- Our writing (`content/`): [CC BY 4.0](LICENSE-CONTENT)
- Third-party material (Valve's names, artwork, audio and game data; ByMykel's data; MusicBrainz links; fonts): see [NOTICE](NOTICE)
