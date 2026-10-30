import { isSameOrigin } from "@/lib/backoffice/request-origin";
import { db, guard, fields } from "@/lib/backoffice/server";
import { z } from "zod";

export async function GET(r: Request) {
  const denied = guard(r);
  if (denied) return denied;
  const id = z.uuid().safeParse(r.headers.get("x-visitor-id"));
  if (!id.success) return new Response(null, { status: 400 });
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("visitor_id", id.data);
  if (error) return Response.json({ error: "Unavailable" }, { status: 503 });
  const totals: Record<string, number> = {};
  for (const row of data || []) {
    for (const key of fields)
      totals[key] = (totals[key] || 0) + Number(row[key] || 0);
    totals.pages =
      (totals.pages || 0) +
      Object.values(row.pages || {}).reduce<number>((a, b) => a + Number(b), 0);
  }
  const batch = z.uuid().safeParse(r.headers.get("x-pending-batch"));
  const applied = batch.success
    ? await db()
        .from("backoffice_batches")
        .select("id")
        .eq("id", batch.data)
        .maybeSingle()
    : null;
  return Response.json(
    { ...totals, pending_applied: !!applied?.data },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
export async function DELETE(r: Request) {
  if (!isSameOrigin(r)) return new Response(null, { status: 403 });
  const id = z.uuid().safeParse(r.headers.get("x-visitor-id"));
  if (!id.success) return new Response(null, { status: 400 });
  const { error } = await db().rpc("delete_backoffice_visitor", { v: id.data });
  return new Response(null, { status: error ? 500 : 204 });
}
