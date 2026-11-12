// Locale-aware formatting (spec: I18N-13 to I18N-15).

/** Formats a date-only value (YYYY-MM-DD) without shifting the day (I18N-13). */
export function formatDate(tag: string, isoDate: string): string {
  return new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

/** m:ss (I18N-14). */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Catalogue number, "Nº 009" (PROD-9). */
export function catalogueNumber(defIndex: number): string {
  return `Nº ${String(defIndex).padStart(3, "0")}`;
}

/** Splits a conjunction list into parts so each item can be wrapped, for example in a link (I18N-15). */
export function listParts<T>(tag: string, items: T[], label: (item: T) => string) {
  const parts = new Intl.ListFormat(tag, { type: "conjunction" }).formatToParts(items.map(label));
  let index = 0;
  return parts.map((part) =>
    part.type === "element" ? { item: items[index++] as T, text: part.value } : { item: undefined, text: part.value },
  );
}
