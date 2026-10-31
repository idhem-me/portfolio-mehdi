import { requireDashboardSession } from "@/lib/dashboard-auth";
import { NextResponse } from "next/server";
import {
  fetchAnalyticsSummary,
  type AnalyticsPeriod,
} from "@/lib/analytics/posthog-server";

export async function GET(request: Request) {
  const denied = await requireDashboardSession(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("days");
  const periodDays: AnalyticsPeriod = raw === "30" ? 30 : 7;

  const summary = await fetchAnalyticsSummary(periodDays);
  return NextResponse.json(summary, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
