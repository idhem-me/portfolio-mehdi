"use client";

import { useMemo, useState } from "react";
import { BUILDING_IDS, getBuildingDef } from "@/game/core/buildings";
import {
  buildCost,
  countOwned,
  isUnlocked,
} from "@/game/core/economy";
import type { BuildingCategory, BuildingTypeId } from "@/game/core/types";
import { useGameStore, gameStore } from "@/game/store/gameStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCostLine } from "./buildHelpers";

const CATEGORY_ORDER: BuildingCategory[] = [
  "residential",
  "commerce",
  "industry",
  "energy",
  "education",
  "culture",
  "leisure",
  "service",
];

const CATEGORY_LABEL: Record<BuildingCategory, string> = {
  municipal: "Municipal",
  residential: "Habitat",
  commerce: "Commerce",
  industry: "Industrie",
  education: "Éducation",
  culture: "Culture",
  leisure: "Loisirs",
  energy: "Énergie",
  service: "Services",
};

export function BuildMenu() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<BuildingCategory | "all">("all");
  const isMobile = useIsMobile();
  const placingType = useGameStore((s) => s.placingType);
  const revision = useGameStore(
    (s) =>
      `${s.buildings.length}:${s.knowledgeEarned}:${getTownhallLvl(s)}`
  );

  const state = gameStore.getState();
  void revision;

  const byCategory = useMemo(() => {
    const ids = BUILDING_IDS.filter((id) => id !== "townhall");
    const map = new Map<BuildingCategory, BuildingTypeId[]>();
    for (const id of ids) {
      const cat = getBuildingDef(id).category;
      const list = map.get(cat) ?? [];
      list.push(id);
      map.set(cat, list);
    }
    return map;
  }, []);

  const visibleCats = CATEGORY_ORDER.filter((c) => byCategory.has(c));
  const listIds =
    tab === "all"
      ? BUILDING_IDS.filter((id) => id !== "townhall")
      : (byCategory.get(tab) ?? []);

  const panel = (
    <div
      className={cn(
        "flex flex-col gap-2 overflow-y-auto p-3",
        isMobile ? "max-h-[50dvh]" : "h-full max-h-none"
      )}
      role="dialog"
      aria-label="Boutique de construction"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
          Construire
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => {
            setOpen(false);
            gameStore.getState().cancelPlace();
          }}
        >
          Fermer
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        <TabChip
          active={tab === "all"}
          onClick={() => setTab("all")}
          label="Tout"
        />
        {visibleCats.map((c) => (
          <TabChip
            key={c}
            active={tab === c}
            onClick={() => setTab(c)}
            label={CATEGORY_LABEL[c]}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-1.5">
        {listIds.map((id) => {
          const def = getBuildingDef(id);
          const unlocked = isUnlocked(state, id);
          const cost = buildCost(id, countOwned(state, id));
          const selected = placingType === id;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={!unlocked}
                className={cn(
                  "flex w-full min-h-11 flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  selected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                    : "border-border bg-background/90 hover:bg-muted",
                  !unlocked && "cursor-not-allowed opacity-50"
                )}
                onClick={() => {
                  if (!unlocked) return;
                  gameStore.getState().startPlace(id);
                  if (isMobile) setOpen(false);
                }}
              >
                <span className="font-medium">{def.nameFr}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {unlocked ? formatCostLine(cost) : "Verrouillé"}
                  {" · "}
                  ⚡{def.power > 0 ? `+${def.power}` : def.power} MW
                  {" · "}
                  💼{def.jobs}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <>
      <div className="pointer-events-auto absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-20">
        <Button
          type="button"
          className="min-h-11 min-w-11"
          aria-expanded={open}
          aria-controls="village-build-menu"
          onClick={() => setOpen((o) => !o)}
        >
          Construire
        </Button>
      </div>

      {open && (
        <div
          id="village-build-menu"
          className={cn(
            "pointer-events-auto absolute z-30 border border-border bg-popover text-popover-foreground shadow-lg",
            isMobile
              ? "inset-x-0 bottom-0 rounded-t-xl"
              : "bottom-0 right-0 top-0 w-80 border-l"
          )}
        >
          {panel}
        </div>
      )}
    </>
  );
}

function TabChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-9 rounded-md px-2 text-xs font-medium",
        active
          ? "bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function getTownhallLvl(s: {
  buildings: { type: string; level: number }[];
}): number {
  return s.buildings.find((b) => b.type === "townhall")?.level ?? 1;
}
