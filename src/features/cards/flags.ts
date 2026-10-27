/**
 * Enabled on localhost (`next dev`), disabled on production builds.
 * Override with NEXT_PUBLIC_ENABLE_CARDS=true for a remote preview.
 */
export const cardsEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_CARDS === "true";

/** Prototype: keep out of search indexes. */
export const cardsPublic = false;
