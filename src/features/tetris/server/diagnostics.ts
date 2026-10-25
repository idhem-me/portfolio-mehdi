/** Private operational logs: never include URLs, keys, raw responses or error stacks. */
export function reportBackendFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const reasons: Record<string, string> = {
    "Configuration Supabase incomplète.": "SUPABASE_CONFIG_MISSING",
    "Configuration Supabase invalide.": "SUPABASE_URL_INVALID",
    "Supabase nécessite une clé secrète serveur.":
      "SUPABASE_SERVER_KEY_REQUIRED",
    "Le classement nécessite une base distante persistante.":
      "REMOTE_STORAGE_MISSING",
  };
  const invalidUrl =
    error instanceof Error &&
    "code" in error &&
    error.code === "ERR_INVALID_URL";
  console.error("[tetris:backend]", {
    reason: invalidUrl
      ? "SUPABASE_URL_INVALID"
      : (reasons[message] ?? "BACKEND_UNAVAILABLE"),
  });
}
export function reportSupabaseFailure(
  status: number,
  code: unknown,
  operation: string,
) {
  const operations = new Set([
    "tetris_start_session",
    "tetris_read_session",
    "tetris_commit_score",
    "tetris_leaderboard",
  ]);
  console.error("[tetris:supabase]", {
    operation: operations.has(operation) ? operation : "unknown",
    status:
      Number.isInteger(status) && status >= 100 && status <= 599 ? status : 0,
    code:
      typeof code === "string" && /^(?:PGRST[0-9]{3}|[0-9A-Z]{5})$/.test(code)
        ? code
        : "UNKNOWN",
  });
}
