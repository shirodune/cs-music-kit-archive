// Covers are stored as the original PNG (DATA-18); pages show the WebP copy made at build time (DATA-18a).
// No data imports here: the rack island imports this module too.

/** Site path of the WebP copy of a stored cover. */
export const coverSrc = (cover: { path: string }): string => cover.path.replace(/\.png$/, ".webp");
