import { useCallback } from "react";
import { useGameSettings } from "@/components/games/game-settings";
import {
  defaults,
  loadSettings,
  saveSettings,
  type Settings,
} from "../feel/config";

export function useSettings() {
  const { settings, ready, update } = useGameSettings(
    "clicker-burger",
    defaults,
    loadSettings,
    saveSettings,
  );

  const toggle = useCallback(
    (key: keyof Pick<Settings, "sound" | "haptics" | "ios" | "levelPopups">) =>
      update({ [key]: !settings[key] }),
    [settings, update],
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
