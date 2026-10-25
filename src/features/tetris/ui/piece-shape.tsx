import { blocks, spawn } from "../engine/game";
import type { PieceName } from "../engine/pieces";
export function PieceShape({ name }: { name: PieceName | null }) {
  return (
    <svg
      className="lava-mini"
      viewBox="0 0 4 3"
      role="img"
      aria-label={name ?? "Réserve vide"}
    >
      {name &&
        blocks({ ...spawn(name), y: 0 }).map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x - 3 + 0.07}
            y={y + 0.07}
            width=".86"
            height=".86"
            rx=".28"
            fill={`var(--tetris-piece-${name.toLowerCase()})`}
          />
        ))}
    </svg>
  );
}
