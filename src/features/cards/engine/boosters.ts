/** Local prototype economy: one free booster per elapsed hour, up to ten. */
export const BOOSTER_CAPACITY = 10;
export const BOOSTER_INTERVAL_MS = 60 * 60 * 1000;
export type BoosterBank = { available: number; updatedAt: number };
export function initialBoosterBank(now = Date.now()): BoosterBank {
  return { available: BOOSTER_CAPACITY, updatedAt: now };
}
export function refillBoosters(
  bank: BoosterBank,
  now = Date.now(),
): BoosterBank {
  const available = Math.max(
    0,
    Math.min(BOOSTER_CAPACITY, Math.floor(bank.available)),
  );
  // Do not grant rewards for a clock rollback, nor retain overflow hours at the cap.
  const time = Math.max(now, bank.updatedAt);
  if (available === BOOSTER_CAPACITY) return { available, updatedAt: time };
  const hours = Math.floor((time - bank.updatedAt) / BOOSTER_INTERVAL_MS);
  const next = Math.min(BOOSTER_CAPACITY, available + hours);
  return {
    available: next,
    updatedAt:
      next === BOOSTER_CAPACITY
        ? time
        : bank.updatedAt + hours * BOOSTER_INTERVAL_MS,
  };
}
export function nextBoosterIn(
  bank: BoosterBank,
  now = Date.now(),
): number | null {
  const current = refillBoosters(bank, now);
  return current.available === BOOSTER_CAPACITY
    ? null
    : Math.max(0, current.updatedAt + BOOSTER_INTERVAL_MS - now);
}
export function canBypassBoosterLimit(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      window.location.hostname,
    )
  );
}
