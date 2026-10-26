import { useCallback, useEffect, useState } from "react";
import {
  defaults,
  loadSettings,
  saveSettings,
  type Settings,
} from "../feel/config";

const EVENT = "clicker-burger-settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setReady(true);
    const sync = () => setSettings(loadSettings());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      window.dispatchEvent(new Event(EVENT));
      return next;
    });
  }, []);

  const toggle = useCallback(
    (key: keyof Pick<Settings, "sound" | "haptics" | "ios" | "levelPopups">) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        saveSettings(next);
        window.dispatchEvent(new Event(EVENT));
        return next;
      });
    },
    [],
  );

  return { settings, ready, update, toggle };
}

/** @deprecated Prefer useSettings().settings.levelPopups */
export function useLevelPopups() {
  const { settings, update } = useSettings();
  return {
    enabled: settings.levelPopups,
    setEnabled: (value: boolean) => update({ levelPopups: value }),
  };
}
