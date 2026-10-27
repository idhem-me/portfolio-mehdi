import { vibrate } from "@/lib/games/haptics";
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
  const pattern =
    e.type === "lineClear"
      ? [...lineFeel[lineCount(e.n)].haptics]
      : [...feel.haptics[e.type]];
  if (e.type === "combo")
    pattern[pattern.length - 1] = Math.min(70, 15 + e.n * 8);
  vibrate(pattern, {
    enabled: true,
    ios: s.ios,
    allowIosFallback: ["lock", "lineClear", "tetris"].includes(e.type),
    switchInput,
  });
}
