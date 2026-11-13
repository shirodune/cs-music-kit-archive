// Checks on the generated data (spec: data.md). Run `pnpm data:build` first.
import { existsSync } from "node:fs";
import { describe, expect, test } from "vitest";
import artistsJson from "../../data/generated/artists.json";
import kitsJson from "../../data/generated/kits.json";
import releasesJson from "../../data/generated/releases.json";
import en from "../../data/generated/text/en.json";
import manifest from "../../data/upstream/audio-manifest.json";
import { generatedArtistSchema, kitSchema, releaseSchema } from "../../src/data/schema.ts";

const kits = kitsJson.map((k) => kitSchema.parse(k));
const artists = artistsJson.map((a) => generatedArtistSchema.parse(a));
const releases = releasesJson.map((r) => releaseSchema.parse(r));
const byIndex = new Map(kits.map((k) => [k.defIndex, k]));

describe("kit set", () => {
  test("DATA-5 every named music definition is a kit: 101 today", () => {
    expect(kits).toHaveLength(101);
    expect(Object.keys(en.kits)).toHaveLength(101);
  });

  test("DATA-6 defIndex 2 is not a kit; its tracks are the alternate set of defIndex 70", () => {
    expect(byIndex.has(2)).toBe(false);
    expect(byIndex.get(70)?.alternateTracks?.length).toBeGreaterThan(0);
    expect(kits.filter((k) => k.alternateTracks).map((k) => k.defIndex)).toEqual([70]);
    expect(byIndex.get(70)?.alternateInternalName).toBe("valve_02");
  });

  test("DATA-8 StatTrak is an edition, not a separate kit", () => {
    expect(new Set(kits.map((k) => k.defIndex)).size).toBe(kits.length);
    const radicals = kits.filter((k) => k.defIndex >= 32 && k.defIndex <= 38);
    expect(radicals.every((k) => k.edition === "stattrakOnly")).toBe(true);
  });

  test("PROD-7 kits are ordered by release date, then defIndex", () => {
    const sorted = [...kits].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.defIndex - b.defIndex);
    expect(kits.map((k) => k.defIndex)).toEqual(sorted.map((k) => k.defIndex));
  });
});

describe("kits", () => {
  test("DATA-18 every kit has a stored cover with its size", () => {
    for (const kit of kits) {
      expect(kit.cover.path, kit.slug).toBe(`/covers/${kit.internalName}.png`);
      expect(existsSync(new URL(`../../public${kit.cover.path}`, import.meta.url)), kit.slug).toBe(true);
    }
  });

  test("DATA-21 every track links to its published file, with the measured duration", () => {
    const published = manifest as Record<string, { sha256: string; durationSec: number }>;
    for (const kit of kits) {
      const lists = [
        { folder: kit.internalName, tracks: kit.tracks },
        { folder: kit.alternateInternalName, tracks: kit.alternateTracks ?? [] },
      ];
      for (const { folder, tracks } of lists) {
        for (const track of tracks) {
          const entry = track.audio && published[track.audio.path.slice(1)];
          expect(track.audio?.path, `${kit.slug} ${track.file}`).toMatch(
            new RegExp(`^/${folder}/${track.file}\\.(mp3|wav)$`),
          );
          expect(entry?.sha256, `${kit.slug} ${track.file}`).toBe(track.audio?.sha256);
          expect(track.durationSec, `${kit.slug} ${track.file}`).toBe(entry?.durationSec);
        }
      }
    }
  });

  test("DATA-9 slugs are unique", () => {
    expect(new Set(kits.map((k) => k.slug)).size).toBe(kits.length);
  });

  test("DATA-12 every kit has a main menu track and an MVP anthem", () => {
    for (const k of kits) {
      expect(
        k.tracks.some((t) => t.cue === "mainmenu"),
        k.slug,
      ).toBe(true);
      expect(
        k.tracks.some((t) => t.cue === "roundmvpanthem"),
        k.slug,
      ).toBe(true);
    }
  });

  test("DATA-16 every kit has a main credit, and every artist has a kit", () => {
    const ids = new Set(artists.map((a) => a.id));
    for (const k of kits) {
      expect(
        k.artists.some((a) => a.role === "main"),
        k.slug,
      ).toBe(true);
      for (const a of k.artists) expect(ids.has(a.artist), a.artist).toBe(true);
    }
    for (const a of artists) expect(a.kits.length, a.id).toBeGreaterThan(0);
  });

  test("DATA-10 every English name splits into credit and title", () => {
    for (const [defIndex, text] of Object.entries(en.kits)) {
      expect(text.title, defIndex).not.toBe("");
      expect(text.name.startsWith(text.credit), defIndex).toBe(true);
      expect(text.name.endsWith(text.title), defIndex).toBe(true);
    }
  });
});

describe("releases", () => {
  test("DATA-14a every kit belongs to exactly one release, and the dates agree", () => {
    const seen = new Map<number, string>();
    for (const r of releases)
      for (const d of r.kits) {
        expect(seen.has(d), `kit ${d}`).toBe(false);
        seen.set(d, r.id);
      }
    for (const k of kits) {
      expect(seen.get(k.defIndex)).toBe(k.releaseId);
      expect(releases.find((r) => r.id === k.releaseId)?.date).toBe(k.releaseDate);
    }
  });

  test("DATA-14b DATA-14c every release cites a Valve page with a quote", () => {
    for (const r of releases) {
      expect(r.source.quote.length, r.id).toBeGreaterThan(10);
      expect(["blog.counter-strike.net", "store.steampowered.com"]).toContain(new URL(r.source.url).host);
    }
  });

  test("DATA-13 Scarlxrd's King, Scar is dated by the release notes, not the next day's post", () => {
    expect(byIndex.get(41)?.releaseDate).toBe("2019-12-16");
  });

  test("D-009 the default kits are dated 2012-08-21 (CS:GO) and 2023-09-27 (CS2)", () => {
    expect(byIndex.get(70)?.releaseDate).toBe("2012-08-21");
    expect(byIndex.get(1)?.releaseDate).toBe("2023-09-27");
  });
});
