import { initialBoosterBank } from "../engine/boosters";
import type { Rarity } from "../catalog/types";
import type { DrawnCard, PackKind } from "../engine/draw";

export const SAVE_KEY = "cards.save.v1";
export const SCHEMA_VERSION = 1;

export type CutDirection = "left" | "right";

export type OpeningPhase =
  | "closed"
  | "cutting"
  | "wrapperExit"
  | "cameraZoom"
  | "revealing"
  | "summary"
  /** @deprecated migrated on load */
  | "idle"
  | "preparing"
  | "tearing";

export type OwnedEntry = {
  /** Shiny copies are included in qty. Older saves have zero. */
  shinyQty?: number;
  qty: number;
  firstAcquiredAt: number;
  lastAcquiredAt: number;
};

export type CardsStats = {
  boostersOpened: number;
  goldPacksOpened: number;
  bestRarity: Rarity | null;
  /** Counts of copies obtained per rarity (lifetime). */
  copiesByRarity: Record<Rarity, number>;
};

export type ActiveOpen = {
  batchKinds?: PackKind[];
  /** Persisted 50-card recap for a completed ten-pack opening. */
  batchCards?: DrawnCard[];
  openId: string;
  kind: PackKind;
  cards: DrawnCard[];
  phase: OpeningPhase;
  revealed: boolean[];
  /** Index of the front card in the Tinder stack (0–5; 5 = all done). */
  currentIndex: number;
  cutDirection?: CutDirection;
  createdAt: number;
  /** True once collection credited. */
  finalized: boolean;
  /** Dev simulation — never credits collection. */
  simulation?: boolean;
};

export type CardsSave = {
  schemaVersion: number;
  boosters: import("../engine/boosters").BoosterBank;
  collection: Record<string, OwnedEntry>;
  stats: CardsStats;
  /** Finalized open ids (idempotency + short history). */
  finalizedOpenIds: string[];
  activeOpen: ActiveOpen | null;
};

export function emptyStats(): CardsStats {
  return {
    boostersOpened: 0,
    goldPacksOpened: 0,
    bestRarity: null,
    copiesByRarity: {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      gold: 0,
      diamond: 0,
    },
  };
}

export function emptySave(): CardsSave {
  return {
    schemaVersion: SCHEMA_VERSION,
    boosters: initialBoosterBank(),
    collection: {},
    stats: emptyStats(),
    finalizedOpenIds: [],
    activeOpen: null,
  };
}

/** Normalize legacy phases and resume mid-cut into a stable revealing scene. */
export function normalizeActiveOpenPhase(open: ActiveOpen): ActiveOpen {
  let phase = open.phase;
  if (phase === "idle") phase = "closed";
  if (phase === "preparing") phase = "cutting";
  if (phase === "tearing") phase = "cutting";

  const count = open.cards.length;
  const revealed = [...open.revealed];
  while (revealed.length < count) revealed.push(false);
  const revealed5 = revealed.slice(0, count);

  let currentIndex =
    typeof open.currentIndex === "number" && Number.isFinite(open.currentIndex)
      ? Math.max(0, Math.min(count, Math.floor(open.currentIndex)))
      : revealed5.findIndex((r) => !r);
  if (currentIndex < 0) currentIndex = count;

  // Resume: never replay a partial cut / exit / zoom.
  if (
    phase === "cutting" ||
    phase === "wrapperExit" ||
    phase === "cameraZoom"
  ) {
    if (!open.finalized) {
      phase = "revealing";
      if (currentIndex === 0 && !revealed5[0]) {
        // First card becomes front after zoom; keep face to reveal on enter.
      }
    }
  }

  if (open.finalized || phase === "summary") {
    phase = "summary";
    currentIndex = count;
  }

  return {
    ...open,
    phase,
    revealed: revealed5,
    currentIndex,
  };
}
