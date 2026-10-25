import { Game, type Action } from "./game";
import { onboardingConfig } from "./opening";
export type Step = Action | number;
export const replayLimit = 200000;
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function verifyReplay(seed: number, steps: unknown, opening = false): Game {
  if (!Array.isArray(steps) || !steps.length || steps.length > replayLimit)
    throw Error("Partie trop longue ou invalide.");
  const game = new Game(seeded(seed), opening ? onboardingConfig.sequence : []);
  for (const step of steps) {
    if (game.over) throw Error("Actions après la fin.");
    if (
      typeof step === "number" &&
      Number.isFinite(step) &&
      step >= 0 &&
      step <= 50
    )
      game.tick(step);
    else if (
      typeof step === "string" &&
      ["left", "right", "cw", "ccw", "soft", "hard", "hold"].includes(step)
    )
      game.action(step as Action);
    else throw Error("Action invalide.");
  }
  if (!game.over || game.elapsed > 7200000)
    throw Error("Partie inachevée ou trop longue.");
  return game;
}
