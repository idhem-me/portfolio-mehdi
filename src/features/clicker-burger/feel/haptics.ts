import { feedbackHaptics, type FeedbackKind, type Settings } from "./config";

/** Optional iOS Safari switch trick, same idea as Tetris (opt-in, strong events). */
export function haptic(
  kind: FeedbackKind,
  settings: Settings,
  switchInput?: HTMLInputElement | null,
) {
  if (!settings.haptics) return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([...feedbackHaptics[kind]]);
    } else if (settings.ios && (kind === "levelUp" || kind === "novelty")) {
      switchInput?.click();
    }
  } catch {
    /* Unsupported APIs must never interrupt play. */
  }
}
