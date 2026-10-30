import { db, guard } from "@/lib/backoffice/server";

export async function GET(r: Request) {
  const denied = guard(r);
  if (denied) return denied;
  const p = new URL(r.url).searchParams;
  const page = Math.max(1, Math.min(100000, Number(p.get("page")) || 1));
  let q = db()
    .from("sessions")
    .select(
      "id,visitor_id,short_label,started_at,last_seen_at,active_ms,mouse_px,scroll_px,clicks,key_presses,brush_strokes,colors_used,games_played,cta_clicks,theme_toggles,lang_changes,pages,games,country,device,browser",
      { count: "exact" },
    );
  for (const k of ["country", "device"]) if (p.get(k)) q = q.eq(k, p.get(k)!);
  for (const k of ["from", "to"])
    if (p.get(k)) {
      if (!Number.isFinite(Date.parse(p.get(k)!)))
        return new Response(null, { status: 400 });
      q =
        k === "from"
          ? q.gte("started_at", p.get(k)!)
          : q.lte("started_at", p.get(k)!);
    }
  if (p.get("visitedPath"))
    q = q.not("pages->" + JSON.stringify(p.get("visitedPath")), "is", null);
  if (p.get("played") === "true") q = q.gt("games_played", 0);
  if (p.get("played") === "false") q = q.eq("games_played", 0);
  const sort = p.get("sort") || "started_at";
  if (!["started_at", "active_ms", "clicks", "mouse_px"].includes(sort))
    return new Response(null, { status: 400 });
  const { data, error, count } = await q
    .order(sort, { ascending: p.get("order") === "asc" })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (error) return Response.json({ error: "Unavailable" }, { status: 503 });
  const { data: options } = await db().rpc("backoffice_filter_options");
  return Response.json(
    {
      options,
      rows: (data || []).map(({ visitor_id, ...row }) => ({
        ...row,
        isMe: visitor_id === r.headers.get("x-visitor-id"),
        isCurrent: row.id === r.headers.get("x-session-id"),
      })),
      total: count,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
