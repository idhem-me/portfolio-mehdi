import { requireDashboardSession } from "@/lib/dashboard-auth";
import { db } from "@/lib/backoffice/server";
import { z } from "zod";

export async function GET(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireDashboardSession(r);
  if (denied) return denied;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 400 });
  const { data, error } = await db()
    .from("sessions")
    .select(
      "id,visitor_id,short_label,started_at,last_seen_at,active_ms,mouse_px,scroll_px,clicks,key_presses,brush_strokes,colors_used,games_played,cta_clicks,theme_toggles,lang_changes,pages,games,country,device,browser",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return new Response(null, { status: 404 });
  const { visitor_id, ...safe } = data;
  return Response.json(
    {
      ...safe,
      isMe: visitor_id === r.headers.get("x-visitor-id"),
      isCurrent: id === r.headers.get("x-session-id"),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
