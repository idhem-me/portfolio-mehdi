/** Centralized gesture thresholds for booster cut + Tinder stack. */

export const cutGesture = {
  /** Horizontal distance (px) to fully validate a cut. */
  distance: 110,
  /** Minimum progress (0–1) to commit on pointer up. */
  commitProgress: 0.72,
  /** If |dy| exceeds |dx| by this and |dy| > threshold, treat as scroll. */
  axisLockRatio: 1.15,
  axisLockMinDy: 28,
  /** Haptic/audio tick every N% of cut progress. */
  feedbackStep: 0.4,
  /** Default eject for accessible « Découper » button. */
  defaultDirection: "right" as const,
};

export const swipeGesture = {
  /** Distance (px) to commit a card eject. */
  distance: 96,
  /** Velocity (px/ms) to commit even below distance. */
  velocity: 0.55,
  /** Movement above this is a drag, not a tap. */
  tapSlop: 10,
  /** Max rotation (deg) while dragging. */
  rotateFactor: 0.12,
  /** Spring back stiffness. */
  spring: { type: "spring" as const, stiffness: 420, damping: 28 },
};

export const wrapperExitTiming = {
  bodyMs: 460,
  stripMs: 420,
  fallbackMs: 500,
};

export const cameraZoomTiming = {
  durationMs: 240,
  reducedMs: 40,
};

export const stackLayout = {
  backOffsetY: 10,
  backScaleStep: 0.04,
  maxVisibleBehind: 3,
};

/** A release owns the interaction; the ensuing browser click never advances. */
export function releaseAction(
  dx: number,
  dy: number,
  elapsedMs: number,
  maxTravel: number,
): "tap" | "left" | "right" | "cancel" {
  if (maxTravel <= swipeGesture.tapSlop) return "tap";
  if (Math.abs(dx) <= Math.abs(dy)) return "cancel";
  const fast = Math.abs(dx) / Math.max(1, elapsedMs) >= swipeGesture.velocity;
  if (
    Math.abs(dx) < swipeGesture.distance &&
    !(fast && Math.abs(dx) > swipeGesture.tapSlop * 2)
  )
    return "cancel";
  return dx < 0 ? "left" : "right";
}

export function cutRelease(dx: number, dy: number): "left" | "right" | null {
  if (
    Math.abs(dx) < cutGesture.distance * cutGesture.commitProgress ||
    Math.abs(dy) > Math.abs(dx) * cutGesture.axisLockRatio
  )
    return null;
  return dx < 0 ? "left" : "right";
}
