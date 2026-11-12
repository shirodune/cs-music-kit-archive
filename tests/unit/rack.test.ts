import { describe, expect, test } from "vitest";
import { keyTarget, kitToStrip, sleeveOffset, stripToKit, yearGroups } from "../../src/components/rack/geometry.ts";

const years = ["2012", "2014", "2014", "2014", "2015", "2015", "2015", "2015", "2015", "2016"];
const groups = yearGroups(years);

describe("rack geometry", () => {
  test("PROD-10 the year strip has one segment per year, with a minimum width", () => {
    expect(groups.map((g) => [g.year, g.first, g.count])).toEqual([
      ["2012", 0, 1],
      ["2014", 1, 3],
      ["2015", 4, 5],
      ["2016", 9, 1],
    ]);
    // 1 kit and 3 kits both get the minimum of 4 units; 5 kits get 5.
    expect(groups[0]?.to).toBeCloseTo(4 / 17);
    expect((groups[2]?.to ?? 0) - (groups[2]?.from ?? 0)).toBeCloseTo(5 / 17);
    expect(groups.at(-1)?.to).toBe(1);
  });

  test("PROD-10 scrubbing the strip and the playhead agree", () => {
    for (let i = 0; i < years.length; i++) expect(stripToKit(groups, kitToStrip(groups, i, years.length))).toBe(i);
    expect(stripToKit(groups, 0)).toBe(0);
    expect(stripToKit(groups, 0.9999)).toBe(9);
  });

  test("PROD-11 arrow keys step, Page Up and Page Down jump a year, Home and End go to the ends", () => {
    expect(keyTarget(groups, "ArrowRight", 2, 10)).toBe(3);
    expect(keyTarget(groups, "ArrowLeft", 0, 10)).toBe(0);
    expect(keyTarget(groups, "PageDown", 2, 10)).toBe(4);
    expect(keyTarget(groups, "PageDown", 9, 10)).toBe(9);
    expect(keyTarget(groups, "PageUp", 6, 10)).toBe(4);
    expect(keyTarget(groups, "PageUp", 4, 10)).toBe(1);
    expect(keyTarget(groups, "Home", 6, 10)).toBe(0);
    expect(keyTarget(groups, "End", 6, 10)).toBe(9);
    expect(keyTarget(groups, "Tab", 6, 10)).toBeNull();
  });

  test("PROD-8 the selected sleeve sits in the middle with more room on its right", () => {
    expect(sleeveOffset(0)).toBe(0);
    expect(sleeveOffset(1)).toBeGreaterThan(-sleeveOffset(-1));
    expect(sleeveOffset(2) - sleeveOffset(1)).toBe(270);
  });
});
