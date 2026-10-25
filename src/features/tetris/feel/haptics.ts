import type { GameEvent } from "../engine/game";
import { lineFeel, lineCount } from "./line-config";
import { feel, type Settings } from "./config";
/** Experimental, undocumented iOS 18+ switch trick. Opt-in, strong events only. */
export function haptic(
  e: GameEvent,
  s: Settings,
  switchInput?: HTMLInputElement | null,
) {
  if (!s.haptics) return;
  try {
    if (typeof navigator.vibrate === "function") {
      const pattern =
        e.type === "lineClear"
          ? [...lineFeel[lineCount(e.n)].haptics]
          : [...feel.haptics[e.type]];
      if (e.type === "combo")
        pattern[pattern.length - 1] = Math.min(70, 15 + e.n * 8);
      navigator.vibrate(pattern);
    } else if (s.ios && ["lock", "lineClear", "tetris"].includes(e.type))
      switchInput?.click();
  } catch {
    /* Unsupported APIs must never interrupt a game. */
  }
}
