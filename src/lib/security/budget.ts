import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { securityDb } from "./database";
import { HttpError, privateJson } from "./http";

// Local development can use a process key; production MUST configure a stable secret.
const developmentKey = randomBytes(32).toString("hex");
function secret() {
  const value = process.env.SECURITY_HASH_KEY;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL)
    return developmentKey;
  throw new HttpError(503, "Service momentanément indisponible.");
}
export function opaqueKey(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}
export function networkKey(request: Request) {
  // Vercel overwrites this header. Never trust a caller-supplied X-Forwarded-For.
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    : "development";
  return opaqueKey("network:" + (ip || "unknown"));
}

/** Global first: rotating IP/user identifiers cannot allocate unbounded rows. */
export async function budget(
  request: Request,
  scope: string,
  options: {
    global: number;
    network: number;
    seconds?: number;
    user?: string;
    perUser?: number;
  },
) {
  const seconds = options.seconds ?? 60;
  const client = securityDb();
  const keys: [string, number][] = [
    [opaqueKey(scope + ":global"), options.global],
    [opaqueKey(scope + ":" + networkKey(request)), options.network],
  ];
  if (options.user)
    keys.push([
      opaqueKey(scope + ":user:" + options.user),
      options.perUser ?? options.network,
    ]);
  for (const [key, maximum] of keys) {
    const { data, error } = await client.rpc("security_consume_budget", {
      p_key: key,
      p_max: maximum,
      p_seconds: seconds,
    });
    if (error) throw new HttpError(503, "Service momentanément indisponible.");
    if (data !== true)
      throw new HttpError(429, "Trop de demandes. Réessaie plus tard.");
  }
}

/** Shared leases expire after a crashed Function; admission precedes expensive work. */
export async function imageLease(): Promise<() => Promise<void>> {
  const id = crypto.randomUUID();
  const { data, error } = await securityDb().rpc("security_acquire_lease", {
    p_id: id,
  });
  if (error) throw new HttpError(503, "Service momentanément indisponible.");
  if (data !== true)
    throw new HttpError(429, "Trop de demandes. Réessaie plus tard.");
  return async () => {
    await securityDb().from("security_leases").delete().eq("id", id);
  };
}
export function securityFailure(error: unknown): Response {
  const status = error instanceof HttpError ? error.status : 503;
  const response = privateJson(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "Service momentanément indisponible.",
    },
    status,
  );
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
