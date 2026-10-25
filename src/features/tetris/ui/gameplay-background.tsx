"use client";
import { useEffect, useState } from "react";
import { PieceShape } from "./piece-shape";
const pieces = [
  "T",
  "I",
  "S",
  "L",
  "O",
  "J",
  "Z",
  "T",
  "I",
  "S",
  "L",
  "O",
  "J",
  "Z",
] as const;
/** Fixed pool of fourteen pieces: only transform is animated, no nodes are added. */
export function GameplayBackground() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return (
    <div className="lava-background" aria-hidden="true" data-hidden={hidden}>
      {pieces.map((name, i) => (
        <div
          key={i}
          style={{
            left: `${((i * 23) % 110) - 8}%`,
            animationDelay: `${-i * 3.1}s`,
            animationDuration: `${20 + i}s`,
          }}
        >
          <PieceShape name={name} />
        </div>
      ))}
    </div>
  );
}
