"use client";
import { motion } from "motion/react";
import type { CSSProperties } from "react";
import type { GameEvent } from "../engine/game";
import { lineFeel, lineCount } from "./line-config";
export function LineCelebration({
  event,
  reduced,
}: {
  event: GameEvent;
  reduced: boolean;
}) {
  const n = lineCount(event.n),
    f = lineFeel[n];
  const duration = f.duration / 1000;
  return (
    <div
      className="lava-celebration"
      data-lines={n}
      data-reduced={reduced}
      style={
        {
          "--reward-scale": f.scale,
          "--reward-rays": f.rays,
          "--reward-duration": `${f.duration}ms`,
        } as CSSProperties
      }
    >
      {!reduced &&
        (event.rows ?? []).map((row) => (
          <div
            key={row}
            className="lava-line-burst"
            style={{ top: `${(row - 2) * 5}%` }}
          >
            <motion.i
              className="lava-line-halo"
              initial={{ opacity: 0.3, scaleY: 1 }}
              animate={{ opacity: 0, scaleY: 3 }}
              transition={{ duration: 0.5 }}
            />
            {Array.from({ length: f.particles }, (_, i) => {
              const color =
                event.cells?.filter((c) => c.y === row)[i % 10]?.color ??
                event.color ??
                "I";
              return (
                <motion.i
                  key={i}
                  className={i % 3 === 0 ? "lava-spark" : "lava-droplet"}
                  style={{
                    left: `${8 + (i * 84) / (f.particles - 1)}%`,
                    background: `var(--tetris-piece-${color.toLowerCase()})`,
                  }}
                  initial={{ opacity: 0.85, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: (i % 2 ? 1 : -1) * (5 + i * 2),
                    y: -(12 + (i % 4) * 9),
                    scale: 0.2,
                    rotate: i % 2 ? 45 : -45,
                  }}
                  transition={{ duration: 0.5, delay: (i % 2) * 0.025 }}
                />
              );
            })}
          </div>
        ))}
      <motion.div
        className="lava-reward"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.35, y: 15 }}
        animate={
          reduced
            ? { opacity: [0, 1, 1, 0] }
            : {
                opacity: [0, 1, 1, 0],
                scale: [0.35, 1.14, 1, 1.025],
                y: [15, 0, 0, -18],
              }
        }
        transition={{
          duration,
          times: [0, 0.2, 0.72, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {!reduced && (
          <>
            <div className="lava-reward-rays" />
            <div className="lava-reward-hatch" />
            {Array.from({ length: f.stars }, (_, i) => (
              <motion.svg
                key={i}
                className={`lava-reward-star ${n === 4 && i % 4 === 0 ? "lava-shooting-star" : ""}`}
                viewBox="0 0 40 40"
                style={{
                  left: `${4 + ((i * 47) % 92)}%`,
                  top: `${(i * 37) % 100}%`,
                  color: `var(--reward-star-${i % 4})`,
                }}
                initial={{ opacity: 0, scale: 0.1, rotate: -25 }}
                animate={{
                  opacity: [0, 1, 0.8, 0],
                  scale: [0.1, 1, 0.7, 0.1],
                  rotate: [-25, 15, 35, 45],
                  x: n === 4 && i % 4 === 0 ? [0, 0, 30, 70] : 0,
                  y: n === 4 && i % 4 === 0 ? [0, 0, -10, -30] : 0,
                }}
                transition={{ duration, delay: (i % 3) * 0.04 }}
              >
                {n === 4 && i % 4 === 0 && (
                  <>
                    <line
                      x1="-75"
                      y1="52"
                      x2="20"
                      y2="20"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity=".35"
                    />
                    <line
                      x1="-45"
                      y1="43"
                      x2="20"
                      y2="20"
                      stroke="white"
                      strokeWidth="1"
                      opacity=".7"
                    />
                  </>
                )}
                <path
                  d="M20 1L24 14L38 20L25 24L20 39L15 25L1 20L15 15Z"
                  fill="currentColor"
                />
              </motion.svg>
            ))}
          </>
        )}
        <span
          className="lava-reward-type"
          data-text={f.label}
          aria-live="polite"
        >
          {f.label}
        </span>
      </motion.div>
    </div>
  );
}
