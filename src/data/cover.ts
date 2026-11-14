// Covers are stored as the original PNG (DATA-19); pages show WebP copies made at build time.
// A texture cover also gets a small copy for thumbnails. No data imports here: the rack island imports this too.

export interface CoverRef {
  source: "icon" | "texture";
  path: string;
  width: number;
  height: number;
}

/** Widths of the WebP copies: the large one is enough for the largest cover at twice the pixel density. */
export const COVER_LARGE = 768;
export const COVER_SMALL = 320;

const base = (cover: { path: string }) => cover.path.replace(/\.png$/, "");

/** Site path of the large WebP copy of a stored cover. */
export const coverSrc = (cover: { path: string }): string => `${base(cover)}.webp`;

/** Both copies of a texture larger than the small size, for `srcset`; undefined when there is only one. */
export function coverSrcSet(cover: CoverRef): string | undefined {
  if (cover.source !== "texture" || cover.width <= COVER_SMALL) return undefined;
  return `${base(cover)}-${COVER_SMALL}.webp ${COVER_SMALL}w, ${coverSrc(cover)} ${Math.min(cover.width, COVER_LARGE)}w`;
}
