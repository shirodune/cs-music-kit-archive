// Parser for Valve KeyValues 1 text ("VDF"), as used by items_game.txt.
// Duplicate keys whose values are both objects are merged, because items_game.txt
// repeats top-level blocks such as "music_definitions" many times. Otherwise the last value wins.

export type VdfValue = string | VdfObject;
export interface VdfObject {
  [key: string]: VdfValue;
}

type Token = { kind: "string"; value: string } | { kind: "open" } | { kind: "close" };

function* tokenize(text: string): Generator<Token> {
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === undefined) break;
    if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === "﻿") {
      i++;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
    } else if (c === "{") {
      i++;
      yield { kind: "open" };
    } else if (c === "}") {
      i++;
      yield { kind: "close" };
    } else if (c === "[") {
      // Platform conditional such as [$WIN32]: ignored.
      while (i < n && text[i] !== "]") i++;
      i++;
    } else if (c === '"') {
      i++;
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
      i++;
      yield { kind: "string", value };
    } else {
      let value = "";
      while (i < n && !/[\s{}"]/.test(text[i] ?? "")) {
        value += text[i];
        i++;
      }
      yield { kind: "string", value };
    }
  }
}

function merge(target: VdfObject, key: string, value: VdfValue): void {
  const existing = target[key];
  if (existing !== undefined && typeof existing === "object" && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) merge(existing, k, v);
  } else {
    target[key] = value;
  }
}

export function parseVdf(text: string): VdfObject {
  const tokens = tokenize(text);
  const root: VdfObject = {};
  const stack: VdfObject[] = [root];
  let pendingKey: string | null = null;

  for (const token of tokens) {
    const current = stack[stack.length - 1];
    if (current === undefined) throw new Error("VDF: unbalanced braces");
    if (token.kind === "string") {
      if (pendingKey === null) {
        pendingKey = token.value;
      } else {
        merge(current, pendingKey, token.value);
        pendingKey = null;
      }
    } else if (token.kind === "open") {
      if (pendingKey === null) throw new Error("VDF: object without a key");
      const child: VdfObject = {};
      merge(current, pendingKey, child);
      // When merged into an existing object, keep writing into that object.
      const target = current[pendingKey];
      stack.push(typeof target === "object" ? target : child);
      pendingKey = null;
    } else {
      if (stack.length === 1) throw new Error("VDF: unexpected closing brace");
      stack.pop();
    }
  }
  if (stack.length !== 1) throw new Error("VDF: unclosed object");
  if (pendingKey !== null) throw new Error(`VDF: key without a value: ${pendingKey}`);
  return root;
}
