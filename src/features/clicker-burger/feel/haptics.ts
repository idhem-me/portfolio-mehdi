import { vibrate } from "@/lib/games/haptics";
import { feedbackHaptics, type FeedbackKind, type Settings } from "./config";

/** Optional iOS Safari switch trick, same idea as Tetris (opt-in, strong events). */
export function haptic(
  kind: FeedbackKind,
  settings: Settings,
  switchInput?: HTMLInputElement | null,
) {
  vibrate([...feedbackHaptics[kind]], {
    enabled: settings.haptics,
    ios: settings.ios,
    allowIosFallback: kind === "levelUp" || kind === "novelty",
    switchInput,
  });
}
