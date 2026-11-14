// UI message lookup (conventions in CLAUDE.md, D-012).
// Messages live in messages/{segment}.json. English is the source and the fallback.

import en from "../../messages/en.json";
import { getLocale, type LocaleSegment } from "./locales.ts";

export type MessageKey = keyof typeof en;
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>>;
export type Message = string | PluralMessage;
export type Catalog = Partial<Record<MessageKey, Message>>;
export type MessageValues = Record<string, string | number>;
export type Translate = (key: MessageKey, values?: MessageValues) => string;

const catalogs = import.meta.glob<Catalog>("../../messages/*.json", { eager: true, import: "default" });

export function getCatalog(segment: LocaleSegment): Catalog {
  return catalogs[`../../messages/${segment}.json`] ?? {};
}

const PLACEHOLDER = /\{(\w+)\}/g;

/** Returns `t()` for one locale. */
export function createT(segment: LocaleSegment, catalog: Catalog = getCatalog(segment)): Translate {
  const { tag } = getLocale(segment);
  const plurals = new Intl.PluralRules(tag);
  const numbers = new Intl.NumberFormat(tag);
  const source = en as Record<MessageKey, Message>;

  return function t(key, values = {}) {
    const message = catalog[key] ?? source[key];
    if (message === undefined) throw new Error(`Unknown message key: ${key}`);

    let text: string;
    if (typeof message === "string") {
      text = message;
    } else {
      const count = values.count;
      if (typeof count !== "number") throw new Error(`Message "${key}" is a plural and needs a numeric {count}`);
      const form = message[plurals.select(count)] ?? message.other;
      if (form === undefined) throw new Error(`Message "${key}" has no "other" form`);
      text = form;
    }

    return text.replace(PLACEHOLDER, (_match: string, name: string) => {
      const value = values[name];
      if (value === undefined) throw new Error(`Message "${key}" needs a value for {${name}}`);
      return typeof value === "number" ? numbers.format(value) : value;
    });
  };
}
