export const MAX_OPENING_BOOSTERS = 10;
/** The UI clamps edits; Postgres independently validates against the locked inventory. */
export function clampQuantity(value: number, available: number) {
  const maximum = Math.max(
    0,
    Math.min(MAX_OPENING_BOOSTERS, Math.floor(available)),
  );
  return maximum === 0
    ? 0
    : Math.max(
        1,
        Math.min(maximum, Number.isFinite(value) ? Math.floor(value) : 1),
      );
}
