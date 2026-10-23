"use client";

/**
 * Store singleton de module : survit à la navigation client, reset au refresh.
 * État sérialisable (version: 1) — prêt pour persist V1.1.
 */
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import {
  buyParcel,
  collectAll,
  collectBuilding,
  createInitialState,
  debugGrantAll,
  placeBuilding,
  selectBuilding,
  setPlacingType,
  setTimeScale,
  startUpgrade,
  tick,
} from "@/game/core/actions";
import type { BuildingTypeId, GameState } from "@/game/core/types";

export type GameStore = GameState & {
  now: number;
  clockOriginReal: number;
  clockOriginGame: number;
  toast: string | null;
  setNow: (now: number) => void;
  clearToast: () => void;
  doTick: (realNow: number) => void;
  gameNow: (realNow?: number) => number;
  startPlace: (type: BuildingTypeId) => void;
  cancelPlace: () => void;
  confirmPlace: (x: number, y: number, now: number) => void;
  select: (id: string | null) => void;
  upgrade: (id: string, now: number) => void;
  collect: (id: string, now: number) => void;
  harvestAll: (now: number) => void;
  purchaseParcel: (px: number, py: number) => void;
  grantDebug: () => void;
  setSpeed: (scale: number) => void;
};

function withToast(
  partial: Partial<GameStore>,
  message?: string
): Partial<GameStore> {
  if (message) return { ...partial, toast: message };
  return partial;
}

function createGameStore() {
  const boot = Date.now();
  const initial = createInitialState(boot);

  return createStore<GameStore>((set, get) => ({
    ...initial,
    now: boot,
    clockOriginReal: boot,
    clockOriginGame: boot,
    toast: null,
    setNow: (now) => set({ now }),
    clearToast: () => set({ toast: null }),
    gameNow: (realNow = Date.now()) => {
      const s = get();
      return s.clockOriginGame + (realNow - s.clockOriginReal) * s.timeScale;
    },
    doTick: (realNow) => {
      const now = get().gameNow(realNow);
      const next = tick(get(), now);
      set({ ...next, now });
    },
    startPlace: (type) => set(setPlacingType(get(), type)),
    cancelPlace: () => set(setPlacingType(get(), null)),
    confirmPlace: (x, y, now) => {
      const type = get().placingType;
      if (!type) return;
      const gameNow = get().gameNow(now);
      const res = placeBuilding(get(), type, x, y, gameNow);
      set(withToast({ ...res.state, now: gameNow }, res.message));
    },
    select: (id) => set(selectBuilding(get(), id)),
    upgrade: (id, now) => {
      const gameNow = get().gameNow(now);
      const res = startUpgrade(get(), id, gameNow);
      set(withToast({ ...res.state, now: gameNow }, res.message));
    },
    collect: (id, now) => {
      const gameNow = get().gameNow(now);
      const res = collectBuilding(get(), id, gameNow);
      set(
        withToast({ ...res.state, now: gameNow }, res.ok ? undefined : res.message)
      );
    },
    harvestAll: (now) => {
      const gameNow = get().gameNow(now);
      const res = collectAll(get(), gameNow);
      set(withToast({ ...res.state, now: gameNow }, res.message));
    },
    purchaseParcel: (px, py) => {
      const res = buyParcel(get(), px, py);
      set(withToast({ ...res.state }, res.message));
    },
    grantDebug: () => set(debugGrantAll(get())),
    setSpeed: (scale) => {
      const realNow = Date.now();
      const s = get();
      const gameNow = s.gameNow(realNow);
      set({
        ...setTimeScale(s, scale),
        clockOriginReal: realNow,
        clockOriginGame: gameNow,
        now: gameNow,
      });
    },
  }));
}

export const gameStore = createGameStore();

export function useGameStore<T>(selector: (s: GameStore) => T): T {
  return useStore(gameStore, selector);
}
