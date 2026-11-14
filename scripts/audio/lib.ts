// Pure helpers for `pnpm audio:extract` and `pnpm audio:upload` (spec: DATA-20 to DATA-21).

/** One published file, keyed by its path on audio.musickitarchive.com: `{internalName}/{file}.mp3` or `.wav`. */
export interface ManifestEntry {
  bytes: number;
  sha256: string;
  durationSec: number;
}
export type Manifest = Record<string, ManifestEntry>;

export interface WantedFile {
  internalName: string;
  file: string;
  /** `{internalName}/{file}`: the key without the extension, which depends on how the game stores the file. */
  base: string;
}

interface KitTracks {
  internalName: string;
  tracks: { file: string }[];
  alternateTracks: { file: string }[] | null;
  alternateInternalName: string | null;
}

/** Every track file the site lists, once each, in order. The alternate set has its own game folder (DATA-6). */
export function wantedFiles(kits: KitTracks[]): WantedFile[] {
  const byBase = new Map<string, WantedFile>();
  const add = (internalName: string, file: string) => {
    const base = `${internalName}/${file}`;
    byBase.set(base, { internalName, file, base });
  };
  for (const kit of kits) {
    for (const track of kit.tracks) add(kit.internalName, track.file);
    if (kit.alternateInternalName) {
      for (const track of kit.alternateTracks ?? []) add(kit.alternateInternalName, track.file);
    }
  }
  return [...byBase.values()].sort((a, b) => (a.base < b.base ? -1 : 1));
}

/**
 * The files `pnpm audio:upload` uploads: new or changed ones (DATA-21). Files the manifest no longer lists are not
 * deleted: the live site links them until the weekly sync's pull request is merged.
 */
export function uploadPlan(published: Manifest, next: Manifest): string[] {
  return Object.keys(next)
    .filter((key) => published[key]?.sha256 !== next[key]?.sha256)
    .sort();
}

/**
 * Whether a track has to be read from the game again: its game file is not the one the published audio came from
 * (DATA-26), or the manifest has no entry for it.
 */
export function needsExtraction(
  base: string,
  crc: number,
  extracted: Record<string, { crc: string }>,
  manifest: Manifest,
): boolean {
  const record = extracted[`sounds/music/${base}.vsnd_c`];
  const published = ["mp3", "wav"].some((ext) => `${base}.${ext}` in manifest);
  return !published || !record || Number.parseInt(record.crc, 16) !== crc;
}

const CONTENT_TYPES: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav" };

/** Content type of a manifest key, by its extension (DATA-20). */
export function contentTypeOf(key: string): string {
  const type = CONTENT_TYPES[key.slice(key.lastIndexOf(".") + 1)];
  if (!type) throw new Error(`${key}: not an MP3 or WAV file`);
  return type;
}
