import { isSameOrigin } from "@/lib/backoffice/request-origin";
import { db, guard, payload } from "@/lib/backoffice/server";

const limits = new Map<string, { at: number; n: number }>();
export async function POST(r: Request) {
  const denied = guard(r);
  if (denied) return denied;
  if (!isSameOrigin(r)) return new Response(null, { status: 403 });
  const body = await r.text();
  if (new TextEncoder().encode(body).length >= 2000)
    return new Response(null, { status: 413 });
  let input;
  try {
    input = payload.parse(JSON.parse(body));
  } catch {
    return new Response(null, { status: 400 });
  }
  const now = Date.now();
  for (const [k, v] of limits) if (now - v.at > 60000) limits.delete(k);
  const limit = limits.get(input.visitor_id) || { at: now, n: 0 };
  if (limit.n >= 8) return new Response(null, { status: 429 });
  limit.n++;
  limits.set(input.visitor_id, limit);
  const { error } = await db().rpc("apply_session_delta", {
    p: input,
    country_code: r.headers.get("x-vercel-ip-country")?.slice(0, 2) || null,
  });
  return Response.json({ ok: !error }, { status: error ? 500 : 200 });
}
