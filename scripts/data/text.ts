// Text helpers for the data build: cleaning official strings, splitting names, making slugs.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * Cleans an official string: unescapes \" and \n, turns <br> into a line break,
 * drops other HTML tags and decodes common entities.
 */
export function cleanText(value: string, { singleLine }: { singleLine: boolean }): string {
  let text = value
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => {
      if (body.startsWith("#x") || body.startsWith("#X"))
        return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
      if (body.startsWith("#")) return String.fromCodePoint(Number(body.slice(1)));
      return ENTITIES[body.toLowerCase()] ?? entity;
    });
  if (singleLine) return text.replace(/\s+/g, " ").trim();
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * A separator between the credit and the title (DATA-10): one punctuation mark
 * (comma, colon, ideographic comma or a dash), with or without spaces around it.
 * Official names are not always spaced consistently, for example "New Beat Fund —Sponge Fingerz".
 */
const LEADING_SEPARATOR = /^\s*[,，:：、\-–—]\s*/u;
const TRAILING_SEPARATOR = /\s*[,，:：、\-–—]\s*$/u;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const QUOTE_PAIRS: Record<string, string> = { "《": "》", "「": "」", "『": "』", "“": "”", "«": "»", "„": "“" };

/** For each position, whether it is outside book-title marks and quotation marks. */
function outsideQuotes(text: string): boolean[] {
  const result: boolean[] = [];
  const closers: string[] = [];
  for (const char of text) {
    const closer = QUOTE_PAIRS[char];
    if (closers.length && char === closers[closers.length - 1]) {
      closers.pop();
      result.push(false);
    } else if (closer) {
      closers.push(closer);
      result.push(false);
    } else {
      result.push(closers.length === 0);
    }
  }
  return result;
}

/** Separators that are clear enough to split on when the credit itself is translated. */
const STRONG_SEPARATORS = [" — ", " – ", " - ", ": ", "：", "，", "、", ", "];

/**
 * Splits an official name "Credit<separator>Title" (DATA-10). In order:
 * 1. a known credit text (artist name, alias or curated credit) at the start;
 * 2. the English title at the end, when the locale kept it untranslated;
 * 3. a strong separator that occurs exactly once, for translated credits and titles.
 * Returns null when none applies; the build then asks for an override.
 */
export function splitName(
  name: string,
  credits: readonly string[],
  englishTitle?: string,
): { credit: string; title: string } | null {
  for (const credit of credits) {
    if (!name.startsWith(credit)) continue;
    const rest = name.slice(credit.length);
    const separator = LEADING_SEPARATOR.exec(rest);
    const title = separator ? rest.slice(separator[0].length).trim() : "";
    if (title) return { credit, title };
  }
  if (englishTitle && name.endsWith(englishTitle)) {
    const prefix = name.slice(0, name.length - englishTitle.length);
    const separator = TRAILING_SEPARATOR.exec(prefix);
    const credit = separator ? prefix.slice(0, separator.index).trim() : "";
    if (credit) return { credit, title: englishTitle };
  }
  const outside = outsideQuotes(name);
  for (const separator of STRONG_SEPARATORS) {
    const positions = [...name.matchAll(new RegExp(escapeRegExp(separator), "g"))]
      .map((m) => m.index)
      .filter((i) => outside[i]);
    const first = positions[0];
    if (positions.length === 1 && first !== undefined && first > 0) {
      const credit = name.slice(0, first).trim();
      const title = name.slice(first + separator.length).trim();
      if (credit && title) return { credit, title };
    }
  }
  return null;
}

/** Lowercase ASCII words joined by "-" (DATA-9). Returns "" when nothing is left. */
export function slugify(title: string): string {
  return title
    .replace(/['’]/g, "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{ASCII}]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
