import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/backoffice/request-origin";
import { db, guard, fields } from "@/lib/backoffice/server";
import { z } from "zod";
import { budget, securityFailure } from "@/lib/security/budget";
import {
  issueVisitor,
  verifiedVisitor,
  visitorToken,
  tokenHash,
  VISITOR_COOKIE,
} from "@/lib/security/visitor";
import { securityDb } from "@/lib/security/database";

export async function POST(r: Request) {
  const denied = guard(r);
  if (denied) return denied;
  if (!r.headers.get("origin") || !isSameOrigin(r))
    return new Response(null, { status: 403 });
  try {
    await budget(r, "visitor-issue", { global: 300, network: 10 });
    return await issueVisitor(r);
  } catch (error) {
    return securityFailure(error);
  }
}
export async function GET(r: Request) {
  const denied = guard(r);
  if (denied) return denied;
  try {
    const id = await verifiedVisitor(r);
    if (!id) return new Response(null, { status: 401 });
    await budget(r, "visitor-read", {
      global: 2000,
      network: 120,
      user: id,
      perUser: 60,
    });
    const { data, error } = await db()
      .from("sessions")
      .select([...fields, "pages"].join(","))
      .eq("visitor_id", id);
    if (error) throw new Error("Unavailable");
    const totals: Record<string, number> = {};
    for (const entry of data || []) {
      const row = entry as unknown as Record<string, unknown>;
      for (const key of fields)
        totals[key] = (totals[key] || 0) + Number(row[key] || 0);
      totals.pages =
        (totals.pages || 0) +
        Object.values((row.pages || {}) as Record<string, number>).reduce(
          (a, b) => a + Number(b),
          0,
        );
    }
    const batch = z.uuid().safeParse(r.headers.get("x-pending-batch"));
    const applied = batch.success
      ? await db()
          .from("backoffice_batches")
          .select("id")
          .eq("id", batch.data)
          .eq("visitor_id", id)
          .maybeSingle()
      : null;
    if (applied?.error) throw new Error("Unavailable");
    return Response.json(
      { ...totals, pending_applied: !!applied?.data },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return securityFailure(error);
  }
}
export async function DELETE(r: Request) {
  if (!r.headers.get("origin") || !isSameOrigin(r))
    return new Response(null, { status: 403 });
  try {
    await budget(r, "visitor-delete", { global: 300, network: 20 });
    const token = visitorToken(r);
    // An absent cookie is an idempotent no-op, never permission to delete a header UUID.
    if (token) {
      const { error } = await securityDb().rpc("security_delete_visitor", {
        p_hash: tokenHash(token),
      });
      if (error) throw new Error("Unavailable");
    }
    const response = new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
    response.cookies.set(VISITOR_COOKIE, "", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/api",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return securityFailure(error);
  }
}
