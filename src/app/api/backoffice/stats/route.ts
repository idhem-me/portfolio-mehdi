import { requireDashboardSession } from "@/lib/dashboard-auth";
import { db } from "@/lib/backoffice/server";

const cache = new Map<string, { at: number; data: unknown }>();
export async function GET(r: Request) {
  const denied = await requireDashboardSession(r);
  if (denied) return denied;
  const range = new URL(r.url).searchParams.get("range") || "7d";
  const hours = (
    { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 } as Record<string, number>
  )[range];
  if (!hours) return new Response(null, { status: 400 });
  let entry = cache.get(range);
  if (!entry || Date.now() - entry.at > 30000) {
    const { data, error } = await db().rpc("backoffice_stats", {
      date_from: new Date(Date.now() - hours * 3600000).toISOString(),
      date_to: new Date().toISOString(),
    });
    if (error) return Response.json({ error: "Unavailable" }, { status: 503 });
    entry = { at: Date.now(), data };
    cache.set(range, entry);
  }
  return Response.json(entry.data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
