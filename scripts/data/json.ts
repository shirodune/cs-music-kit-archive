// Deterministic JSON output, so that rebuilding the same input gives byte-identical files (DATA-1).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export function stringify(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

export async function writeJson(path: string | URL, value: unknown): Promise<void> {
  await mkdir(dirname(path instanceof URL ? path.pathname : path), { recursive: true });
  await writeFile(path, stringify(value));
}

export async function readJson<T>(path: string | URL): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}
