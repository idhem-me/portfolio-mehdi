import type { Camera } from "./Camera";

/** Pont UI ↔ caméra Pixi (évite de remonter la caméra dans React). */
let camera: Camera | null = null;

export function bindCamera(c: Camera | null): void {
  camera = c;
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
