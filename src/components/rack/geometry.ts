// Pure geometry of the records rack (spec: PROD-7 to PROD-11). No DOM access, so it is unit-tested.

export interface YearGroup {
  year: string;
  /** Index of the year's first kit in rack order. */
  first: number;
  count: number;
  /** Share of the year strip, from 0 to 1. Short years get a minimum width so their label fits. */
  from: number;
  to: number;
}

const MIN_YEAR_UNITS = 4;

/** Years in rack order, from the release year of each kit (already in rack order). */
export function yearGroups(years: string[]): YearGroup[] {
  const groups: { year: string; first: number; count: number }[] = [];
  years.forEach((year, i) => {
    const last = groups.at(-1);
    if (last?.year === year) last.count++;
    else groups.push({ year, first: i, count: 1 });
  });
  const units = groups.map((g) => Math.max(g.count, MIN_YEAR_UNITS));
  const total = units.reduce((a, b) => a + b, 0);
  let start = 0;
  return groups.map((g, i) => {
    const from = start / total;
    start += units[i] as number;
    return { ...g, from, to: start / total };
  });
}

/** Index of the year group that holds kit `index`. */
export function yearOf(groups: YearGroup[], index: number): number {
  for (let i = groups.length - 1; i >= 0; i--) if (index >= (groups[i] as YearGroup).first) return i;
  return 0;
}

/** Position of a (possibly fractional) kit index on the year strip, from 0 to 1. */
export function kitToStrip(groups: YearGroup[], position: number, kitCount: number): number {
  const at = (n: number) => {
    const g = groups[yearOf(groups, n)] as YearGroup;
    return g.from + (g.to - g.from) * ((n - g.first + 0.5) / g.count);
  };
  const p = Math.max(0, Math.min(kitCount - 1, position));
  const lo = Math.floor(p);
  const f = p - lo;
  return f === 0 || lo + 1 >= kitCount ? at(lo) : at(lo) + (at(lo + 1) - at(lo)) * f;
}

/** Kit index under a point of the year strip (0 to 1). */
export function stripToKit(groups: YearGroup[], x: number): number {
  for (const [i, g] of groups.entries()) {
    if (x < g.to || i === groups.length - 1) {
      const r = (x - g.from) / (g.to - g.from);
      return g.first + Math.max(0, Math.min(g.count - 1, Math.floor(r * g.count)));
    }
  }
  return 0;
}

/** Sleeve width in px at scale 1. */
export const SLEEVE_PX = 420;

/**
 * Scale of the rack for a stage width: 1 from 900 px, smaller below (the interim phone rack).
 * The stage's `--w` in CSS is `SLEEVE_PX * rackScale(width)`, written with container query units.
 */
export function rackScale(stageWidth: number): number {
  return stageWidth < 900 ? Math.max(0.5, Math.min(0.8, stageWidth / 760)) : 1;
}

/**
 * Horizontal offset in px of a sleeve `distance` places from the selected one, at scale 1.
 * The selected sleeve leaves more room on its right, where its disc sticks out.
 */
export function sleeveOffset(distance: number): number {
  const d = Math.abs(distance);
  if (distance < 0) return -(Math.min(d, 1) * 330 + Math.max(d - 1, 0) * 250);
  return Math.min(d, 1) * 470 + Math.max(d - 1, 0) * 270;
}

/** Next selection for a key press (PROD-11), or null when the key does nothing. */
export function keyTarget(groups: YearGroup[], key: string, current: number, kitCount: number): number | null {
  const y = yearOf(groups, current);
  const group = groups[y] as YearGroup;
  switch (key) {
    case "ArrowRight":
      return Math.min(kitCount - 1, current + 1);
    case "ArrowLeft":
      return Math.max(0, current - 1);
    case "Home":
      return 0;
    case "End":
      return kitCount - 1;
    case "PageDown":
      return groups[y + 1]?.first ?? kitCount - 1;
    case "PageUp":
      return current > group.first ? group.first : (groups[Math.max(0, y - 1)] as YearGroup).first;
    default:
      return null;
  }
}
