import { vibrate } from "@/lib/games/haptics";
import {
  hapticPatterns,
  type CardsHapticKind,
  type CardsSettings,
} from "./config";

export function cardsHaptic(
  kind: CardsHapticKind,
  settings: CardsSettings,
  switchInput?: HTMLInputElement | null,
) {
  const strong =
    kind === "legendary" ||
    kind === "gold" ||
    kind === "diamond" ||
    kind === "tear";
  vibrate([...hapticPatterns[kind]], {
    enabled: settings.haptics,
    ios: settings.ios,
    allowIosFallback: strong,
    switchInput,
  });
}
