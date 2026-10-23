"use client";

import { useShallow } from "zustand/react/shallow";
import { formatCompact } from "@/game/core/format";
import { populationCap, workersUsed } from "@/game/core/economy";
import { useGameStore, gameStore } from "@/game/store/gameStore";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function Hud() {
  const resources = useGameStore(
    useShallow((s) => ({
      gold: s.resources.gold,
      wood: s.resources.wood,
      stone: s.resources.stone,
      knowledge: s.resources.knowledge,
    }))
  );
  const used = useGameStore((s) => workersUsed(s));
  const cap = useGameStore((s) => populationCap(s));

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto">
          <Button asChild variant="secondary" size="sm" className="min-h-11">
            <Link href="/">← Portfolio</Link>
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
          label="Pop."
          valueLabel={`${formatCompact(used)}/${formatCompact(cap)}`}
        />
      </div>
    </header>
  );
}

function ResChip({
  label,
  value,
  valueLabel,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
}) {
  return (
    <div className="rounded-md bg-white/85 px-2.5 py-1.5 text-xs text-stone-800 shadow-sm backdrop-blur-sm dark:bg-stone-900/80 dark:text-stone-100">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>{" "}
      <span className="tabular-nums font-semibold">
        {valueLabel ?? formatCompact(value ?? 0)}
      </span>
    </div>
  );
}
