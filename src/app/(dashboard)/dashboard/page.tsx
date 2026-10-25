"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AnalyticsPeriod,
  AnalyticsSummary,
} from "@/lib/analytics/posthog-server";

function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<AnalyticsPeriod>(7);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (days: AnalyticsPeriod) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/summary?days=${days}`);
      if (res.status === 401) {
        router.replace("/dashboard/login");
        return;
      }
      const json = (await res.json()) as AnalyticsSummary;
      setData(json);
    } catch {
      setData({
        periodDays: days,
        visitors: 0,
        pageviews: 0,
        topPages: [],
        topEvents: [],
        posthogAppUrl: null,
        clarityAppUrl: null,
        vercelAppUrl: null,
        configured: false,
        error: "Impossible de charger les données.",
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Hydration synchronizes browser-only state after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(period);
  }, [load, period]);

  async function logout() {
    await fetch("/api/dashboard/logout", { method: "POST" });
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Aperçu</h1>
          <p className="text-sm text-muted-foreground">
            KPI PostHog + liens vers les consoles complètes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(period)}
            disabled={loading}
          >
            <RefreshCw className="size-3.5" />
            Actualiser
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={logout}>
            <LogOut className="size-3.5" />
            Déconnexion
          </Button>
        </div>
      </div>

      <Tabs
        value={String(period)}
        onValueChange={(v) => setPeriod(v === "30" ? 30 : 7)}
      >
        <TabsList>
          <TabsTrigger value="7">7 jours</TabsTrigger>
          <TabsTrigger value="30">30 jours</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-48 rounded-xl sm:col-span-2" />
        </div>
      ) : null}

      {data?.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>{data.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {data && !data.error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Visiteurs uniques</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatNumber(data.visitors)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{period} j</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pages vues</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatNumber(data.pageviews)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{period} j</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top pages</CardTitle>
                <CardDescription>Chemins les plus visités</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune donnée pour cette période.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.topPages.map((row) => (
                      <li
                        key={row.path}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate font-mono text-xs">
                          {row.path}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(row.views)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top events</CardTitle>
                <CardDescription>Events custom (hors $…)</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun event custom pour cette période.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.topEvents.map((row) => (
                      <li
                        key={row.event}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate">{row.event}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(row.count)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consoles externes</CardTitle>
          <CardDescription>
            Heatmaps, replays et explorations avancées.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data?.posthogAppUrl ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={data.posthogAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ouvrir PostHog
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Définissez NEXT_PUBLIC_POSTHOG_APP_URL pour le lien PostHog.
            </p>
          )}
          {data?.clarityAppUrl ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={data.clarityAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ouvrir Clarity
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Définissez NEXT_PUBLIC_CLARITY_APP_URL pour le lien Clarity.
            </p>
          )}
          {data?.vercelAppUrl ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={data.vercelAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ouvrir Vercel Analytics
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Définissez NEXT_PUBLIC_VERCEL_ANALYTICS_URL pour le lien Vercel.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
