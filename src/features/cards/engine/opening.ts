import { refillBoosters, canBypassBoosterLimit } from "./boosters";
import { drawPack, type DrawOptions, type PackResult } from "./draw";
import {
  createOpenId,
  finalizeOpen,
  type CardsRepository,
} from "../persistence/repository";
import type {
  ActiveOpen,
  CardsSave,
  CutDirection,
  OpeningPhase,
} from "../persistence/types";

export type OpeningController = {
  getSave(): CardsSave;
  replaceSave(save: CardsSave): void;
  /** Start a real open (credits on finalize). No-op if already opening. */
  startOpen(options?: DrawOptions, bypassLimit?: boolean): ActiveOpen | null;
  openTen(options?: DrawOptions, bypassLimit?: boolean): ActiveOpen | null;
  /** Dev-only simulation — never credits. */
  startSimulation(options: DrawOptions): ActiveOpen | null;
  setPhase(phase: OpeningPhase): void;
  setCutDirection(direction: CutDirection): void;
  /**
   * Reveal current front card and advance. Idempotent per index.
   * When all five are done, finalizes once into summary.
   */
  advanceCard(expectedIndex?: number): ActiveOpen | null;
  /** @deprecated Prefer advanceCard for stack flow; still used for random index. */
  reveal(index: number): void;
  revealAll(): void;
  /** Idempotent credit + summary. */
  complete(): CardsSave;
  /** Clear active open after summary dismissed. */
  dismissSummary(): void;
  resetLocal(): void;
};

function ensureRevealed(open: ActiveOpen): boolean[] {
  const next = [...open.revealed];
  while (next.length < open.cards.length) next.push(false);
  return next.slice(0, open.cards.length);
}

function packToActive(
  pack: PackResult,
  openId: string,
  simulation: boolean,
): ActiveOpen {
  return {
    openId,
    kind: pack.kind,
    cards: pack.cards,
    phase: "cutting",
    revealed: [false, false, false, false, false],
    currentIndex: 0,
    createdAt: Date.now(),
    finalized: false,
    simulation: simulation || undefined,
  };
}

function isBusy(open: ActiveOpen | null): boolean {
  return Boolean(
    open &&
    !open.finalized &&
    open.phase !== "closed" &&
    open.phase !== "summary",
  );
}

