import "server-only";
import { mintCapability, validCapability } from "./security/tokens";
import { createHash, timingSafeEqual } from "node:crypto";
import { securityDb } from "./security/database";
import { opaqueKey } from "./security/budget";
import { privateJson, requestCookie } from "./security/http";

export const DASHBOARD_COOKIE = "dashboard_session";
export const DASHBOARD_SESSION_SECONDS = 8 * 3600;
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function dashboardConfigured() {
  const password = process.env.DASHBOARD_PASSWORD;
  return !!password && password.length >= 12 && password !== "change-me";
}
export function validPassword(password: string) {
  if (!dashboardConfigured()) return false;
  return timingSafeEqual(
    Buffer.from(hashToken(password)),
    Buffer.from(hashToken(process.env.DASHBOARD_PASSWORD!)),
  );
}
function credentialVersion() {
  return opaqueKey("dashboard-password:" + process.env.DASHBOARD_PASSWORD);
}
export async function createDashboardSession() {
  const token = mintCapability("admin");
  const { error } = await securityDb()
    .from("security_sessions")
    .insert({
      token_hash: hashToken(token),
      credential_version: credentialVersion(),
      expires_at: new Date(
        Date.now() + DASHBOARD_SESSION_SECONDS * 1000,
      ).toISOString(),
    });
  if (error) throw new Error("Session storage unavailable");
  return token;
}
export async function isValidDashboardToken(
  token: string | undefined | null,
): Promise<boolean> {
  try {
    if (!dashboardConfigured() || !validCapability(token, "admin"))
      return false;
    const { data, error } = await securityDb()
      .from("security_sessions")
      .select("token_hash")
      .eq("token_hash", hashToken(token))
      .eq("credential_version", credentialVersion())
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}
export async function revokeDashboardSession(request: Request) {
  const token = requestCookie(request, DASHBOARD_COOKIE);
  if (!validCapability(token, "admin")) return;
  const { error } = await securityDb()
    .from("security_sessions")
    .delete()
    .eq("token_hash", hashToken(token));
  if (error) throw new Error("Session storage unavailable");
}
export async function requireDashboardSession(request: Request) {
  if (!(await isValidDashboardToken(requestCookie(request, DASHBOARD_COOKIE))))
    return privateJson({ error: "Connexion administrateur requise." }, 401);
}
