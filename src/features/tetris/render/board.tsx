"use client";
import { useEffect, useRef, useState, useId, type RefObject } from "react";
import { blocks, ghost, type Game } from "../engine/game";
import { PIECE_NAMES } from "../engine/pieces";
import { lavaMaterial } from "./material";
import { silhouette } from "./silhouette";
import { createLava } from "./lava";
export function LavaBoard({
  game,
  active,
  reduced,
}: {
  game: RefObject<Game>;
  active: boolean;
  reduced: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const id = useId().replaceAll(":", "");
  useEffect(() => {
    const c = canvas.current!;
    const renderer = createLava(c);
    if (!renderer) {
      const frame = requestAnimationFrame(() => setFallback(true));
      return () => cancelAnimationFrame(frame);
    }
    const off = game.current.on((e) => renderer.event(e, game.current));
    let raf = 0;
    const loop = (now: number) => {
      try {
        renderer.draw(game.current, now, reduced);
      } catch {
        setFallback(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    if (active) raf = requestAnimationFrame(loop);
    else renderer.draw(game.current, 0, true);
    const lost = (e: Event) => {
      e.preventDefault();
      setFallback(true);
    };
    c.addEventListener("webglcontextlost", lost);
    return () => {
      off();
      cancelAnimationFrame(raf);
      renderer.dispose();
      c.removeEventListener("webglcontextlost", lost);
    };
  }, [game, active, reduced]);
  const g = game.current;
  const ghostCells = blocks(ghost(g.board, g.current));
  const activeCells = !g.over ? blocks(g.current) : [];
  const settledPaths = fallback
    ? PIECE_NAMES.map((color) => ({
        color,
        path: silhouette(
          g.board.flatMap((row, y) =>
            row.flatMap((c, x) => (c === color ? [[x, y - 2] as const] : [])),
          ),
        ),
      })).filter(({ path }) => path)
    : [];
  const activePath = fallback
    ? silhouette(activeCells.map(([x, y]) => [x, y - 2] as const))
    : "";
  return (
    <>
      <canvas
        ref={canvas}
        className="lava-canvas"
        aria-hidden="true"
        style={{ visibility: fallback ? "hidden" : "visible" }}
      />
      <svg className="lava-vector" viewBox="0 0 10 20" aria-hidden="true">
        <defs>
          <radialGradient id={id + "core"} cx="48%" cy="52%" r="68%">
            <stop stopColor="white" stopOpacity=".55" />
            <stop offset=".5" stopColor="white" stopOpacity=".12" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id + "oil"} x2="1" y2="1">
            <stop stopColor="white" stopOpacity=".8" />
            <stop offset=".2" stopColor="white" stopOpacity="0" />
            <stop offset=".56" stopColor="white" stopOpacity="0" />
            <stop offset=".64" stopColor="white" stopOpacity=".26" />
            <stop offset=".73" stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="black" stopOpacity=".22" />
          </linearGradient>
        </defs>
        {!g.over && (
          <path
            d={silhouette(ghostCells.map(([x, y]) => [x, y - 2] as const))}
            className="lava-ghost"
          />
        )}
        {fallback && (
          <>
            {settledPaths.map(({ color, path: settledPath }) => (
              <g
                key={color}
                className="lava-fallback-piece"
                data-layer="settled"
              >
                <path
                  d={settledPath}
                  fill={`var(--tetris-piece-${color.toLowerCase()})`}
                />
                <path d={settledPath} fill={`url(#${id}core)`} />
                <path d={settledPath} fill={`url(#${id}oil)`} />
                <path
                  d={settledPath}
                  fill="none"
                  stroke="white"
                  strokeOpacity={lavaMaterial.glassRimOpacity}
                  strokeWidth={lavaMaterial.glassRimWidth}
                />
              </g>
            ))}
            {!g.over && (
              <g data-layer="active">
                <path
                  d={activePath}
                  fill={`var(--tetris-piece-${g.current.piece.toLowerCase()})`}
                />
                <path d={activePath} fill={`url(#${id}core)`} />
                <path d={activePath} fill={`url(#${id}oil)`} />
                <path
                  d={activePath}
                  fill="none"
                  stroke="white"
                  strokeOpacity={lavaMaterial.glassRimOpacity}
                  strokeWidth={lavaMaterial.glassRimWidth}
                />
              </g>
            )}
          </>
        )}
      </svg>
    </>
  );
}
