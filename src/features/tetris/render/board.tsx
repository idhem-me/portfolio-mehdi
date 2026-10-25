"use client";
import { useEffect, useRef, useState, useId, type RefObject } from "react";
import { blocks, ghost, type Game } from "../engine/game";
import { PIECE_NAMES } from "../engine/pieces";
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
          <filter id={id}>
            <feGaussianBlur stdDeviation=".1" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -7" />
          </filter>
          <linearGradient id={id + "shine"} x2=".6" y2="1">
            <stop stopColor="white" stopOpacity=".8" />
            <stop offset=".35" stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="black" stopOpacity=".25" />
          </linearGradient>
        </defs>
        {!g.over &&
          ghostCells.map(([x, y]) => (
            <rect
              key={`${x}-${y}`}
              x={x + 0.12}
              y={y - 2 + 0.12}
              width=".76"
              height=".76"
              rx=".2"
              className="lava-ghost"
            />
          ))}
        {fallback &&
          PIECE_NAMES.map((name) => (
            <g
              key={name}
              fill={`var(--tetris-piece-${name.toLowerCase()})`}
              filter={`url(#${id})`}
            >
              {[
                ...g.board.flatMap((r, y) =>
                  r.flatMap((c, x) => (c === name ? [[x, y]] : [])),
                ),
                ...(!g.over && g.current.piece === name
                  ? blocks(g.current)
                  : []),
              ].map(([x, y]) => (
                <g key={`${x}-${y}`}>
                  <rect
                    x={x + 0.04}
                    y={y - 2 + 0.04}
                    width=".92"
                    height=".92"
                    rx=".3"
                  />
                  <rect
                    x={x + 0.04}
                    y={y - 2 + 0.04}
                    width=".92"
                    height=".92"
                    rx=".3"
                    fill={`url(#${id}shine)`}
                  />
                </g>
              ))}
            </g>
          ))}
      </svg>
    </>
  );
}
