"use client";

import { gameStore } from "@/game/store/gameStore";
import { Button } from "@/components/ui/button";

/** Visible uniquement si ?debug=1 et NODE_ENV !== production. */
export function DebugBar() {
  return (
    <div className="pointer-events-auto absolute bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.5rem))] right-[max(0.75rem,env(safe-area-inset-right))] z-40 flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="min-h-11"
        onClick={() => gameStore.getState().grantDebug()}
      >
        +10 000 de tout
      </Button>
    </div>
  );
}
