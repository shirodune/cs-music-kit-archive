// Pure helpers for `pnpm audio:extract` and `pnpm audio:upload` (spec: DATA-20 to DATA-21).

/** One published file, keyed by its path on audio.musickitarchive.com: `{internalName}/{file}.mp3`. */
export interface ManifestEntry {
  bytes: number;
  sha256: string;
  durationSec: number;
  /** How the game stores the file: MP3 is published as stored, WAV is encoded once (DATA-20a, DATA-20b). */
  stored: "mp3" | "wav";
}
export type Manifest = Record<string, ManifestEntry>;

export interface WantedFile {
  internalName: string;
  file: string;
  key: string;
}

interface KitTracks {
  internalName: string;
  tracks: { file: string }[];
  alternateTracks: { file: string }[] | null;
  alternateInternalName: string | null;
}

/** Every track file the site lists, once each, in key order. The alternate set has its own game folder (DATA-6). */
export function wantedFiles(kits: KitTracks[]): WantedFile[] {
  const byKey = new Map<string, WantedFile>();
  const add = (internalName: string, file: string) => {
    const key = `${internalName}/${file}.mp3`;
    byKey.set(key, { internalName, file, key });
  };
  for (const kit of kits) {
    for (const track of kit.tracks) add(kit.internalName, track.file);
    if (kit.alternateInternalName) {
      for (const track of kit.alternateTracks ?? []) add(kit.alternateInternalName, track.file);
    }
  }
  return [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}

/** Keys that are new or whose content changed since the previous manifest, so only those are uploaded. */
export function changedKeys(previous: Manifest, next: Manifest): string[] {
  return Object.keys(next)
    .filter((key) => previous[key]?.sha256 !== next[key]?.sha256)
    .sort();
}

const CBR_KBPS = [96, 112, 128, 160, 192, 224, 256, 320];

/** The constant bitrate closest to a measured one, in kbps (DATA-20b: the kit's `mainmenu` bitrate). */
export function nearestBitrate(bitsPerSecond: number): number {
  const kbps = bitsPerSecond / 1000;
  return CBR_KBPS.reduce((best, b) => (Math.abs(b - kbps) < Math.abs(best - kbps) ? b : best));
}
