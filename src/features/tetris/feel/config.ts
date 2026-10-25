export const feel = {
  das: 130,
  arr: 32,
  softArr: 35,
  swipe: 22,
  fastSwipe: 330,
  spring: { type: "spring" as const, stiffness: 380, damping: 23 },
  pulse: 420,
  flashOpacity: 0.14,
  particles: 24,
  camera: {
    lineZoom: 1.02,
    strongZoom: 1.04,
    lockZoom: 1.008,
    shake: 2,
    dropBump: 5,
  },
  haptics: {
    move: [5],
    rotate: [8],
    lock: [15],
    hardDrop: [25],
    lineClear: [18, 35, 22],
    tetris: [15, 25, 25, 25, 45],
    combo: [15, 20, 30],
    levelUp: [12, 25, 35, 25, 55],
    gameOver: [70, 40, 100],
    hold: [8],
  },
};
export const defaultAudioVolumes = {
  effectsVolume: 50,
  musicVolume: 50,
  voiceVolume: 50,
};
export type AudioVolumes = typeof defaultAudioVolumes;
export const audioLevelAtHalf: AudioVolumes = {
  effectsVolume: 0.7,
  musicVolume: 0.35,
  voiceVolume: 0.7,
};
export function audioGain(key: keyof AudioVolumes, slider: number) {
  const value = Number.isFinite(slider)
    ? Math.max(0, Math.min(100, slider))
    : 50;
  return (value / 50) * audioLevelAtHalf[key];
}
export type Settings = AudioVolumes & {
  audioScaleVersion: number;
  sound: boolean;
  haptics: boolean;
  ios: boolean;
  reduced: boolean;
  overlay: boolean;
};
export const defaults: Settings = {
  ...defaultAudioVolumes,
  audioScaleVersion: 2,
  sound: true,
  haptics: true,
  ios: false,
  reduced: false,
  overlay: true,
};
export function loadSettings(): Settings {
  const stored = readStore<Partial<Settings>>("lava-settings", {});
  const settings = { ...defaults, ...stored, audioScaleVersion: 2 };
  if (stored.audioScaleVersion !== 2) {
    for (const key of Object.keys(
      defaultAudioVolumes,
    ) as (keyof AudioVolumes)[]) {
      const previous = stored[key];
      // Re-label saved levels without changing the volume the player chose.
      if (typeof previous === "number" && Number.isFinite(previous)) {
        settings[key] = Math.max(
          0,
          Math.min(
            100,
            5 * Math.round(previous / (10 * audioLevelAtHalf[key])),
          ),
        );
      }
    }
    writeStore("lava-settings", settings);
  }
  return settings;
}
export function readStore<T>(key: string, fallback: T): T {
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
    /* Private browsing / quota: gameplay remains available. */
  }
}
