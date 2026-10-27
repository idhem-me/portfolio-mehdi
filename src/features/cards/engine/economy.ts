import { MAX_OPENING_BOOSTERS } from "./quantity";
export const GEM_COST_PER_BOOSTER = 100;
export function openingCost(quantity: number, freeBoosters: number) {
  const freeUsed = Math.min(
    Math.max(0, Math.floor(freeBoosters)),
    Math.max(0, Math.floor(quantity)),
  );
  return {
    freeUsed,
    gems: Math.max(0, Math.floor(quantity) - freeUsed) * GEM_COST_PER_BOOSTER,
  };
}
export function affordableBoosters(freeBoosters: number, gems: number) {
  return Math.min(
    MAX_OPENING_BOOSTERS,
    Math.max(0, Math.floor(freeBoosters)) +
      Math.floor(Math.max(0, gems) / GEM_COST_PER_BOOSTER),
  );
}
export function boosterCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
