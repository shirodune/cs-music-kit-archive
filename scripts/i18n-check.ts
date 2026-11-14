// Checks messages/{segment}.json against English (conventions in CLAUDE.md).
// Any problem fails the run, a missing key included: every locale has every message (SPEC.md: I18N-12a).
// Usage: node scripts/i18n-check.ts

import { readFileSync } from "node:fs";
import { LOCALES } from "../src/i18n/locales.ts";

type Message = string | Record<string, string>;
type Catalog = Record<string, Message>;

export interface CheckResult {
  errors: string[];
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
    if (!(key in catalog)) errors.push(`${segment}: "${key}" is missing`);
  }

  return { errors };
}

function load(segment: string): Catalog {
  return JSON.parse(readFileSync(new URL(`../messages/${segment}.json`, import.meta.url), "utf8"));
}

function main(): void {
  const source = load("en");
  const result: CheckResult = { errors: [] };

  for (const { segment, tag } of LOCALES)
    result.errors.push(...checkCatalog(segment, tag, load(segment), source).errors);

  for (const e of result.errors) console.error(`error  ${e}`);

  console.log(`${LOCALES.length} locales checked: ${result.errors.length} errors`);
  if (result.errors.length) process.exitCode = 1;
}

if (import.meta.main) main();
