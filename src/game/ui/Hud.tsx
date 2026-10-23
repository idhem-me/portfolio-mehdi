"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { formatCompact } from "@/game/core/format";
import { useGameStore, gameStore } from "@/game/store/gameStore";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CityPanel } from "./CityPanel";
import { useCity } from "./useCity";

export function Hud() {
  const [cityOpen, setCityOpen] = useState(false);
  const resources = useGameStore(
    useShallow((s) => ({
      gold: s.resources.gold,
      wood: s.resources.wood,
      stone: s.resources.stone,
      knowledge: s.resources.knowledge,
    }))
  );
  const city = useCity();
  const powerSupply = Math.round(city.powerSupply * 10) / 10;
  const powerDemand = Math.round(city.powerDemand * 10) / 10;
  const powerDeficit = city.powerRatio < 1;
  const pop = Math.floor(city.population);
  const housing = Math.floor(city.housing);
  const unemployment = Math.round(city.unemployment * 100);
  const R = Math.round(city.demandRCI.R);
  const C = Math.round(city.demandRCI.C);
  const I = Math.round(city.demandRCI.I);

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="pointer-events-auto flex gap-2">
            <Button asChild variant="secondary" size="sm" className="min-h-11">
              <Link href="/">← Portfolio</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11"
              aria-expanded={cityOpen}
              onClick={() => setCityOpen((o) => !o)}
            >
              Ville
            </Button>
          </div>
          <div className="pointer-events-auto">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              onClick={() => gameStore.getState().harvestAll(Date.now())}
            >
              Tout récolter
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <ResChip label="Or" value={resources.gold} />
          <ResChip label="Bois" value={resources.wood} />
          <ResChip label="Pierre" value={resources.stone} />
          <ResChip label="Savoir" value={resources.knowledge} />
          <ResChip
            label="⚡"
            valueLabel={`${formatCompact(powerSupply)}/${formatCompact(powerDemand)} MW`}
            danger={powerDeficit}
          />
          <ResChip
            label="👥"
            valueLabel={`${formatCompact(pop)}/${formatCompact(housing)}`}
          />
          <ResChip label="💼" valueLabel={`${unemployment} %`} />
        </div>
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <RciBar letter="R" value={R} color="bg-emerald-500" />
          <RciBar letter="C" value={C} color="bg-sky-500" />
          <RciBar letter="I" value={I} color="bg-amber-400" />
        </div>
      </header>
      <CityPanel open={cityOpen} onClose={() => setCityOpen(false)} />
    </>
  );
}

function ResChip({
  label,
  value,
  valueLabel,
  danger,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md bg-white/85 px-2.5 py-1.5 text-xs text-stone-800 shadow-sm backdrop-blur-sm dark:bg-stone-900/80 dark:text-stone-100",
        danger && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
      )}
    >
      <span className="text-stone-500 dark:text-stone-400">{label}</span>{" "}
      <span className="tabular-nums font-semibold">
        {valueLabel ?? formatCompact(value ?? 0)}
      </span>
    </div>
  );
}

function RciBar({
  letter,
  value,
  color,
}: {
  letter: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="pointer-events-none flex w-16 items-center gap-1 rounded-md bg-white/85 px-1.5 py-1 text-[10px] shadow-sm backdrop-blur-sm dark:bg-stone-900/80"
      title={`Demande ${letter} : ${value} %`}
    >
      <span className="font-semibold text-stone-700 dark:text-stone-200">
        {letter}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-stone-200 dark:bg-stone-700">
        <div
          className={cn("h-full rounded-sm transition-[width]", color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
