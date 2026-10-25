import type { PieceName } from "./pieces";
export const onboardingConfig = {
  enabled: true,
  storageKey: "tetris.onboardingDone",
  sequence: [
    "O",
    "O",
    "L",
    "Z",
    "T",
    "J",
    "J",
    "Z",
    "T",
    "I",
  ] as readonly PieceName[],
  // Verified placement reference, leaving column 9 as a four-cell well.
  reference: [
    { rot: 0, x: -1 },
    { rot: 0, x: 1 },
    { rot: 1, x: 3 },
    { rot: 0, x: 5 },
    { rot: 3, x: 7 },
    { rot: 0, x: 0 },
    { rot: 2, x: 1 },
    { rot: 0, x: 4 },
    { rot: 2, x: 6 },
    { rot: 1, x: 7 },
  ],
} as const;
export const openingFor = (
  stored: string | null,
  enabled: boolean = onboardingConfig.enabled,
) => (stored === null && enabled ? onboardingConfig.sequence : []);
