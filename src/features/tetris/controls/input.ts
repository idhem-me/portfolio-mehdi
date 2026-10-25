import type { Action } from "../engine/game";
import { feel } from "../feel/config";
export const keys: Record<string, Action> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "soft",
  ArrowUp: "cw",
  x: "cw",
  z: "ccw",
  " ": "hard",
  c: "hold",
  Shift: "hold",
};
export function bindKeyboard(
  element: HTMLElement,
  act: (a: Action) => void,
  pause: () => void,
) {
  const held = new Map<string, { action: Action; next: number }>();
  let raf = 0;
  const down = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('[role="dialog"],input,textarea'))
      return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["Escape", "p"].includes(key)) {
      e.preventDefault();
      if (!e.repeat) pause();
      return;
    }
    const action = keys[key];
    if (!action) return;
    e.preventDefault();
    if (e.repeat || held.has(key)) return;
    act(action);
    if (["left", "right", "soft"].includes(action))
      held.set(key, {
        action,
        next: performance.now() + (action === "soft" ? feel.softArr : feel.das),
      });
  };
  const up = (e: KeyboardEvent) => held.delete(e.key);
  const reset = () => held.clear();
  const loop = (now: number) => {
    for (const item of held.values())
      if (now >= item.next) {
        act(item.action);
        item.next = now + (item.action === "soft" ? feel.softArr : feel.arr);
      }
    raf = requestAnimationFrame(loop);
  };
  element.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", reset);
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    element.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", reset);
  };
}
