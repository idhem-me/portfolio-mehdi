/**
 * Shim de compatibilité pour Game.tsx (`import { screenToTile } from …/iso`).
 * Implémentation top-down dans `./grid`.
 */
export {
  TILE,
  TILE as TILE_W,
  TILE as TILE_H,
  gridToWorld,
  gridToWorld as gridToScreen,
  worldToGrid,
  worldToGrid as screenToGrid,
  worldToTile,
  worldToTile as screenToTile,
  tileCenter,
  footprintRect,
  type Point,
} from "./grid";
