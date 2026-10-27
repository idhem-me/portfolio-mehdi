/** Available publicly while under development; explicit false remains a kill switch. */
export const cardsEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_CARDS !== "false";

/** Keep the work in progress out of search indexes. */
export const cardsPublic = false;
