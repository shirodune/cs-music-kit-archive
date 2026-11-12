import { describe, expect, test } from "vitest";
import { catalogueNumber, formatDate, formatDuration, listParts } from "../../src/i18n/format.ts";

describe("format", () => {
  test("I18N-13 date-only values never shift a day", () => {
    expect(formatDate("en", "2014-10-10")).toBe("Oct 10, 2014");
    expect(formatDate("zh-Hans", "2012-08-21")).toBe("2012年8月21日");
  });

  test("I18N-14 durations are m:ss", () => {
    expect(formatDuration(8.4)).toBe("0:08");
    expect(formatDuration(163.5)).toBe("2:44");
    expect(formatDuration(600)).toBe("10:00");
  });

  test("PROD-9 catalogue numbers have three digits", () => {
    expect(catalogueNumber(9)).toBe("Nº 009");
    expect(catalogueNumber(101)).toBe("Nº 101");
  });

  test("I18N-15 list parts keep each item for linking", () => {
    const parts = listParts("en", [{ n: "Tree Adams" }, { n: "Ben Bromfield" }], (a) => a.n);
    expect(parts.map((p) => p.text).join("")).toBe("Tree Adams and Ben Bromfield");
    expect(parts.filter((p) => p.item).map((p) => p.item?.n)).toEqual(["Tree Adams", "Ben Bromfield"]);
  });
});
