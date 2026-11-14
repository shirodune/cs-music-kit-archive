# Maintainers

How the data, audio and covers are kept up to date. Contributors do not need any of this: `pnpm verify` works without game files or credentials. [`SPEC.md`](../SPEC.md) has the rules and why things are done this way.

## Data commands

| Command | What it does |
|---|---|
| `pnpm data:sync` | Fetches the upstream data: Valve's game data from SteamDB GameTracking, the 28 languages from ByMykel's file tracker, item data from ByMykel's CSGO-API and the published audio manifest (spec DATA-3) |
| `pnpm data:covers` | Downloads each kit's Steam icon whose URL changed (spec DATA-19) |
| `pnpm data:build` | Validates the curated and upstream data and writes `data/generated/` (never edit that folder by hand) |
| `pnpm data:changes` | Lists the game's sound files and cover textures that changed since the site's audio and covers were extracted (needs `pnpm data:sync` first; spec DATA-26) |
| `pnpm data:suggest-release` | For each kit without a release, lists the CS2 Steam posts since the newest release that name it, release notes first, with a draft entry for `data/curated/releases.json`; it never writes the file (spec DATA-14, DATA-25) |
| `pnpm data:links` | Fetches artist links from MusicBrainz for every `musicbrainzId` in `data/curated/artists.json`; run `pnpm data:build` after |

## Audio

The audio comes from the game's own files and goes straight to Cloudflare R2. It never passes through git (spec DATA-20, DATA-21). No Steam account or CS2 install is needed:

1. Install the tools: Node 26, pnpm, ffmpeg (the script uses its `ffprobe` to measure durations), [DepotDownloader](https://github.com/SteamRE/DepotDownloader/releases) and the Source2Viewer CLI (`cli-*.zip` from the [ValveResourceFormat releases](https://github.com/ValveResourceFormat/ValveResourceFormat/releases)).
2. Run, in a clone of this repository:

   ```sh
   pnpm install
   pnpm game:download --depotdownloader <path to DepotDownloader>
   pnpm audio:extract --s2v <path to Source2Viewer-CLI>
   pnpm audio:upload
   ```

`game:download` downloads, anonymously from Steam, the game's VPK directory (about 8 MB) and only the archives that hold new or changed tracks and cover textures, about 100 MB each, into `game-files/` (ignored by git). `audio:extract` reads those tracks, has Source2Viewer decompile them into `audio/out/` (ignored by git) and writes the manifest to `data/upstream/audio-manifest.json`; the other tracks keep their entry. Add `--all` to both to read every track again (about 12 GB of archives, with the covers). With CS2 installed through Steam, skip `game:download` and pass `--game "C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo"` to `audio:extract`. `audio:upload` needs the bucket's S3 credentials in `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` (see "Weekly sync"). It compares the manifest with the published one: it uploads new or changed files, then the manifest, then deletes files that are no longer listed.

Cover textures (spec DATA-19) come from the same game files and are committed in `public/covers/textures/`. `game:download` also fetches the archives of covers whose textures changed; then:

```sh
pnpm data:textures --s2v <path to Source2Viewer-CLI>
pnpm data:build
```

`audio:extract` and `data:textures` record the game files they read, and drop files that are gone from the game, so `pnpm data:changes` stops listing them.

## Weekly sync

`.github/workflows/weekly-sync.yml` runs every Monday and from the Actions tab (spec DATA-24, D-023). It fetches the upstream data and artist links, extracts the audio and cover textures of game files that changed, uploads the audio, and opens or updates the pull request on the branch `data-sync` with everything else, the covers included. When a new kit fails the build, the pull request lists the errors and the `pnpm data:suggest-release` output; add the release (checked against its page) and credits to `main` in a pull request of their own, then run the workflow again from the Actions tab. Do not push to `data-sync`: every run rebuilds it from `main`. One-time setup (done 2026-11-13):

1. Create an R2 token limited to the bucket: in Cloudflare, R2 → Manage API tokens → Create Account API token, permission "Object Read & Write", bucket `cs-music-kit-audio`. It shows an Access Key ID and a Secret Access Key.
2. In GitHub, create the environment `audio` (Settings → Environments), limit its deployment branches to `main`, and add the two values as the secrets `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
3. In GitHub, allow workflows to open pull requests: Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests".

Deploys run from GitHub Actions (spec D-003): every pull request gets a preview on workers.dev, and every push to `main` deploys to production after all checks pass.
