"use client";

import { useEffect, useState } from "react";
import { getBuildingDef } from "@/game/core/buildings";
import { buildingEfficiency, efficiencyReason } from "@/game/core/city";
import { housingAtLevel } from "@/game/core/city";
import {
  accumulatedStock,
  buildCost,
  countOwned,
  durationSec,
  maxLevelForType,
  scaleCost,
  upgradeCost,
} from "@/game/core/economy";
import { BUILDING_REFUND_RATIO } from "@/game/core/mapConfig";
import { formatCompact, formatDuration } from "@/game/core/format";
import { useGameStore, gameStore } from "@/game/store/gameStore";
import { formatCostLine } from "./buildHelpers";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  isAutoEvolveResidential,
  waitingForPlanks,
} from "@/game/core/housingEvolution";
import { useCity } from "./useCity";

export function BuildingPanel() {
  const selectedId = useGameStore((s) => s.selectedBuildingId);
  const movingId = useGameStore((s) => s.movingBuildingId);
  const now = useGameStore((s) => s.now);
  const building = useGameStore((s) =>
    s.buildings.find((b) => b.id === s.selectedBuildingId)
  );
  const city = useCity();
  const isMobile = useIsMobile();
  const [confirmDemolish, setConfirmDemolish] = useState(false);

  useEffect(() => {
    setConfirmDemolish(false);
  }, [selectedId]);

  if (!selectedId || !building) return null;

  const state = gameStore.getState();
  const def = getBuildingDef(building.type);
  const stock = accumulatedStock(state, building, now);
  const upCost = upgradeCost(building.type, building.level);
  const upTime = durationSec(building.type, building.level);
  const constructing = Boolean(building.construction);
  const eff = buildingEfficiency(building, city);
  const reason = efficiencyReason(building, city);
  const isMoving = movingId === building.id;
  const canDemolish = building.type !== "townhall";
  const refundPreview = canDemolish
    ? scaleCost(
        buildCost(building.type, Math.max(0, countOwned(state, building.type) - 1)),
        BUILDING_REFUND_RATIO
      )
    : null;
  const housing =
    def.housing > 0 || def.housingLevels
      ? housingAtLevel(def, Math.max(1, building.level))
      : 0;
  const atMaxLevel = building.level >= maxLevelForType(state, building.type);
  const autoEvolve = isAutoEvolveResidential(building.type);
  const planksWait = autoEvolve
    ? waitingForPlanks(building, state, now, city)
    : null;

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
          {housing > 0 && (
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              Logement : {housing} hab.
            </p>
          )}
          {planksWait != null && planksWait > 0 && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              En attente : {planksWait} planches
            </p>
          )}
          {autoEvolve && !constructing && (
            <p className="mt-1 text-xs text-muted-foreground">
              Évolution automatique selon les besoins
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
        {isMoving && (
          <p className="text-xs text-muted-foreground">
            Clique une case libre pour repositionner · Esc pour annuler
          </p>
        )}
        {def.produces && !constructing && !isMoving && (
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
        {!autoEvolve &&
          !constructing &&
          building.type !== "monument" &&
          !isMoving &&
          !atMaxLevel && (
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
        {!autoEvolve &&
          !constructing &&
          !isMoving &&
          atMaxLevel &&
          building.type !== "monument" && (
          <p className="text-xs text-muted-foreground">Niveau maximum</p>
        )}
        {!isMoving ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={() => gameStore.getState().startMove(building.id)}
          >
            Déplacer
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => gameStore.getState().cancelMoveMode()}
          >
            Annuler le déplacement
          </Button>
        )}
        {canDemolish && !isMoving && !confirmDemolish && (
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            onClick={() => setConfirmDemolish(true)}
          >
            Démolir
            {refundPreview ? ` — +${formatCostLine(refundPreview)}` : ""}
          </Button>
        )}
        {canDemolish && !isMoving && confirmDemolish && (
          <div className="flex flex-col gap-2 rounded-md border border-rose-500/40 bg-rose-500/5 p-2">
            <p className="text-xs text-muted-foreground">
              Confirmer la démolition
              {refundPreview
                ? ` — remboursement +${formatCostLine(refundPreview)}`
                : ""}
              ?
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 flex-1"
                onClick={() => {
                  gameStore.getState().demolish(building.id);
                  setConfirmDemolish(false);
                }}
              >
                Confirmer
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 flex-1"
                onClick={() => setConfirmDemolish(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
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
    case "planks":
      return "planches";
    default:
      return r;
  }
}
