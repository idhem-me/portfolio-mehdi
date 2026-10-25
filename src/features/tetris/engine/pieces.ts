/** Logic adapted from sen-ltd/tetris, MIT © 2026 SEN LLC. See LICENSE.source. */
export type PieceName = "T" | "J" | "L" | "S" | "Z" | "I" | "O";
// Tetromino definitions and rotation system.
//
// Each piece is a 4×4 (I) or 3×3 (others) matrix of cells. The 4 rotations
// are stored explicitly — simpler than computing transposition + flip on
// every key press, and easier to test.
//
// SRS (Super Rotation System) wall-kick offsets are listed per piece below.

// "0" = empty cell. The non-zero value is the piece ID (1..7) which lets the
// renderer pick a colour.

const T = 1, J = 2, L = 3, S = 4, Z = 5, I = 6, O = 7;

export const PIECE_IDS = { T, J, L, S, Z, I, O };

// 4 rotations per piece, indexed 0..3. Each rotation is a 2-D array.
export const SHAPES: Record<PieceName, number[][][]> = {
  T: [
    [[0,T,0], [T,T,T], [0,0,0]],
    [[0,T,0], [0,T,T], [0,T,0]],
    [[0,0,0], [T,T,T], [0,T,0]],
    [[0,T,0], [T,T,0], [0,T,0]],
  ],
  J: [
    [[J,0,0], [J,J,J], [0,0,0]],
    [[0,J,J], [0,J,0], [0,J,0]],
    [[0,0,0], [J,J,J], [0,0,J]],
    [[0,J,0], [0,J,0], [J,J,0]],
  ],
  L: [
    [[0,0,L], [L,L,L], [0,0,0]],
    [[0,L,0], [0,L,0], [0,L,L]],
    [[0,0,0], [L,L,L], [L,0,0]],
    [[L,L,0], [0,L,0], [0,L,0]],
  ],
  S: [
    [[0,S,S], [S,S,0], [0,0,0]],
    [[0,S,0], [0,S,S], [0,0,S]],
    [[0,0,0], [0,S,S], [S,S,0]],
    [[S,0,0], [S,S,0], [0,S,0]],
  ],
  Z: [
    [[Z,Z,0], [0,Z,Z], [0,0,0]],
    [[0,0,Z], [0,Z,Z], [0,Z,0]],
    [[0,0,0], [Z,Z,0], [0,Z,Z]],
    [[0,Z,0], [Z,Z,0], [Z,0,0]],
  ],
  I: [
    [[0,0,0,0], [I,I,I,I], [0,0,0,0], [0,0,0,0]],
    [[0,0,I,0], [0,0,I,0], [0,0,I,0], [0,0,I,0]],
    [[0,0,0,0], [0,0,0,0], [I,I,I,I], [0,0,0,0]],
    [[0,I,0,0], [0,I,0,0], [0,I,0,0], [0,I,0,0]],
  ],
  O: [
    [[0,O,O,0], [0,O,O,0], [0,0,0,0], [0,0,0,0]],
    [[0,O,O,0], [0,O,O,0], [0,0,0,0], [0,0,0,0]],
    [[0,O,O,0], [0,O,O,0], [0,0,0,0], [0,0,0,0]],
    [[0,O,O,0], [0,O,O,0], [0,0,0,0], [0,0,0,0]],
  ],
};

export const PIECE_NAMES: PieceName[] = ["T", "J", "L", "S", "Z", "I", "O"];

// Spawn positions: column offset where the piece should appear on a 10-wide board.
// Row 0 = top.
export const SPAWN_COL: Record<PieceName, number> = {
  T: 3, J: 3, L: 3, S: 3, Z: 3, I: 3, O: 3,
};

// Wall-kick offsets (simplified SRS). Each entry is a list of (dx, dy) tries.
// For each rotation transition (from→to), the kicks are tried in order until
// one succeeds. Index in this table is dir * 8 + from-rotation (0..3).
// We use a small subset of standard SRS:
//   - JLSTZ: 5 kicks per transition
//   - I: 5 kicks (different from JLSTZ)
//   - O: no kicks (square doesn't rotate)
//
// Kicks are in "piece-local" coords: dx > 0 = right, dy > 0 = up (so we
// negate dy when applying to grid where y grows downward).
const KICKS_JLSTZ: Record<string, number[][]> = {
  "0->1": [[ 0, 0], [-1, 0], [-1,+1], [ 0,-2], [-1,-2]],
  "1->0": [[ 0, 0], [+1, 0], [+1,-1], [ 0,+2], [+1,+2]],
  "1->2": [[ 0, 0], [+1, 0], [+1,-1], [ 0,+2], [+1,+2]],
  "2->1": [[ 0, 0], [-1, 0], [-1,+1], [ 0,-2], [-1,-2]],
  "2->3": [[ 0, 0], [+1, 0], [+1,+1], [ 0,-2], [+1,-2]],
  "3->2": [[ 0, 0], [-1, 0], [-1,-1], [ 0,+2], [-1,+2]],
  "3->0": [[ 0, 0], [-1, 0], [-1,-1], [ 0,+2], [-1,+2]],
  "0->3": [[ 0, 0], [+1, 0], [+1,+1], [ 0,-2], [+1,-2]],
};
const KICKS_I: Record<string, number[][]> = {
  "0->1": [[ 0, 0], [-2, 0], [+1, 0], [-2,-1], [+1,+2]],
  "1->0": [[ 0, 0], [+2, 0], [-1, 0], [+2,+1], [-1,-2]],
  "1->2": [[ 0, 0], [-1, 0], [+2, 0], [-1,+2], [+2,-1]],
  "2->1": [[ 0, 0], [+1, 0], [-2, 0], [+1,-2], [-2,+1]],
  "2->3": [[ 0, 0], [+2, 0], [-1, 0], [+2,+1], [-1,-2]],
  "3->2": [[ 0, 0], [-2, 0], [+1, 0], [-2,-1], [+1,+2]],
  "3->0": [[ 0, 0], [+1, 0], [-2, 0], [+1,-2], [-2,+1]],
  "0->3": [[ 0, 0], [-1, 0], [+2, 0], [-1,+2], [+2,-1]],
};

export function getKicks(piece: PieceName, fromRot: number, toRot: number) {
  if (piece === "O") return [[0, 0]];
  const key = `${fromRot}->${toRot}`;
  const table = piece === "I" ? KICKS_I : KICKS_JLSTZ;
  // Negate dy because we use grid coords (y grows down).
  return (table[key] || [[0, 0]]).map(([dx, dy]) => [dx, -dy]);
}

// 7-bag randomizer: yields each of the 7 pieces once before any repeats.
// Pass a RNG function returning a float in [0, 1).
export function createBag(rng: () => number) {
  let bag: PieceName[] = [];
  function refill() {
    bag = [...PIECE_NAMES];
    // Fisher–Yates shuffle
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return {
    next() {
      if (bag.length === 0) refill();
      return bag.shift()!;
    },
  };
}

