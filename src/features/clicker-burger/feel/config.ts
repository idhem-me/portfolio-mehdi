const STORE_KEY = "clicker-burger.settings";
const LEGACY_POPUPS = "clicker-burger.level-popups";

export type FeedbackKind = "cook" | "buy" | "novelty" | "levelUp";

export const feedbackHaptics: Record<FeedbackKind, number[]> = {
  cook: [8],
  buy: [12],
  novelty: [10, 18],
  levelUp: [12, 25, 35],
};

export type Settings = {
  sound: boolean;
  effectsVolume: number;
  haptics: boolean;
  ios: boolean;
  levelPopups: boolean;
};

export const defaults: Settings = {
  sound: true,
  effectsVolume: 50,
  haptics: true,
  ios: false,
  levelPopups: true,
};

export function audioGain(slider: number) {
  const value = Number.isFinite(slider)
    ? Math.max(0, Math.min(100, slider))
    : 50;
  return (value / 50) * 0.7;
}

function readStore<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing / quota. */
  }
}

export function loadSettings(): Settings {
  const stored = readStore<Partial<Settings>>(STORE_KEY, {});
  let levelPopups = defaults.levelPopups;
  if (typeof stored.levelPopups === "boolean") levelPopups = stored.levelPopups;
  else {
    try {
      const legacy = localStorage.getItem(LEGACY_POPUPS);
      if (legacy === "off") levelPopups = false;
      if (legacy === "on") levelPopups = true;
    } catch {
      /* Optional. */
    }
  }
  return {
    ...defaults,
    ...stored,
    effectsVolume: Math.max(
      0,
      Math.min(
        100,
        typeof stored.effectsVolume === "number" &&
          Number.isFinite(stored.effectsVolume)
          ? stored.effectsVolume
          : defaults.effectsVolume,
      ),
    ),
    levelPopups,
  };
}

export function saveSettings(settings: Settings) {
  writeStore(STORE_KEY, settings);
  try {
    localStorage.setItem(LEGACY_POPUPS, settings.levelPopups ? "on" : "off");
  } catch {
    /* Optional. */
  }
}
