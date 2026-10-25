"use client";
import { useEffect, useState } from "react";
import { PieceShape } from "./piece-shape";
const pieces = ["T", "I", "S", "L", "O", "J", "Z"] as const;
/** Decorative placeholder. Replace this component with a replay renderer later. */
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
          key={name}
          style={{
            left: `${i * 15}%`,
            animationDelay: `${-i * 2.7}s`,
            animationDuration: `${20 + i}s`,
          }}
        >
          <PieceShape name={name} />
        </div>
      ))}
    </div>
  );
}
