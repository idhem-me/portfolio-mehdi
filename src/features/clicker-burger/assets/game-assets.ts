import { LEVELS } from "../data/levels";
export const BURGER_ASSETS = { levels: LEVELS };
// Retained only for legacy saves and the unused map renderer.
export const GAME_ASSETS: Record<
  string,
  { name: string; png: string | null; status: string }
> = {
  stand: {
    name: "Burger Stand",
    png: BURGER_ASSETS.levels[0].image,
    status: "available",
  },
  restaurant: {
    name: "Burger Restaurant",
    png: BURGER_ASSETS.levels[1].image,
    status: "available",
  },
  farm: { name: "Ferme", png: null, status: "legacy" },
  factory: { name: "Usine", png: null, status: "legacy" },
  warehouse: { name: "Entrepôt", png: null, status: "legacy" },
  orbital: {
    name: "Burger Mars",
    png: BURGER_ASSETS.levels[3].image,
    status: "available",
  },
};
