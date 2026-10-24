"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import {
  MAP_BLOCKS_H,
  MAP_BLOCKS_W,
  BLOCK_PX,
  UNLOCK_FADE_MS,
} from "@/game/core/mapConfig";
import { parcelCost } from "@/game/core/economy";
import { isAdjacentParcel } from "@/game/core/grid";
import { blockWorldOrigin } from "@/game/core/mapLanes";
import { parcelId } from "@/game/core/balance";
import { useGameStore, gameStore } from "@/game/store/gameStore";
import { worldToScreen } from "@/game/render/cameraBridge";
import { cn } from "@/lib/utils";

type BadgeInfo = {
  id: string;
  bx: number;
  by: number;
  sx: number;
  sy: number;
  buyable: boolean;
  cost: number;
  canAfford: boolean;
};

type Props = {
  hoverId: string | null;
  pendingId: string | null;
  onRequestUnlock: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  fadingId: string | null;
};

export function UnlockOverlay({
  hoverId,
  pendingId,
  onRequestUnlock,
  onConfirm,
  onCancel,
  fadingId,
}: Props) {
  const unlocked = useGameStore((s) => s.unlockedParcels);
  const bought = useGameStore((s) => s.parcelsBought);
  const gold = useGameStore((s) => s.resources.gold);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const cost = parcelCost(bought);
    const next: BadgeInfo[] = [];
    for (let by = 0; by < MAP_BLOCKS_H; by++) {
      for (let bx = 0; bx < MAP_BLOCKS_W; bx++) {
        const id = parcelId(bx, by);
        if (unlocked.includes(id)) continue;
        const buyable = isAdjacentParcel(unlocked, bx, by);
        const o = blockWorldOrigin(bx, by);
        const scr = worldToScreen(o.x + BLOCK_PX / 2, o.y + BLOCK_PX / 2);
        if (!scr) continue;
        // Cull roughly
        if (scr.x < -80 || scr.y < -80 || scr.x > 4000 || scr.y > 3000) continue;
        next.push({
          id,
          bx,
          by,
          sx: scr.x,
          sy: scr.y,
          buyable,
          cost,
          canAfford: gold >= cost,
        });
      }
    }
    setBadges(next);
    void tick;
  }, [unlocked, bought, gold, tick]);

  const pending = pendingId
    ? badges.find((b) => b.id === pendingId)
    : null;

  // Sous la couche UI (z-20) pour ne pas passer devant la sidebar
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {badges.map((b) => {
        const hovered = hoverId === b.id;
        return (
          <div
            key={b.id}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 transition-opacity",
              fadingId === b.id && "animate-out fade-out duration-300"
            )}
            style={{
              left: b.sx,
              top: b.sy,
              opacity: fadingId === b.id ? 0 : 1,
              transitionDuration: `${UNLOCK_FADE_MS}ms`,
            }}
          >
            {b.buyable ? (
              <button
                type="button"
                className={cn(
                  "pointer-events-auto flex items-center gap-2 rounded-xl px-3 py-2 shadow-lg",
                  "bg-stone-950/80 backdrop-blur-sm border",
                  hovered
                    ? "border-amber-400 ring-2 ring-amber-400/60 scale-105"
                    : "border-stone-600",
                  hovered && "animate-pulse"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestUnlock(b.id);
                }}
              >
                <Lock className="size-4 text-stone-200" aria-hidden />
                <span
                  className={cn(
                    "text-base font-bold tabular-nums",
                    b.canAfford ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {b.cost}🪙
                </span>
              </button>
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full bg-stone-950/70">
                <Lock className="size-5 text-stone-400" aria-hidden />
              </div>
            )}
          </div>
        );
      })}

      {pending && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
          <div className="w-full max-w-sm rounded-xl border border-stone-600 bg-stone-950/95 p-4 text-stone-50 shadow-xl">
            <p className="text-sm font-medium">
              Débloquer ce bloc ? Coût :{" "}
              <span
                className={
                  pending.canAfford ? "text-emerald-400" : "text-red-400"
                }
              >
                {pending.cost}🪙
              </span>
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={!pending.canAfford}
                className="min-h-10 flex-1 rounded-md bg-amber-500 px-3 text-sm font-semibold text-stone-950 disabled:opacity-40"
                onClick={() => {
                  gameStore
                    .getState()
                    .purchaseParcel(pending.bx, pending.by);
                  onConfirm();
                }}
              >
                Débloquer
              </button>
              <button
                type="button"
                className="min-h-10 flex-1 rounded-md border border-stone-500 px-3 text-sm"
                onClick={onCancel}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
