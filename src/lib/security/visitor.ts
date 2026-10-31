import "server-only";
import { mintCapability, validCapability } from "./tokens";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { securityDb } from "./database";
import { requestCookie } from "./http";
export const VISITOR_COOKIE = "visitor_capability";
const lifetime = 90 * 86400;
export function visitorToken(request: Request) {
  const token = requestCookie(request, VISITOR_COOKIE);
  return validCapability(token, "visitor") ? token : null;
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function verifiedVisitor(
  request: Request,
): Promise<string | null> {
  const token = visitorToken(request);
  if (!token) return null;
  const { data, error } = await securityDb()
    .from("security_visitors")
    .select("visitor_id")
    .eq("token_hash", tokenHash(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error("Visitor storage unavailable");
  return data?.visitor_id ?? null;
}
export async function issueVisitor(request: Request) {
  const existing = await verifiedVisitor(request);
  if (existing)
    return NextResponse.json(
      { visitor_id: existing },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  const token = mintCapability("visitor");
  const { data, error } = await securityDb()
    .from("security_visitors")
    .insert({
      token_hash: tokenHash(token),
      expires_at: new Date(Date.now() + lifetime * 1000).toISOString(),
    })
    .select("visitor_id")
    .single();
  if (error || !data) throw new Error("Visitor storage unavailable");
  const response = NextResponse.json(
    { visitor_id: data.visitor_id },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  response.cookies.set(VISITOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: lifetime,
  });
  return response;
}
