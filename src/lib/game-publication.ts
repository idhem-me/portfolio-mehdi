/** Local previews are deliberately unavailable on Vercel deployments. */
export const isLocalGamePreview =
  process.env.NODE_ENV === "development" && !process.env.VERCEL;
