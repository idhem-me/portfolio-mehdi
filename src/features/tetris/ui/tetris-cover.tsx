"use client";
import { PieceShape } from "./piece-shape";
import "./game.css";
const pieces = ["T", "I", "S", "L", "O", "J", "Z"] as const;
export function TetrisCover() {
  return (
    <div className="tetris-cover" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span
          key={piece}
          style={{
            left: 8 + i * 13 + "%",
            top: (i % 2 ? 56 : 14) + "%",
            transform: "rotate(" + ((i % 3) - 1) * 9 + "deg)",
          }}
        >
          <PieceShape name={piece} />
        </span>
      ))}
    </div>
  );
}
