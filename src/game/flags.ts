import "server-only";

/** Feature flag serveur — jamais préfixé NEXT_PUBLIC_ (pas d'inline client). */
export function isVillageEnabled(): boolean {
  return process.env.VILLAGE_ENABLED === "true";
}
