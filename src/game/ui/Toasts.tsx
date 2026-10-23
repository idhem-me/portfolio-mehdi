"use client";

import { useEffect } from "react";
import { useGameStore, gameStore } from "@/game/store/gameStore";

export function Toasts() {
  const toast = useGameStore((s) => s.toast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => gameStore.getState().clearToast(), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-40 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-md bg-stone-900/90 px-4 py-2 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">
        {toast}
      </div>
    </div>
  );
}
