import { isSameOrigin } from "@/lib/backoffice/request-origin";
import { db, guard, payload } from "@/lib/backoffice/server";
import { budget, securityFailure } from "@/lib/security/budget";
import { readText, HttpError } from "@/lib/security/http";
import { verifiedVisitor } from "@/lib/security/visitor";
export async function POST(r: Request) {
  const denied = guard(r);
  if (denied) return denied;
  if (!r.headers.get("origin") || !isSameOrigin(r))
    return new Response(null, { status: 403 });
  try {
    await budget(r, "tracking", { global: 2000, network: 120 });
    const visitor = await verifiedVisitor(r);
    if (!visitor) return new Response(null, { status: 401 });
    let input;
    try {
      input = payload.parse(JSON.parse(await readText(r, 1999)));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400);
    }
    if (input.visitor_id !== visitor)
      return new Response(null, { status: 403 });
    await budget(r, "tracking-visitor", {
      global: 2000,
      network: 120,
      user: visitor,
      perUser: 8,
    });
    const { error } = await db().rpc("apply_session_delta", {
      p: { ...input, visitor_id: visitor },
      country_code: r.headers.get("x-vercel-ip-country")?.slice(0, 2) || null,
    });
    if (error) throw new Error("Tracking unavailable");
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return securityFailure(error);
  }
}
