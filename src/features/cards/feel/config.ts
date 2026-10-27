import type { Rarity } from "../catalog/types";

export const SETTINGS_KEY = "cards.settings.v1";

export type CardsSettings = {
  sound: boolean;
  effectsVolume: number;
  haptics: boolean;
  ios: boolean;
};

export const defaults: CardsSettings = {
  sound: true,
  effectsVolume: 50,
  haptics: true,
  ios: false,
};

export function audioGain(slider: number) {
  const value = Number.isFinite(slider)
    ? Math.max(0, Math.min(100, slider))
    : 50;
  return (value / 50) * 0.7;
}

export function loadSettings(): CardsSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaults };
    const stored = JSON.parse(raw) as Partial<CardsSettings>;
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
    };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: CardsSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* Private browsing / quota. */
  }
}

export type CardsHapticKind =
  | "light"
  | "tear"
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "gold"
  | "diamond";

export const hapticPatterns: Record<CardsHapticKind, number[]> = {
  light: [8],
  tear: [12, 18, 10],
  common: [10],
  rare: [14, 22],
  epic: [16, 28, 18],
  legendary: [20, 35, 25, 40],
  gold: [22, 40, 22, 45],
  diamond: [18, 30, 18, 30, 55],
};

export function hapticKindForRarity(rarity: Rarity): CardsHapticKind {
  return rarity;
}

export type OpeningEffectToken = {
  intensity: number;
  shineMs: number;
  particles: number;
  particlesMobile: number;
  tensionMs: number;
  revealMs: number;
  settleMs: number;
  /** Scoped CSS custom property suffix for glow color. */
  glowVar: string;
};

/** Opening-scene visual intensity (scoped CSS vars, not global theme). */
export const openingEffectTokens: Record<Rarity, OpeningEffectToken> = {
  common: {
    intensity: 0.25,
    shineMs: 280,
    particles: 0,
    particlesMobile: 0,
    tensionMs: 0,
    revealMs: 180,
    settleMs: 80,
    glowVar: "--cards-effect-common",
  },
  rare: {
    intensity: 0.45,
    shineMs: 420,
    particles: 6,
    particlesMobile: 3,
    tensionMs: 80,
    revealMs: 260,
    settleMs: 120,
    glowVar: "--cards-effect-rare",
  },
  epic: {
    intensity: 0.65,
    shineMs: 520,
    particles: 10,
    particlesMobile: 5,
    tensionMs: 120,
    revealMs: 320,
    settleMs: 140,
    glowVar: "--cards-effect-epic",
  },
  legendary: {
    intensity: 0.85,
    shineMs: 640,
    particles: 16,
    particlesMobile: 8,
    tensionMs: 140,
    revealMs: 420,
    settleMs: 100,
    glowVar: "--cards-effect-legendary",
  },
  gold: {
    intensity: 0.9,
    shineMs: 700,
    particles: 18,
    particlesMobile: 9,
    tensionMs: 160,
    revealMs: 460,
    settleMs: 100,
    glowVar: "--cards-effect-gold",
  },
  diamond: {
    intensity: 1,
    shineMs: 820,
    particles: 22,
    particlesMobile: 10,
    tensionMs: 180,
    revealMs: 520,
    settleMs: 120,
    glowVar: "--cards-effect-diamond",
  },
};

export function isSpecialRarity(rarity: Rarity): boolean {
  return rarity === "legendary" || rarity === "gold" || rarity === "diamond";
}

export const shinyRevealTiming = {
  tensionMs: 140,
  revealMs: 500,
  settleMs: 150,
};
