export type HapticOptions = {
  enabled: boolean;
  ios?: boolean;
  /** When true, may fall back to the undocumented iOS Safari switch trick. */
  allowIosFallback?: boolean;
  switchInput?: HTMLInputElement | null;
};

/**
 * Shared vibration helper used by portfolio games.
 * Safari iOS does not support navigator.vibrate; optional ios switch is opt-in.
 */
export function vibrate(
  pattern: number | number[],
  options: HapticOptions,
): void {
  if (!options.enabled) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    } else if (options.ios && options.allowIosFallback) {
      options.switchInput?.click();
    }
  } catch {
    /* Unsupported APIs must never interrupt play. */
  }
}
