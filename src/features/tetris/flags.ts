export const tetrisEnabled = process.env.NEXT_PUBLIC_ENABLE_TETRIS === "true";
// Manual publication gate: never tied to enablement.
export const tetrisPublic = false;

export const soundEnabled =
  tetrisEnabled && process.env.NEXT_PUBLIC_ENABLE_TETRIS_SOUND === "true";
export const leaderboardEnabled =
  tetrisEnabled && process.env.NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD === "true";
