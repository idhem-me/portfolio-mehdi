import { CATALOG } from "../catalog/cards";
import { RARITY_RANK, type Rarity } from "../catalog/types";
import type { DrawnCard } from "../engine/draw";
import {
  emptySave,
  normalizeActiveOpenPhase,
  SAVE_KEY,
  SCHEMA_VERSION,
  type ActiveOpen,
  type CardsSave,
  type CardsStats,
  type CutDirection,
  type OpeningPhase,
  type OwnedEntry,
} from "./types";

export type CardsRepository = {
  load(): CardsSave;
  save(data: CardsSave): void;
  clear(): void;
};

function isOwnedEntry(value: unknown): value is OwnedEntry {
  if (!value || typeof value !== "object") return false;
  const e = value as OwnedEntry;
  return (
    typeof e.qty === "number" &&
    e.qty >= 0 &&
    typeof e.firstAcquiredAt === "number" &&
    typeof e.lastAcquiredAt === "number"
  );
}

function isDrawnCard(value: unknown): value is DrawnCard {
  if (!value || typeof value !== "object") return false;
  const c = value as DrawnCard;
  return (
    typeof c.cardId === "string" &&
    typeof c.rarity === "string" &&
    typeof c.slot === "number"
  );
}

const VALID_PHASES: OpeningPhase[] = [
  "closed",
  "cutting",
  "wrapperExit",
  "cameraZoom",
  "revealing",
  "summary",
  "idle",
  "preparing",
  "tearing",
];

function sanitizeActiveOpen(raw: unknown): ActiveOpen | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Partial<ActiveOpen> & { phase?: string };
  if (
    typeof a.openId !== "string" ||
    !Array.isArray(a.cards) ||
    a.cards.length !== 5 ||
    !a.cards.every(isDrawnCard)
  ) {
    return null;
  }
  const phase = (
    VALID_PHASES.includes(a.phase as OpeningPhase)
      ? a.phase
      : "revealing"
  ) as OpeningPhase;
  const cutDirection: CutDirection | undefined =
    a.cutDirection === "left" || a.cutDirection === "right"
      ? a.cutDirection
      : undefined;

  const open: ActiveOpen = {
    openId: a.openId,
    kind: a.kind === "gold_pack" ? "gold_pack" : "standard",
    cards: a.cards,
    phase,
    revealed: Array.isArray(a.revealed)
      ? a.revealed.map(Boolean).slice(0, 5)
      : [false, false, false, false, false],
    currentIndex:
      typeof a.currentIndex === "number" && Number.isFinite(a.currentIndex)
        ? a.currentIndex
        : 0,
    cutDirection,
    createdAt: typeof a.createdAt === "number" ? a.createdAt : Date.now(),
    finalized: Boolean(a.finalized),
    simulation: Boolean(a.simulation) || undefined,
  };
  return normalizeActiveOpenPhase(open);
}

export function parseSave(raw: unknown): CardsSave {
  if (!raw || typeof raw !== "object") return emptySave();
  const data = raw as Partial<CardsSave>;
  const collection: Record<string, OwnedEntry> = {};
  if (data.collection && typeof data.collection === "object") {
    for (const [id, entry] of Object.entries(data.collection)) {
      if (isOwnedEntry(entry) && entry.qty > 0) collection[id] = entry;
    }
  }
  const stats = emptySave().stats;
  if (data.stats && typeof data.stats === "object") {
    const s = data.stats as Partial<CardsStats>;
    if (typeof s.boostersOpened === "number")
      stats.boostersOpened = Math.max(0, s.boostersOpened);
    if (typeof s.goldPacksOpened === "number")
      stats.goldPacksOpened = Math.max(0, s.goldPacksOpened);
    if (s.bestRarity && s.bestRarity in RARITY_RANK)
      stats.bestRarity = s.bestRarity as Rarity;
    if (s.copiesByRarity && typeof s.copiesByRarity === "object") {
      for (const key of Object.keys(stats.copiesByRarity) as Rarity[]) {
        const n = (s.copiesByRarity as Record<string, number>)[key];
        if (typeof n === "number" && n >= 0) stats.copiesByRarity[key] = n;
      }
    }
  }
  const finalizedOpenIds = Array.isArray(data.finalizedOpenIds)
    ? data.finalizedOpenIds.filter((id): id is string => typeof id === "string")
    : [];
  return {
    schemaVersion: SCHEMA_VERSION,
    collection,
    stats,
    finalizedOpenIds: finalizedOpenIds.slice(-200),
    activeOpen: sanitizeActiveOpen(data.activeOpen),
  };
}

export function createLocalCardsRepository(
  storage?: Storage | null,
): CardsRepository {
  const store = () => {
    if (storage) return storage;
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  };

  return {
    load() {
      try {
        const raw = store()?.getItem(SAVE_KEY);
        if (!raw) return emptySave();
        return parseSave(JSON.parse(raw));
      } catch {
        return emptySave();
      }
    },
    save(data) {
      try {
        store()?.setItem(
          SAVE_KEY,
          JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }),
        );
      } catch {
        /* Private browsing / quota. */
      }
    },
    clear() {
      try {
        store()?.removeItem(SAVE_KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

export function uniqueOwnedCount(save: CardsSave): number {
  return Object.keys(save.collection).length;
}

export function totalCopies(save: CardsSave): number {
  return Object.values(save.collection).reduce((n, e) => n + e.qty, 0);
}

export function catalogProgress(save: CardsSave): {
  owned: number;
  total: number;
} {
  return { owned: uniqueOwnedCount(save), total: CATALOG.length };
}

/**
 * Idempotent finalization: credit cards + stats once per openId.
 * Simulations never mutate collection/stats.
 */
export function finalizeOpen(
  save: CardsSave,
  open: ActiveOpen,
  now = Date.now(),
): CardsSave {
  if (open.simulation) {
    return {
      ...save,
      activeOpen: {
        ...open,
        phase: "summary",
        finalized: true,
        currentIndex: 5,
      },
    };
  }
  if (open.finalized || save.finalizedOpenIds.includes(open.openId)) {
    return {
      ...save,
      activeOpen: {
        ...open,
        phase: "summary",
        finalized: true,
        currentIndex: 5,
      },
    };
  }

  const collection = { ...save.collection };
  const stats = {
    ...save.stats,
    copiesByRarity: { ...save.stats.copiesByRarity },
  };

  for (const drawn of open.cards) {
    const prev = collection[drawn.cardId];
    if (prev) {
      collection[drawn.cardId] = {
        ...prev,
        qty: prev.qty + 1,
        lastAcquiredAt: now,
      };
    } else {
      collection[drawn.cardId] = {
        qty: 1,
        firstAcquiredAt: now,
        lastAcquiredAt: now,
      };
    }
    stats.copiesByRarity[drawn.rarity] =
      (stats.copiesByRarity[drawn.rarity] ?? 0) + 1;
    if (
      !stats.bestRarity ||
      RARITY_RANK[drawn.rarity] > RARITY_RANK[stats.bestRarity]
    ) {
      stats.bestRarity = drawn.rarity;
    }
  }

  stats.boostersOpened += 1;
  if (open.kind === "gold_pack") stats.goldPacksOpened += 1;

  return {
    ...save,
    collection,
    stats,
    finalizedOpenIds: [...save.finalizedOpenIds, open.openId].slice(-200),
    activeOpen: {
      ...open,
      phase: "summary",
      finalized: true,
      currentIndex: 5,
    },
  };
}

export function createOpenId(rng: () => number = Math.random): string {
  return `open-${Date.now().toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`;
}
