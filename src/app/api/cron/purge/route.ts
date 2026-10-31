import { db } from "@/lib/backoffice/server";

export async function GET(r: Request) {
  if (
    !process.env.CRON_SECRET ||
    r.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET
  )
    return new Response(null, { status: 401 });
  const { error } = await db().rpc("purge_backoffice");
  const cleanup = error ? null : await db().rpc("security_cleanup");
  return Response.json(
    { ok: !error && !cleanup?.error },
    {
      status: error || cleanup?.error ? 500 : 200,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
