// Checks messages/{segment}.json against English (spec: I18N-7).
// Errors fail the run. Missing keys are warnings, because English fallback is allowed.
// Usage: node scripts/i18n-check.ts

import { readFileSync } from "node:fs";
import { LOCALES } from "../src/i18n/locales.ts";

type Message = string | Record<string, string>;
type Catalog = Record<string, Message>;

export interface CheckResult {
  errors: string[];
  warnings: string[];
}

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(text: string): string {
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))].sort().join(",");
}

function forms(message: Message): string[] {
  return typeof message === "string" ? [message] : Object.values(message);
}

export function requiredCategories(tag: string): string[] {
  return [...new Intl.PluralRules(tag).resolvedOptions().pluralCategories].sort();
}

export function checkCatalog(segment: string, tag: string, catalog: Catalog, source: Catalog): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const need = requiredCategories(tag);

  for (const [key, message] of Object.entries(catalog)) {
    const english = source[key];
    if (english === undefined) {
      errors.push(`${segment}: "${key}" is not in en.json`);
      continue;
    }
    if (typeof message !== typeof english) {
      errors.push(`${segment}: "${key}" must be ${typeof english === "string" ? "a string" : "a plural object"}`);
      continue;
    }
    if (typeof message !== "string") {
      const have = Object.keys(message).sort();
      const missing = need.filter((c) => !have.includes(c));
      const extra = have.filter((c) => !need.includes(c));
      if (missing.length) errors.push(`${segment}: "${key}" is missing plural forms: ${missing.join(", ")}`);
      if (extra.length)
        errors.push(`${segment}: "${key}" has plural forms ${segment} does not use: ${extra.join(", ")}`);
    }
    const expected = placeholders(typeof english === "string" ? english : (english.other ?? ""));
    for (const form of forms(message)) {
      if (placeholders(form) !== expected) {
        errors.push(`${segment}: "${key}" placeholders {${placeholders(form)}} differ from English {${expected}}`);
        break;
      }
    }
  }

  for (const key of Object.keys(source)) {
    if (!(key in catalog)) warnings.push(`${segment}: "${key}" is missing (English is shown)`);
  }

  return { errors, warnings };
}

function load(segment: string): Catalog {
  return JSON.parse(readFileSync(new URL(`../messages/${segment}.json`, import.meta.url), "utf8"));
}

function main(): void {
  const source = load("en");
  const result: CheckResult = { errors: [], warnings: [] };

  for (const { segment, tag } of LOCALES) {
    const { errors, warnings } = checkCatalog(segment, tag, load(segment), source);
    result.errors.push(...errors);
    result.warnings.push(...warnings);
  }

  const missingByLocale = new Map<string, number>();
  for (const w of result.warnings) {
    const segment = w.slice(0, w.indexOf(":"));
    missingByLocale.set(segment, (missingByLocale.get(segment) ?? 0) + 1);
  }
  if (missingByLocale.size) {
    const summary = [...missingByLocale].map(([s, n]) => `${s} ${n}`).join(", ");
    console.warn(`Missing keys (English fallback): ${summary}`);
  }
  for (const e of result.errors) console.error(`error  ${e}`);

  console.log(
    `${LOCALES.length} locales checked: ${result.errors.length} errors, ${result.warnings.length} missing keys`,
  );
  if (result.errors.length) process.exitCode = 1;
}

if (import.meta.main) main();
