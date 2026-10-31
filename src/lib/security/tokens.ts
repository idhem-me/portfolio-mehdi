import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { opaqueKey } from "./budget";

/** Authenticity tag rejects fabricated credentials before any database read.
 * Expiry, ownership and revocation are still checked in the database.
 */
export function mintCapability(purpose: "admin" | "visitor") {
  const random = randomBytes(32).toString("hex");
  return `${random}.${opaqueKey(`${purpose}:${random}`)}`;
}
export function validCapability(
  token: string | null | undefined,
  purpose: "admin" | "visitor",
): token is string {
  if (!token || !/^[0-9a-f]{64}\.[0-9a-f]{64}$/.test(token)) return false;
  const [random, signature] = token.split(".");
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(opaqueKey(`${purpose}:${random}`), "hex"),
  );
}
