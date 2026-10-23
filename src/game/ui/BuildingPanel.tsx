"use client";

import { getBuildingDef } from "@/game/core/buildings";
import { buildingEfficiency, efficiencyReason } from "@/game/core/city";
import {
  accumulatedStock,
  durationSec,
  upgradeCost,
} from "@/game/core/economy";
import { formatCompact, formatDuration } from "@/game/core/format";
import { useGameStore, gameStore } from "@/game/store/gameStore";
import { formatCostLine } from "./buildHelpers";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useCity } from "./useCity";

export function BuildingPanel() {
  const selectedId = useGameStore((s) => s.selectedBuildingId);
  const now = useGameStore((s) => s.now);
  const building = useGameStore((s) =>
    s.buildings.find((b) => b.id === s.selectedBuildingId)
  );
  const city = useCity();
  const isMobile = useIsMobile();

  if (!selectedId || !building) return null;

  const state = gameStore.getState();
  const def = getBuildingDef(building.type);
  const stock = accumulatedStock(state, building, now);
  const upCost = upgradeCost(building.type, building.level);
  const upTime = durationSec(building.type, building.level);
  const constructing = Boolean(building.construction);
  const eff = buildingEfficiency(building, city);
  const reason = efficiencyReason(building, city);

  return (
    <aside
      className={cn(
        "pointer-events-auto absolute z-30 border border-border bg-popover p-3 text-popover-foreground shadow-lg",
        isMobile
          ? "inset-x-0 bottom-0 rounded-t-xl"
          : "bottom-4 left-4 w-72 rounded-lg"
      )}
      role="dialog"
      aria-label={def.nameFr}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">
            {def.nameFr}{" "}
            <span className="tabular-nums text-muted-foreground">
              niv. {building.level}
            </span>
          </h2>
          {constructing && building.construction && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              En chantier —{" "}
              {formatDuration(
                Math.max(0, (building.construction.endsAt - now) / 1000)
              )}
            </p>
          )}
          {!constructing && building.level > 0 && (
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              Efficacité : {Math.round(eff * 100)} %
              {reason ? ` — ${reason}` : ""}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => gameStore.getState().select(null)}
        >
          Fermer
        </Button>
      </div>

      {def.produces && !constructing && (
        <p className="mb-2 text-xs tabular-nums text-muted-foreground">
          Stock : {formatCompact(stock)} {resourceLabel(def.produces)}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {def.produces && !constructing && (
          <Button
            type="button"
            className="min-h-11"
            onClick={() =>
              gameStore.getState().collect(building.id, Date.now())
            }
          >
            Récolter
          </Button>
        )}
        {!constructing && building.type !== "monument" && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={() =>
              gameStore.getState().upgrade(building.id, Date.now())
            }
          >
            Améliorer — {formatCostLine(upCost)} ({formatDuration(upTime)})
          </Button>
        )}
      </div>
    </aside>
  );
}

function resourceLabel(r: string): string {
  switch (r) {
    case "gold":
      return "or";
    case "wood":
      return "bois";
    case "stone":
      return "pierre";
    case "knowledge":
      return "savoir";
    default:
      return r;
  }
}
