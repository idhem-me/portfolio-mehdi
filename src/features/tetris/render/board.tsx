"use client";
import { useEffect, useRef, useState, useId, type RefObject } from "react";
import { blocks, ghost, type Game } from "../engine/game";
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
  const settledCells = (fallback ? g.board : []).flatMap((row, y) =>
    row.flatMap((c, x) => (c ? [[x, y - 2] as const] : [])),
  );
  const settledPath = silhouette(settledCells);
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
          <linearGradient
            id={id + "mass"}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="10"
            y2="20"
          >
            <stop offset="0" stopColor="var(--tetris-piece-t)" />
            <stop offset=".38" stopColor="var(--tetris-mass-cyan)" />
            <stop offset=".7" stopColor="var(--tetris-piece-t)" />
            <stop offset="1" stopColor="var(--tetris-mass-pink)" />
            {fallback && active && !reduced && (
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="-2 -1;2 1;-2 -1"
                dur={`${lavaMaterial.cycleSeconds}s`}
                repeatCount="indefinite"
              />
            )}
          </linearGradient>
          <radialGradient id={id + "core"} cx="35%" cy="25%" r="90%">
            <stop stopColor="white" stopOpacity=".85" />
            <stop offset=".5" stopColor="white" stopOpacity=".28" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id + "oil"} x2="0" y2="1">
            <stop stopColor="white" stopOpacity=".8" />
            <stop offset=".25" stopColor="white" stopOpacity="0" />
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
            <g className="lava-fallback-piece" data-layer="settled">
              <path d={settledPath} fill={`url(#${id}mass)`} />
              <path d={settledPath} fill={`url(#${id}core)`} />
              <path d={settledPath} fill={`url(#${id}oil)`} />
            </g>
            {!g.over && (
              <g data-layer="active">
                <path
                  d={activePath}
                  fill={`var(--tetris-piece-${g.current.piece.toLowerCase()})`}
                />
                <path d={activePath} fill={`url(#${id}core)`} />
                <path d={activePath} fill={`url(#${id}oil)`} />
              </g>
            )}
          </>
        )}
      </svg>
    </>
  );
}
