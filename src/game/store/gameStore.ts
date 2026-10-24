"use client";

/**
 * Store singleton de module : survit à la navigation client, reset au refresh.
 * État sérialisable (version: 5) — prêt pour persist V1.1.
 */
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import {
  buyParcel,
  cancelMove,
  collectAll,
  collectBuilding,
  createInitialState,
  cyclePlacingRotation,
  debugGrantAll,
  demolishBuilding,
  migrate,
  moveBuilding,
  placeBuilding,
  selectBuilding,
  setBulldozeMode,
  setPlacingRoad,
  setPlacingType,
  setTimeScale,
  startMoveBuilding,
  startUpgrade,
  tick,
} from "@/game/core/actions";
import { getBuildingDef } from "@/game/core/buildings";
import { paveRoad, unpaveRoad } from "@/game/core/roads";
import type { BuildingTypeId, GameState, NeedId } from "@/game/core/types";

export type TutorialStep = 0 | 1 | 2 | 3;

export type GameStore = GameState & {
  now: number;
  clockOriginReal: number;
  clockOriginGame: number;
  toast: string | null;
  /** Vue couverture services (HUD) — non sérialisé. */
  coverageNeed: NeedId | null;
  /** 0 centrale, 1 maisons, 2 boutique, 3 terminé */
  tutorialStep: TutorialStep;
  setNow: (now: number) => void;
  setCoverageNeed: (need: NeedId | null) => void;
  clearToast: () => void;
  showToast: (message: string) => void;
  doTick: (realNow: number) => void;
  gameNow: (realNow?: number) => number;
  startPlace: (type: BuildingTypeId) => void;
  startRoad: () => void;
  startBulldoze: () => void;
  cancelPlace: () => void;
  confirmPlace: (x: number, y: number, now: number) => void;
  rotatePlace: () => void;
  /** Pose une case route. `quiet` : pas de toast succès (tracé au glisser). */
  paveAt: (
    x: number,
    y: number,
    opts?: { quiet?: boolean; preferDir?: "H" | "V" | null }
  ) => { ok: boolean; spent: number };
  unpaveAt: (x: number, y: number) => void;
  select: (id: string | null) => void;
  startMove: (id: string) => void;
  cancelMoveMode: () => void;
  confirmMove: (x: number, y: number) => void;
  demolish: (id: string) => void;
  upgrade: (id: string, now: number) => void;
  collect: (id: string, now: number) => void;
  harvestAll: (now: number) => void;
  purchaseParcel: (px: number, py: number) => void;
  grantDebug: () => void;
  setSpeed: (scale: number) => void;
};

const TUTORIAL_MSGS: Record<0 | 1 | 2, string> = {
  0: "Pose une centrale pour alimenter la ville.",
  1: "Construis des maisons pour accueillir des habitants.",
  2: "Ouvre une boutique pour couvrir les besoins commerçants.",
};

function withToast(
  partial: Partial<GameStore>,
  message?: string
): Partial<GameStore> {
  if (message) return { ...partial, toast: message };
  return partial;
}

function hasActiveType(state: GameState, type: BuildingTypeId): boolean {
  return state.buildings.some(
    (b) => b.type === type && (!b.construction || b.level > 0)
  );
}

function hasEnergyPlant(state: GameState): boolean {
  return state.buildings.some((b) => {
    if (getBuildingDef(b.type).category !== "energy") return false;
    return b.level > 0 || Boolean(b.construction);
  });
}

function houseCount(state: GameState): number {
  return state.buildings.filter(
    (b) =>
      (b.type === "house" || b.type === "apartment") &&
      (b.level > 0 || b.construction)
  ).length;
}

function advanceTutorial(
  state: GameState,
  step: TutorialStep
): { step: TutorialStep; toast?: string } {
  if (step >= 3) return { step: 3 };
  if (step === 0) {
    if (hasEnergyPlant(state)) {
      return { step: 1, toast: TUTORIAL_MSGS[1] };
    }
    return { step: 0 };
  }
  if (step === 1) {
    if (houseCount(state) >= 1) {
      return { step: 2, toast: TUTORIAL_MSGS[2] };
    }
    return { step: 1 };
  }
  if (step === 2) {
    if (hasActiveType(state, "shop") || hasActiveType(state, "market")) {
      return { step: 3 };
    }
    return { step: 2 };
  }
  return { step };
}

function createGameStore() {
  const boot = Date.now();
  const initial = migrate(createInitialState(boot));

  return createStore<GameStore>((set, get) => ({
    ...initial,
    now: boot,
    clockOriginReal: boot,
    clockOriginGame: boot,
    toast: TUTORIAL_MSGS[0],
    coverageNeed: null,
    tutorialStep: 0,
    setNow: (now) => set({ now }),
    setCoverageNeed: (need) => set({ coverageNeed: need }),
    clearToast: () => set({ toast: null }),
    showToast: (message) => set({ toast: message }),
    gameNow: (realNow = Date.now()) => {
      const s = get();
      return s.clockOriginGame + (realNow - s.clockOriginReal) * s.timeScale;
    },
    doTick: (realNow) => {
      const now = get().gameNow(realNow);
      const next = tick(get(), now);
      const tut = advanceTutorial(next, get().tutorialStep);
      set({
        ...next,
        now,
        tutorialStep: tut.step,
        ...(tut.toast ? { toast: tut.toast } : {}),
      });
    },
    startPlace: (type) => set(setPlacingType(get(), type)),
    startRoad: () => set(setPlacingRoad(get(), true)),
    startBulldoze: () => set(setBulldozeMode(get(), true)),
    cancelPlace: () =>
      set(
        setBulldozeMode(
          setPlacingRoad(setPlacingType(get(), null), false),
          false
        )
      ),
    rotatePlace: () => set(cyclePlacingRotation(get())),
    confirmPlace: (x, y, now) => {
      const s = get();
      const type = s.placingType;
      if (!type) return;
      const gameNow = get().gameNow(now);
      const res = placeBuilding(
        s,
        type,
        x,
        y,
        gameNow,
        s.placingRotation ?? "H"
      );
      const tut = advanceTutorial(res.state, get().tutorialStep);
      set(
        withToast(
          {
            ...res.state,
            now: gameNow,
            tutorialStep: tut.step,
          },
          tut.toast ?? res.message
        )
      );
    },
    paveAt: (x, y, opts) => {
      const before = get().resources.gold;
      const res = paveRoad(get(), x, y, {
        preferDir: opts?.preferDir ?? null,
      });
      const spent = Math.max(0, before - res.state.resources.gold);
      if (opts?.quiet) {
        if (res.ok) {
          set({ ...res.state });
        } else if (
          res.message.includes("Or insuffisant") ||
          res.message.includes("verrouillé")
        ) {
          set(withToast({ ...res.state }, res.message));
        } else {
          set({ ...res.state });
        }
      } else {
        set(withToast({ ...res.state }, res.message));
      }
      return { ok: res.ok, spent };
    },
    unpaveAt: (x, y) => {
      const res = unpaveRoad(get(), x, y);
      set(withToast({ ...res.state }, res.message));
    },
    select: (id) => set(selectBuilding(get(), id)),
    startMove: (id) => set(startMoveBuilding(get(), id)),
    cancelMoveMode: () => set(cancelMove(get())),
    confirmMove: (x, y) => {
      const id = get().movingBuildingId;
      if (!id) return;
      const res = moveBuilding(get(), id, x, y);
      set(withToast({ ...res.state }, res.message));
    },
    demolish: (id) => {
      const res = demolishBuilding(get(), id);
      set(withToast({ ...res.state }, res.message));
    },
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