export function createOpeningController(
  repo: CardsRepository,
  now: () => number = Date.now,
): OpeningController {
  let save = repo.load();
  // A reload between the summary write and credit must still finalize once.
  if (save.activeOpen?.phase === "summary" && !save.activeOpen.finalized) {
    save = finalizeOpen(save, save.activeOpen);
    repo.save(save);
  }

  const persist = (next: CardsSave) => {
    save = next;
    repo.save(next);
  };

  const patchOpen = (patch: Partial<ActiveOpen>) => {
    if (!save.activeOpen) return;
    persist({
      ...save,
      activeOpen: { ...save.activeOpen, ...patch },
    });
  };

  const controller: OpeningController = {
    getSave: () => save,
    replaceSave: (next) => persist(next),

    startOpen(options = {}, bypassLimit = false) {
      if (isBusy(save.activeOpen)) return save.activeOpen;
      if (
        save.activeOpen &&
        !save.activeOpen.finalized &&
        !save.activeOpen.simulation
      ) {
        return save.activeOpen;
      }
      const boosters = refillBoosters(save.boosters, now());
      const bypass = bypassLimit && canBypassBoosterLimit();
      if (!bypass && boosters.available === 0) return null;
      // Real openings never accept a forced Shiny; simulations use their own path.
      const pack = drawPack({ ...options, forceShiny: false });
      const open = packToActive(pack, createOpenId(), false);
      persist({
        ...save,
        boosters: bypass
          ? boosters
          : { ...boosters, available: boosters.available - 1 },
        activeOpen: open,
      });
      return open;
    },

    openTen(options = {}, bypassLimit = false) {
      if (isBusy(save.activeOpen)) return null;
      const boosters = refillBoosters(save.boosters, now());
      const bypass = bypassLimit && canBypassBoosterLimit();
      if (!bypass && boosters.available < 10) return null;
      // Persist all ten draws before starting animation; preserve each five-card group.
      const packs = Array.from({ length: 10 }, () =>
        drawPack({ setId: options.setId, rng: options.rng }),
      );
      const open: ActiveOpen = {
        ...packToActive(packs[0], createOpenId(), false),
        cards: packs.flatMap((pack) => pack.cards),
        batchKinds: packs.map((pack) => pack.kind),
        revealed: Array(50).fill(false),
      };
      persist({
        ...save,
        boosters: bypass
          ? boosters
          : { ...boosters, available: boosters.available - 10 },
        activeOpen: open,
      });
      return save.activeOpen;
    },

    startSimulation(options) {
      if (
        isBusy(save.activeOpen) &&
        save.activeOpen &&
        !save.activeOpen.simulation
      ) {
        return null;
      }
      const pack = drawPack(options);
      const open = packToActive(pack, createOpenId(), true);
      if (options.batchSize === 10) {
        const packs = [
          pack,
          ...Array.from({ length: 9 }, () => drawPack(options)),
        ];
        open.cards = packs.flatMap((result) => result.cards);
        open.batchKinds = packs.map((result) => result.kind);
        open.revealed = Array(50).fill(false);
      }
      persist({ ...save, activeOpen: open });
      return open;
    },

    setPhase(phase) {
      if (!save.activeOpen) return;
      patchOpen({ phase });
    },

    setCutDirection(direction) {
      if (!save.activeOpen) return;
      patchOpen({ cutDirection: direction });
    },

    advanceCard(expectedIndex) {
      const open = save.activeOpen;
      if (!open || open.finalized) return open;
      if (open.phase !== "revealing") return open;
      if (expectedIndex !== undefined && open.currentIndex !== expectedIndex)
        return open;

      const revealed = ensureRevealed(open);
      const index = Math.max(
        0,
        Math.min(open.cards.length - 1, open.currentIndex),
      );

      // Already past the end.
      if (open.currentIndex >= open.cards.length) {
        return controller.complete().activeOpen;
      }

      revealed[index] = true;
      const nextIndex = index + 1;
      const allDone = nextIndex >= open.cards.length || revealed.every(Boolean);

      if (allDone) {
        persist(
          finalizeOpen(save, {
            ...open,
            revealed,
            currentIndex: open.cards.length,
            phase: "summary",
          }),
        );
        return save.activeOpen;
      }

      patchOpen({
        revealed,
        currentIndex: nextIndex,
        phase: "revealing",
      });
      return save.activeOpen;
    },

    reveal(index) {
      if (!save.activeOpen) return;
      if (index < 0 || index >= save.activeOpen.cards.length) return;
      const revealed = ensureRevealed(save.activeOpen);
      if (revealed[index]) return;
      revealed[index] = true;
      const nextIndex = Math.max(save.activeOpen.currentIndex, index + 1);
      const all = revealed.every(Boolean);
      persist({
        ...save,
        activeOpen: {
          ...save.activeOpen,
          revealed,
          currentIndex: all ? save.activeOpen.cards.length : nextIndex,
          phase: all ? "summary" : "revealing",
        },
      });
      if (all) controller.complete();
    },

    revealAll() {
      if (!save.activeOpen) return;
      persist({
        ...save,
        activeOpen: {
          ...save.activeOpen,
          revealed: Array(save.activeOpen.cards.length).fill(true),
          currentIndex: save.activeOpen.cards.length,
          phase: "summary",
        },
      });
      controller.complete();
    },

    complete() {
      if (!save.activeOpen) return save;
      const next = finalizeOpen(save, {
        ...save.activeOpen,
        revealed: ensureRevealed(save.activeOpen),
        phase: "summary",
        currentIndex: save.activeOpen.cards.length,
      });
      persist(next);
      return next;
    },

    dismissSummary() {
      if (!save.activeOpen?.finalized) return;
      persist({ ...save, activeOpen: null });
    },

    resetLocal() {
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("cards:reset"));
      const boosters = refillBoosters(save.boosters, now());
      repo.clear();
      persist({ ...repo.load(), boosters });
    },
  };

  return controller;
}
