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
export type Settings = {
  haptics: boolean;
  ios: boolean;
  reduced: boolean;
  overlay: boolean;
};
export const defaults: Settings = {
  haptics: true,
  ios: false,
  reduced: false,
  overlay: true,
};
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
