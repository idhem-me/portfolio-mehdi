import { PIECE_NAMES } from "../engine/pieces";

/** Resolve CSS in the canvas's scope, including var(), oklch() and color-mix(). */
export function readPalette(canvas: HTMLCanvasElement) {
  const probe = document.createElement("span");
  probe.hidden = true;
  canvas.parentElement!.append(probe);
  const context = document.createElement("canvas").getContext("2d")!;
  const color = (token: string) => {
    probe.style.color = `var(${token})`;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = getComputedStyle(probe).color;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data)
      .slice(0, 3)
      .map((channel) => channel / 255);
  };
  try {
    return {
      colors: new Float32Array(PIECE_NAMES.flatMap((name) => color(`--tetris-piece-${name.toLowerCase()}`))),
      highlight: new Float32Array(color("--tetris-piece-highlight")),
      outline: new Float32Array(color("--tetris-piece-outline")),
      intensity: Math.max(0, Math.min(1, Number(getComputedStyle(canvas).getPropertyValue("--tetris-material-intensity")) || 0)),
    };
  } finally {
    probe.remove();
  }
}

/** Observe only scope changes, never game-frame DOM updates or computed styles per frame. */
export function observePalette(canvas: HTMLCanvasElement, changed: () => void) {
  let frame = 0;
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(changed);
  });
  for (let element: Element | null = canvas; element; element = element.parentElement) {
    observer.observe(element, { attributes: true, attributeFilter: ["class", "style", "data-design-system", "data-theme"] });
  }
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}
