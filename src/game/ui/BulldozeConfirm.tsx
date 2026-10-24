"use client";

import { getBuildingDef } from "@/game/core/buildings";
import {
  buildCost,
  countOwned,
  scaleCost,
} from "@/game/core/economy";
import { BUILDING_REFUND_RATIO } from "@/game/core/mapConfig";
import { unpaveRefundGold } from "@/game/core/roads";
import { gameStore, useGameStore } from "@/game/store/gameStore";
import { Button } from "@/components/ui/button";
import { formatCostLine } from "./buildHelpers";

export type BulldozeTarget =
  | { kind: "building"; id: string }
  | { kind: "road"; x: number; y: number };

type Props = {
  target: BulldozeTarget;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BulldozeConfirm({ target, onConfirm, onCancel }: Props) {
  const revision = useGameStore(
    (s) => `${s.buildings.length}:${s.cells.filter((c) => c.paved).length}`
  );
  void revision;
  const state = gameStore.getState();

  let title = "Démolir";
  let detail = "";
  let refundLine: string | null = null;

  if (target.kind === "building") {
    const b = state.buildings.find((x) => x.id === target.id);
    if (!b) {
      return null;
    }
    const def = getBuildingDef(b.type);
    title = `Démolir ${def.nameFr} ?`;
    detail = `Niveau ${b.level}`;
    const refund = scaleCost(
      buildCost(b.type, Math.max(0, countOwned(state, b.type) - 1)),
      BUILDING_REFUND_RATIO
    );
    refundLine = `Remboursement : +${formatCostLine(refund)}`;
  } else {
    title = "Détruire cette route ?";
    detail = "Case bitume";
    const gold = unpaveRefundGold(state.cells, target.x, target.y);
    refundLine = `Remboursement : +${gold}🪙`;
  }

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-24"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bulldoze-confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl">
        <h2
          id="bulldoze-confirm-title"
          className="text-sm font-semibold text-stone-900 dark:text-stone-100"
        >
          {title}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        {refundLine && (
          <p className="mt-2 text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
            {refundLine}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 flex-1"
            onClick={onConfirm}
          >
            Confirmer
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 flex-1"
            onClick={onCancel}
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
