import { useId } from "react";
import { blocks, spawn } from "../engine/game";
import type { PieceName } from "../engine/pieces";
import { silhouette } from "../render/silhouette";
export function PieceShape({ name }: { name: PieceName | null }) {
  const id = useId().replaceAll(":", "");
  const path = name ? silhouette(blocks({ ...spawn(name), x: 0, y: 0 })) : "";
  return (
    <svg
      className="lava-mini"
      viewBox="-.15 -.15 4.3 3.3"
      role="img"
      aria-label={name ?? "Réserve vide"}
    >
      <defs>
        <radialGradient id={id + "core"} cx="40%" cy="30%" r="85%">
          <stop stopColor="white" stopOpacity=".8" />
          <stop offset=".4" stopColor="white" stopOpacity=".25" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id + "oil"} x2="0" y2="1">
          <stop stopColor="white" stopOpacity=".7" />
          <stop offset=".3" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {name && (
        <g>
          <path d={path} fill={`var(--tetris-piece-${name.toLowerCase()})`} />
          <path d={path} fill={`url(#${id}core)`} />
          <path d={path} fill={`url(#${id}oil)`} />
        </g>
      )}
    </svg>
  );
}
