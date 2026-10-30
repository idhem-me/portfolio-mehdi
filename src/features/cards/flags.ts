/** Manual visibility gate for the card-opening game, including development. */
export const cardsVisible = false;

/** Preserve the environment kill switch when visibility is enabled again. */
export const cardsEnabled =
  cardsVisible && process.env.NEXT_PUBLIC_ENABLE_CARDS !== "false";

/** Keep the work in progress out of search indexes. */
export const cardsPublic = false;
