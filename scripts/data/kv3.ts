// Parser for Valve KeyValues 3 text, as used by .vsndevts sound event files.
// Supports objects, arrays, strings (including """multi-line"""), numbers, booleans, null,
// flagged values such as resource:"path", and // and /* */ comments.

export type Kv3Value = string | number | boolean | null | Kv3Value[] | Kv3Object;
export interface Kv3Object {
  [key: string]: Kv3Value;
}

export function parseKv3(text: string): Kv3Object {
  let i = 0;
  const n = text.length;

  const fail = (message: string): never => {
    const line = text.slice(0, i).split("\n").length;
    throw new Error(`KV3: ${message} at line ${line}`);
  };

  const skip = (): void => {
    while (i < n) {
      const c = text[i];
      if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === "﻿") {
        i++;
      } else if (text.startsWith("//", i)) {
        while (i < n && text[i] !== "\n") i++;
      } else if (text.startsWith("/*", i)) {
        const end = text.indexOf("*/", i + 2);
        i = end === -1 ? n : end + 2;
      } else if (text.startsWith("<!--", i)) {
        const end = text.indexOf("-->", i + 4);
        i = end === -1 ? n : end + 3;
      } else {
        break;
      }
    }
  };

  const readString = (): string => {
    if (text.startsWith('"""', i)) {
      const end = text.indexOf('"""', i + 3);
      if (end === -1) fail("unterminated multi-line string");
      const value = text
        .slice(i + 3, end)
        .replace(/^\r?\n/, "")
        .replace(/\r?\n$/, "");
      i = end + 3;
      return value;
    }
    i++; // opening quote
    let value = "";
    while (i < n && text[i] !== '"') {
      if (text[i] === "\\" && i + 1 < n) {
        const next = text[i + 1];
        value += next === "n" ? "\n" : next === "t" ? "\t" : next;
        i += 2;
      } else {
        value += text[i];
        i++;
      }
    }
    if (i >= n) fail("unterminated string");
    i++; // closing quote
    return value;
  };

  const readWord = (): string => {
    const start = i;
    while (i < n && /[A-Za-z0-9_.$+-]/.test(text[i] ?? "")) i++;
    if (i === start) fail(`unexpected character ${JSON.stringify(text[i])}`);
    return text.slice(start, i);
  };

  const readKey = (): string => {
    skip();
    return text[i] === '"' ? readString() : readWord();
  };

  const readValue = (): Kv3Value => {
    skip();
    const c = text[i];
    if (c === "{") return readObject();
    if (c === "[") return readArray();
    if (c === '"') return readString();
    const word = readWord();
    // Flagged value, for example resource:"sounds/foo.vsnd".
    if (text[i] === ":") {
      i++;
      return readValue();
    }
    if (word === "true") return true;
    if (word === "false") return false;
    if (word === "null") return null;
    const number = Number(word);
    return Number.isNaN(number) ? word : number;
  };

  const readArray = (): Kv3Value[] => {
    i++; // [
    const items: Kv3Value[] = [];
    for (;;) {
      skip();
      if (text[i] === "]") {
        i++;
        return items;
      }
      items.push(readValue());
      skip();
      if (text[i] === ",") i++;
      else if (text[i] !== "]") fail("expected , or ] in array");
    }
  };

  const readObject = (): Kv3Object => {
    i++; // {
    const object: Kv3Object = {};
    for (;;) {
      skip();
      if (i >= n) fail("unclosed object");
      if (text[i] === "}") {
        i++;
        return object;
      }
      const key = readKey();
      skip();
      if (text[i] !== "=") fail(`expected = after key ${key}`);
      // Assigning "__proto__" would change the object's prototype instead of adding a key.
      if (key === "__proto__") fail("key __proto__ is not supported");
      i++;
      object[key] = readValue();
    }
  };

  skip();
  if (text[i] !== "{") fail("expected { at the start of the document");
  const result = readObject();
  skip();
  if (i < n) fail("unexpected content after the root object");
  return result;
}
