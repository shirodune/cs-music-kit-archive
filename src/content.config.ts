// Stories (kit pages) and introductions (artist pages), written for this site (spec: DATA-22, DATA-23, PROD-27).
// Files are content/stories/{kit-slug}/{locale}.md and content/artists/{artist-slug}/{locale}.md; the entry id is
// "{slug}/{locale}". src/data/content.ts checks the folders and languages when a page reads them.

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { contentSchema } from "./data/content.ts";

const collection = (folder: string) =>
  defineCollection({
    loader: glob({
      pattern: "*/*.md",
      base: `./content/${folder}`,
      generateId: ({ entry }) => entry.replace(/\.md$/, ""),
    }),
    schema: contentSchema,
  });

export const collections = { stories: collection("stories"), introductions: collection("artists") };
