import type { Camera } from "./Camera";

/** Pont UI ↔ caméra Pixi (évite de remonter la caméra dans React). */
let camera: Camera | null = null;

export function bindCamera(c: Camera | null): void {
  camera = c;
}

export function getCamera(): Camera | null {
  return camera;
}

export function worldToScreen(wx: number, wy: number): { x: number; y: number } | null {
  if (!camera) return null;
  return {
    x: wx * camera.zoom + camera.world.x,
    y: wy * camera.zoom + camera.world.y,
  };
}

export function cameraZoomIn(): void {
  camera?.zoomBy(1.2);
}

export function cameraZoomOut(): void {
  camera?.zoomBy(1 / 1.2);
}

export function cameraRecenter(): void {
  camera?.recenter();
}
