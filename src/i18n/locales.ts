// The 28 languages CS2 ships (spec: i18n.md, I18N-1, I18N-2).
// This is the only place the locale table is written down. Everything else imports it.

export type ScriptGroup = "latin" | "cyrillic" | "greek" | "thai" | "ja" | "ko" | "zh-hans" | "zh-hant";

export interface Locale {
  /** URL segment and file name, for example `zh-hans`. */
  readonly segment: string;
  /** BCP 47 tag for `lang`, `hreflang` and `Intl`. */
  readonly tag: string;
  /** Language name in the game's localization files (`csgo_{valve}.json`). */
  readonly valve: string;
  /** The language's own name, shown in the language picker. */
  readonly name: string;
  readonly script: ScriptGroup;
}

export const LOCALES = [
  { segment: "en", tag: "en", valve: "english", name: "English", script: "latin" },
  { segment: "fr", tag: "fr", valve: "french", name: "Français", script: "latin" },
  { segment: "de", tag: "de", valve: "german", name: "Deutsch", script: "latin" },
  { segment: "es", tag: "es-ES", valve: "spanish", name: "Español (España)", script: "latin" },
  { segment: "es-419", tag: "es-419", valve: "latam", name: "Español (Latinoamérica)", script: "latin" },
  { segment: "pt-br", tag: "pt-BR", valve: "brazilian", name: "Português (Brasil)", script: "latin" },
  { segment: "pt-pt", tag: "pt-PT", valve: "portuguese", name: "Português (Portugal)", script: "latin" },
  { segment: "it", tag: "it", valve: "italian", name: "Italiano", script: "latin" },
  { segment: "nl", tag: "nl", valve: "dutch", name: "Nederlands", script: "latin" },
  { segment: "da", tag: "da", valve: "danish", name: "Dansk", script: "latin" },
  { segment: "nb", tag: "nb", valve: "norwegian", name: "Norsk", script: "latin" },
  { segment: "sv", tag: "sv", valve: "swedish", name: "Svenska", script: "latin" },
  { segment: "fi", tag: "fi", valve: "finnish", name: "Suomi", script: "latin" },
  { segment: "pl", tag: "pl", valve: "polish", name: "Polski", script: "latin" },
  { segment: "cs", tag: "cs", valve: "czech", name: "Čeština", script: "latin" },
  { segment: "hu", tag: "hu", valve: "hungarian", name: "Magyar", script: "latin" },
  { segment: "ro", tag: "ro", valve: "romanian", name: "Română", script: "latin" },
  { segment: "tr", tag: "tr", valve: "turkish", name: "Türkçe", script: "latin" },
  { segment: "vi", tag: "vi", valve: "vietnamese", name: "Tiếng Việt", script: "latin" },
  { segment: "ru", tag: "ru", valve: "russian", name: "Русский", script: "cyrillic" },
  { segment: "uk", tag: "uk", valve: "ukrainian", name: "Українська", script: "cyrillic" },
  { segment: "bg", tag: "bg", valve: "bulgarian", name: "Български", script: "cyrillic" },
  { segment: "el", tag: "el", valve: "greek", name: "Ελληνικά", script: "greek" },
  { segment: "th", tag: "th", valve: "thai", name: "ไทย", script: "thai" },
  { segment: "ja", tag: "ja", valve: "japanese", name: "日本語", script: "ja" },
  { segment: "ko", tag: "ko", valve: "koreana", name: "한국어", script: "ko" },
  { segment: "zh-hans", tag: "zh-Hans", valve: "schinese", name: "简体中文", script: "zh-hans" },
  { segment: "zh-hant", tag: "zh-Hant", valve: "tchinese", name: "繁體中文", script: "zh-hant" },
] as const satisfies readonly Locale[];

export type LocaleSegment = (typeof LOCALES)[number]["segment"];

export const DEFAULT_LOCALE: LocaleSegment = "en";

export const LOCALE_SEGMENTS: readonly LocaleSegment[] = LOCALES.map((l) => l.segment);

const bySegment = new Map<string, Locale>(LOCALES.map((l) => [l.segment, l]));

export function isLocaleSegment(value: unknown): value is LocaleSegment {
  return typeof value === "string" && bySegment.has(value);
}

export function getLocale(segment: LocaleSegment): Locale {
  const locale = bySegment.get(segment);
  if (!locale) throw new Error(`Unknown locale segment: ${segment}`);
  return locale;
}
