import { getCard } from "../catalog/cards";
import { parseSave } from "../persistence/repository";
import { RARITIES } from "../catalog/types";
import type { CardsSave } from "../persistence/types";
const integer = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export function validateCloudSave(raw: unknown): CardsSave {
  if (!raw || typeof raw !== "object") throw Error("Invalid progress");
  const data = raw as CardsSave;
  if (
    !data.collection ||
    typeof data.collection !== "object" ||
    Array.isArray(data.collection) ||
    !data.stats ||
    !integer(data.stats.boostersOpened) ||
    !integer(data.stats.goldPacksOpened) ||
    data.stats.goldPacksOpened > data.stats.boostersOpened
  )
    throw Error("Invalid progress");
  for (const [id, entry] of Object.entries(data.collection)) {
    if (
      !getCard(id) ||
      !entry ||
      !integer(entry.qty) ||
      !integer(entry.firstAcquiredAt) ||
      !integer(entry.lastAcquiredAt) ||
      (entry.shinyQty !== undefined &&
        (!integer(entry.shinyQty) || entry.shinyQty > entry.qty))
    )
      throw Error("Invalid progress");
  }
  if (RARITIES.some((rarity) => !integer(data.stats.copiesByRarity?.[rarity])))
    throw Error("Invalid progress");
  if (
    !data.boosters ||
    !integer(data.boosters.available) ||
    data.boosters.available > 10 ||
    !integer(data.boosters.updatedAt)
  )
    throw Error("Invalid progress");
  if (
    !Array.isArray(data.finalizedOpenIds) ||
    data.finalizedOpenIds.length > 200 ||
    data.finalizedOpenIds.some(
      (id) => typeof id !== "string" || id.length > 128,
    )
  )
    throw Error("Invalid progress");
  const parsed = parseSave(data);
  if (data.activeOpen && (!parsed.activeOpen || data.activeOpen.simulation))
    throw Error("Invalid progress");
  return parsed;
}
