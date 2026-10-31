"use client";

import { useCallback, useEffect, useState } from "react";

/** Shared state and same-tab/cross-tab synchronization for game preferences. */
export function useGameSettings<T extends object>(
  gameId: string,
  defaults: T,
  load: () => T,
  save: (value: T) => void,
) {
  const [settings, setSettings] = useState<T>(defaults);
  const [ready, setReady] = useState(false);
  const eventName = `game-settings:${gameId}`;

  useEffect(() => {
    const sync = () => setSettings(load());
    const frame = requestAnimationFrame(() => {
      sync();
      setReady(true);
    });
    window.addEventListener("storage", sync);
    window.addEventListener(eventName, sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("storage", sync);
      window.removeEventListener(eventName, sync);
    };
  }, [load, eventName]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setSettings((previous) => {
        const next = { ...previous, ...patch };
        save(next);
        window.dispatchEvent(new Event(eventName));
        return next;
      });
    },
    [eventName, save],
  );

  return { settings, ready, update };
}
