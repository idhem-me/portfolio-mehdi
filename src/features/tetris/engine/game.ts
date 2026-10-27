/** Collision/rotation/bag logic adapted from sen-ltd/tetris, MIT © 2026 SEN LLC.
 * Original license: ./LICENSE.source. UI and event architecture are original. */
import { SHAPES, createPieceSource, getKicks, type PieceName } from "./pieces";
export type Piece = { piece: PieceName; rot: number; x: number; y: number };
export type Cell = PieceName | null;
export type Board = Cell[][];
export type GameEvent = {
  type:
    | "move"
    | "rotate"
    | "lock"
    | "hardDrop"
    | "lineClear"
    | "tetris"
    | "combo"
    | "levelUp"
    | "gameOver"
    | "hold";
  n: number;
  rows?: number[];
  color?: PieceName;
  cells?: { x: number; y: number; color: PieceName }[];
};
export type Action = "left" | "right" | "cw" | "ccw" | "soft" | "hard" | "hold";
export const emptyBoard = (): Board =>
  Array.from({ length: 22 }, () => Array<Cell>(10).fill(null));
export const spawn = (piece: PieceName): Piece => ({
  piece,
  rot: 0,
  x: 3,
  y: 1,
});
export function blocks(p: Piece): [number, number][] {
  return SHAPES[p.piece][p.rot].flatMap((row, y) =>
    row.flatMap((c, x) => (c ? [[p.x + x, p.y + y] as [number, number]] : [])),
  );
}
export function fits(b: Board, p: Piece) {
  return blocks(p).every(
    ([x, y]) => x >= 0 && x < 10 && y >= 0 && y < 22 && !b[y][x],
  );
}
export function rotate(b: Board, p: Piece, dir: number): Piece | null {
  const rot = (p.rot + dir + 4) % 4;
  for (const [dx, dy] of getKicks(p.piece, p.rot, rot)) {
    const q = { ...p, rot, x: p.x + dx, y: p.y + dy };
    if (fits(b, q)) return q;
  }
  return null;
}
export function ghost(b: Board, p: Piece) {
  let q = { ...p };
  while (fits(b, { ...q, y: q.y + 1 })) q = { ...q, y: q.y + 1 };
  return q;
}
export function clear(b: Board) {
  const rows = b.flatMap((r, i) => (r.every(Boolean) ? [i] : []));
  const board = b.filter((_, i) => !rows.includes(i));
  while (board.length < 22) board.unshift(Array<Cell>(10).fill(null));
  return { board, rows };
}
export function lineScore(
  n: number,
  level: number,
  combo: number,
  b2b: boolean,
) {
  return (
    (([0, 100, 300, 500, 800][n] ?? 0) * (n === 4 && b2b ? 1.5 : 1) +
      Math.max(0, combo) * 50) *
    level
  );
}
/** Drop interval in ms. Decay 0.7 (was 0.8) steepens the level curve. */
export function gravityMs(level: number) {
  return Math.max(35, 1000 * Math.pow(0.7, level - 1));
}
export class Game {
  board = emptyBoard();
  current: Piece;
  next: PieceName[] = [];
  held: PieceName | null = null;
  heldUsed = false;
  score = 0;
  lines = 0;
  level = 1;
  combo = -1;
  b2b = false;
  over = false;
  elapsed = 0;
  locks = 0;
  lockMs = 0;
  fallMs = 0;
  pieces = 0;
  stats = [0, 0, 0, 0, 0];
  private bag;
  private listeners = new Set<(e: GameEvent) => void>();
  constructor(rng = Math.random, opening: readonly PieceName[] = []) {
    this.bag = createPieceSource(rng, opening);
    this.current = spawn(this.bag.next());
    for (let i = 0; i < 3; i++) this.next.push(this.bag.next());
  }
  on(fn: (e: GameEvent) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit(type: GameEvent["type"], n = 0, rows?: number[]) {
    const cells =
      type === "lineClear"
        ? rows?.flatMap((y) =>
            this.board[y].flatMap((color, x) =>
              color ? [{ x, y, color }] : [],
            ),
          )
        : undefined;
    const e = { type, n, rows, color: this.current.piece, cells };
    this.listeners.forEach((fn) => fn(e));
  }
  private advance() {
    this.current = spawn(this.next.shift()!);
    this.next.push(this.bag.next());
    this.lockMs = 0;
    this.locks = 0;
    this.fallMs = 0;
    if (!fits(this.board, this.current)) {
      this.over = true;
      this.emit("gameOver");
    }
  }
  action(a: Action) {
    if (this.over) return;
    if (a === "hold") {
      if (this.heldUsed) return;
      const name = this.current.piece;
      if (this.held) {
        this.current = spawn(this.held);
        this.lockMs = 0;
        this.locks = 0;
        this.fallMs = 0;
      } else this.advance();
      this.held = name;
      this.heldUsed = true;
      this.emit("hold");
      if (!fits(this.board, this.current)) {
        this.over = true;
        this.emit("gameOver");
      }
      return;
    }
    if (a === "hard") {
      const q = ghost(this.board, this.current);
      this.score += (q.y - this.current.y) * 2;
      this.current = q;
      this.emit("hardDrop");
      this.lock();
      return;
    }
    const grounded = !fits(this.board, {
      ...this.current,
      y: this.current.y + 1,
    });
    const q =
      a === "cw" || a === "ccw"
        ? rotate(this.board, this.current, a === "cw" ? 1 : -1)
        : {
            ...this.current,
            x: this.current.x + (a === "left" ? -1 : a === "right" ? 1 : 0),
            y: this.current.y + (a === "soft" ? 1 : 0),
          };
    if (q && fits(this.board, q)) {
      this.current = q;
      if (a === "soft") this.score++;
      else if (grounded && this.locks < 15) {
        this.lockMs = 0;
        this.locks++;
      }
      this.emit(a === "cw" || a === "ccw" ? "rotate" : "move");
    }
  }
  lock() {
    const cells = blocks(this.current);
    // Recolor only existing masses supporting this piece, before adding its cells.
    const pending = cells.map(([x, y]) => [x, y + 1] as const);
    const visited = new Set<number>();
    while (pending.length) {
      const [x, y] = pending.pop()!;
      if (x < 0 || x >= 10 || y < 0 || y >= 22 || !this.board[y][x]) continue;
      const key = y * 10 + x;
      if (visited.has(key)) continue;
      visited.add(key);
      this.board[y][x] = this.current.piece;
      pending.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
    }
    for (const [x, y] of cells) this.board[y][x] = this.current.piece;
    this.pieces++;
    this.emit("lock");
    const result = clear(this.board);
    const n = result.rows.length;
    if (n) {
      this.combo++;
      this.score += lineScore(n, this.level, this.combo, this.b2b);
      this.lines += n;
      this.stats[n]++;
      this.emit("lineClear", n, result.rows);
      if (n === 4) this.emit("tetris", n);
      if (this.combo > 0) this.emit("combo", this.combo);
      this.b2b = n === 4;
      const level = 1 + Math.floor(this.lines / 10);
      if (level !== this.level) {
        this.level = level;
        this.emit("levelUp", level);
      }
    } else this.combo = -1;
    this.board = result.board;
    this.heldUsed = false;
    if (this.board.slice(0, 2).some((r) => r.some(Boolean))) {
      this.over = true;
      this.emit("gameOver");
      return;
    }
    this.advance();
  }
  tick(dt: number) {
    if (this.over) return;
    this.elapsed += dt;
    this.fallMs += dt;
    const gravity = gravityMs(this.level);
    while (this.fallMs >= gravity) {
      this.fallMs -= gravity;
      const q = { ...this.current, y: this.current.y + 1 };
      if (fits(this.board, q)) this.current = q;
    }
    if (!fits(this.board, { ...this.current, y: this.current.y + 1 })) {
      this.lockMs += dt;
      if (this.lockMs >= 500) this.lock();
    } else this.lockMs = 0;
  }
}
