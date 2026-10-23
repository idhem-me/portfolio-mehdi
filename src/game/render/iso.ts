/** Iso 2:1 — constantes et conversions pures (pas de Pixi). */

export const TILE_W = 128;
export const TILE_H = 64;

export type Point = { x: number; y: number };

/** Coin haut du losange de la tuile (x, y) en coordonnées monde. */
export function gridToScreen(gx: number, gy: number): Point {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

/**
 * Inverse de gridToScreen. Les coins du losange sont gérés par floor
 * après transformation.
 */
export function screenToGrid(sx: number, sy: number): Point {
  const gx = sx / (TILE_W / 2);
  const gy = sy / (TILE_H / 2);
  return {
    x: (gx + gy) / 2,
    y: (gy - gx) / 2,
  };
}

/** Tuile entière sous un point monde (hit-test mathématique). */
export function screenToTile(sx: number, sy: number): { x: number; y: number } {
  const { x, y } = screenToGrid(sx, sy);
  return { x: Math.floor(x), y: Math.floor(y) };
}

/** Centre du losange d'une tuile. */
export function tileCenter(gx: number, gy: number): Point {
  const top = gridToScreen(gx, gy);
  return { x: top.x, y: top.y + TILE_H / 2 };
}

/** Points du losange sol (haut, droite, bas, gauche). */
export function tilePolygon(gx: number, gy: number): number[] {
  const top = gridToScreen(gx, gy);
  return [
    top.x,
    top.y,
    top.x + TILE_W / 2,
    top.y + TILE_H / 2,
    top.x,
    top.y + TILE_H,
    top.x - TILE_W / 2,
    top.y + TILE_H / 2,
  ];
}
