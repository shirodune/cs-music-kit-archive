// pnpm data:suggest-release — suggest a release for each kit that has none (spec: DATA-14, DATA-25).
// Searches the CS2 Steam events posted since the newest curated release for sentences that name a new kit, its
// credit, title or box, release notes first. Prints them as Markdown with a draft entry for
// data/curated/releases.json; it never writes the file. Check each draft against the page before adding it: the
// date is the post's day in US Pacific time, and the quote must announce the release (DATA-13, DATA-14b).
// The weekly sync adds the output to its pull request when the build fails.
// Usage: node scripts/data/suggest-release.ts

import type { Release } from "../../src/data/schema.ts";
import { readJson } from "./json.ts";
import { type Candidate, candidates, kitTerms, pacificDate, type SteamEvent } from "./release-notes.ts";
import { cleanText, slugify, splitName } from "./text.ts";

const DATA = new URL("../../data/", import.meta.url);
const EVENTS =
  "https://store.steampowered.com/events/ajaxgetpartnereventspageable/?clan_accountid=0&appid=730&l=english";
const PAGE = 100;
const MAX_PAGES = 10;

interface ItemsGame {
  music: Record<string, { name: string; locName?: string }>;
  boxes: { kits: string[]; nameKey: string; stattrak: boolean }[];
}

/** CS2 events posted on or after the day, newest first. */
async function eventsSince(day: string): Promise<SteamEvent[]> {
  const events: SteamEvent[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetch(`${EVENTS}&offset=${page * PAGE}&count=${PAGE}`);
    if (!response.ok) throw new Error(`Steam events: HTTP ${response.status}`);
    const { events: batch } = (await response.json()) as { events: SteamEvent[] };
    events.push(...batch);
    const last = batch.at(-1);
    if (batch.length < PAGE || !last || pacificDate(last.announcement_body.posttime) < day) break;
  }
  return events.filter((e) => pacificDate(e.announcement_body.posttime) >= day);
}

interface Group {
  nameKey: string | null;
  kits: number[];
  heading: string;
  found: Candidate[];
}

function printCandidates(found: Candidate[]): void {
  for (const [i, c] of found.entries()) {
    console.log(`${i + 1}. ${c.date}, [${c.title}](${c.url})${c.releaseNotes ? " (release notes)" : ""}`);
    for (const quote of c.quotes) console.log(`   > ${quote}`);
  }
}

async function main(): Promise<void> {
  const itemsGame = await readJson<ItemsGame>(new URL("upstream/items-game.json", DATA));
  const en = await readJson<Record<string, string>>(new URL("upstream/loc/en.json", DATA));
  const releases = await readJson<Release[]>(new URL("curated/releases.json", DATA));

  // DATA-5: a kit is a music definition with an English name.
  const nameOf = (defIndex: number) => {
    const key = itemsGame.music[defIndex]?.locName;
    return key && en[key] ? cleanText(en[key], { singleLine: true }) : undefined;
  };
  const released = new Set(releases.flatMap((r) => r.kits));
  const missing = Object.entries(itemsGame.music)
    .map(([defIndex, d]) => ({ defIndex: Number(defIndex), name: d.name, title: nameOf(Number(defIndex)) ?? "" }))
    .filter((kit) => kit.title && !released.has(kit.defIndex));
  if (missing.length === 0) {
    console.log("Every kit has a release.");
    return;
  }
  const since =
    releases
      .map((r) => r.date)
      .sort()
      .at(-1) ?? "2023-09-27";
  const events = await eventsSince(since);
  const defIndexOf = new Map(Object.entries(itemsGame.music).map(([defIndex, d]) => [d.name, Number(defIndex)]));

  // A boxed kit is released with its box's loot list (DATA-14e). Other kits are grouped by the post that names them.
  const groups = new Map<string, Group>();
  for (const kit of missing) {
    const boxes = itemsGame.boxes.filter((b) => b.kits.includes(kit.name));
    const box = boxes.find((b) => !b.stattrak) ?? boxes[0];
    const boxName = box && en[box.nameKey];
    const found = candidates(events, kitTerms(kit.title, boxName));
    const key = box?.nameKey ?? found[0]?.url ?? `kit ${kit.defIndex}`;
    const group = groups.get(key);
    if (group && box) continue;
    if (group) {
      group.kits.push(kit.defIndex);
      continue;
    }
    groups.set(key, {
      nameKey: box?.nameKey ?? null,
      kits: box ? box.kits.map((n) => defIndexOf.get(n) ?? 0).sort((a, b) => a - b) : [kit.defIndex],
      heading: boxName ?? kit.title,
      found: box
        ? candidates(
            events,
            box.kits.flatMap((n) => kitTerms(nameOf(defIndexOf.get(n) ?? 0) ?? "", boxName)),
          )
        : found,
    });
  }

  console.log(`${missing.length} kits have no release. Searched ${events.length} Steam events posted since ${since}.`);
  for (const { nameKey, kits, heading, found } of groups.values()) {
    console.log(`\n### ${kits.length > 1 && !nameKey ? `${kits.length} kits` : heading} (${kits.join(", ")})\n`);
    if (kits.length > 1) console.log(`${kits.map((d) => nameOf(d)).join("; ")}\n`);
    if (found.length === 0) {
      console.log(`No Steam event since ${since} names it. Look for the release notes by hand (DATA-14).`);
      continue;
    }
    printCandidates(found);
    const best = found[0] as Candidate;
    // An id like the curated ones: the box, the collection's announcement, or the kit's title.
    const announcement = found.find((c) => !c.releaseNotes)?.title;
    const name = nameKey
      ? heading.replace(/\s+Music Kit Box$/i, "")
      : kits.length > 1
        ? (announcement ?? "").replace(/\s+Music Kits?$/i, "")
        : (splitName(heading, [])?.title ?? heading);
    const draft: Release = {
      id: `${best.date}-${slugify(name) || "music-kits"}`,
      date: best.date,
      nameKey,
      kits,
      source: { url: best.url, title: best.title, quote: best.quotes[0] ?? "" },
      note: null,
    };
    console.log("\nDraft for data/curated/releases.json, from the first post. Check it against the page:\n");
    console.log(`\`\`\`json\n${JSON.stringify(draft, null, 2)}\n\`\`\``);
  }
}

await main();
