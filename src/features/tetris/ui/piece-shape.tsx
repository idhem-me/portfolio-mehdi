import { useId } from "react";
import { blocks, spawn } from "../engine/game";
import type { PieceName } from "../engine/pieces";
import { lavaMaterial } from "../render/material";
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
        <radialGradient id={id + "core"} cx="48%" cy="52%" r="68%">
          <stop stopColor="white" stopOpacity=".55" />
          <stop offset=".4" stopColor="white" stopOpacity=".12" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id + "oil"} x2="1" y2="1">
          <stop stopColor="white" stopOpacity=".7" />
          <stop offset=".2" stopColor="white" stopOpacity="0" />
          <stop offset=".56" stopColor="white" stopOpacity="0" />
          <stop offset=".64" stopColor="white" stopOpacity=".26" />
          <stop offset=".73" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity=".22" />
        </linearGradient>
      </defs>
      {name && (
        <g>
          <path d={path} fill={`var(--tetris-piece-${name.toLowerCase()})`} />
          <path d={path} fill={`url(#${id}core)`} />
          <path d={path} fill={`url(#${id}oil)`} />
          <path
            d={path}
            fill="none"
            stroke="white"
            strokeOpacity={lavaMaterial.glassRimOpacity}
            strokeWidth={lavaMaterial.glassRimWidth}
          />
        </g>
      )}
    </svg>
  );
}
