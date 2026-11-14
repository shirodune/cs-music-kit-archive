// Locale-aware formatting (conventions in CLAUDE.md).

/** Formats a date-only value (YYYY-MM-DD) without shifting the day. */
export function formatDate(tag: string, isoDate: string): string {
  return new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

/** m:ss. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Catalogue number, "Nº 009". */
export function catalogueNumber(defIndex: number): string {
  return `Nº ${String(defIndex).padStart(3, "0")}`;
}

/** Splits a conjunction list into parts so each item can be wrapped, for example in a link. */
export function listParts<T>(tag: string, items: T[], label: (item: T) => string) {
  const parts = new Intl.ListFormat(tag, { type: "conjunction" }).formatToParts(items.map(label));
  let index = 0;
  return parts.map((part) =>
    part.type === "element" ? { item: items[index++] as T, text: part.value } : { item: undefined, text: part.value },
  );
}

const WIDE = /[\p{sc=Han}\p{sc=Hangul}\p{sc=Hiragana}\p{sc=Katakana}]/u;

/** Rough display width of a title: wide characters (CJK, Hangul, kana) count double. */
export function displayWidth(text: string): { width: number; wide: boolean } {
  const wide = [...text].filter((c) => WIDE.test(c)).length;
  return { width: [...text].length + wide, wide: wide > 0 };
}
