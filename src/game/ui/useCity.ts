"use client";

import { computeCity, type CitySnapshot } from "@/game/core/city";
import { gameStore, useGameStore } from "@/game/store/gameStore";

/**
 * Snapshot ville : s'abonne à des primitives stables, calcule hors sélecteur Zustand
 * (évite getSnapshot instable / boucle React).
 */
export function useCity(): CitySnapshot {
  // Abonnements — déclenchent le re-render quand la ville change
  useGameStore((s) => s.population);
  useGameStore((s) =>
    s.buildings
      .map((b) => `${b.id}:${b.level}:${b.construction ? 1 : 0}`)
      .join("|")
  );
  useGameStore((s) => Math.floor(s.now / 250));

  const s = gameStore.getState();
  return computeCity(s, s.now);
}
