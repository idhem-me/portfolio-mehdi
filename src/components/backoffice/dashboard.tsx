"use client";
import { useState, useSyncExternalStore } from "react";
import useSWR from "swr";
import { useLocale, useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { track } from "@/lib/tracking/client";
import { fetcher, distance } from "./data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
type Point = { label: string; value: number };
type Stats = {
  current: Record<string, number>;
  previous: Record<string, number> | null;
  online: number;
  series: Point[];
  pages: Point[];
  devices: Point[];
  countries: Point[];
};
function subscribeLive(notify: () => void) {
  const timer = setInterval(notify, 1000);
  return () => clearInterval(timer);
}
export function Dashboard() {
  const live = JSON.parse(
    useSyncExternalStore(
      subscribeLive,
      () => JSON.stringify(track.snapshot().total),
      () => "{}",
    ),
  ) as Record<string, number>;
  const t = useTranslations("backoffice"),
    locale = useLocale();
  const [range, setRange] = useState("7d");
  const { data, error, mutate } = useSWR<Stats>(
    "/api/backoffice/stats?range=" + range,
    fetcher,
    { refreshInterval: 30000 },
  );
  const { data: me } = useSWR<
    Record<string, number> & { localSnapshot?: Record<string, number> }
  >("/api/backoffice/me", fetcher, { refreshInterval: 30000 });
  const number = (n: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n || 0);
  const value = (k: string, n: number) =>
    k === "mouse_px"
      ? distance(n || 0, locale)
      : k === "active_ms"
        ? number(n / 60000) + " min"
        : number(n);
  const metrics = [
    "visitors",
    "sessions",
    "active_ms",
    "mouse_px",
    "clicks",
    "games_played",
  ];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <div className="w-36">
          <Select
            label={t("period")}
            value={range}
            onValueChange={setRange}
            options={["24h", "7d", "30d", "90d"].map((value) => ({
              value,
              label: t("ranges." + value),
            }))}
          />
        </div>
        <span className="text-sm">
          ● {data?.online || 0} {t("online")}
        </span>
      </header>
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4 text-sm"
        >
          {t("error")}{" "}
          <Button variant="outline" onClick={() => mutate()}>
            {t("retry")}
          </Button>
        </div>
      ) : !data ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : null}
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle>{t("mine")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("since")}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {[
            "mouse_px",
            "clicks",
            "active_ms",
            "pages",
            "games_played",
            "brush_strokes",
          ].map((k) => (
            <div key={k}>
              <p className="text-sm text-muted-foreground">{t(k)}</p>
              <p className="text-2xl font-semibold">
                {value(
                  k,
                  (me?.[k] || 0) +
                    Math.max(0, (live[k] || 0) - (me?.localSnapshot?.[k] || 0)),
                )}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      {data && me && data.current.mouse_px > 0 && data.current.sessions > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("comparison", {
            ratio: new Intl.NumberFormat(locale, {
              maximumFractionDigits: 1,
            }).format(
              (me.mouse_px || 0) /
                (data.current.mouse_px / data.current.sessions),
            ),
          })}
        </p>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((k) => {
              const prev = data.previous?.[k],
                delta = prev ? ((data.current[k] - prev) / prev) * 100 : null;
              return (
                <Card key={k}>
                  <CardHeader>
                    <CardTitle className="text-sm">{t(k)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {value(k, data.current[k])}
                    </p>
                    <p
                      className={
                        delta !== null && delta >= 0
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }
                    >
                      {delta === null
                        ? t("history")
                        : (delta >= 0 ? "↑ " : "↓ ") +
                          number(Math.abs(delta)) +
                          "%"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(["series", "pages", "devices", "countries"] as const).map(
              (key) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>
                      {t(key === "series" ? "sessions" : key)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {key === "countries" ? (
                        <ul className="space-y-3">
                          {data.countries.map((p) => (
                            <li key={p.label}>
                              {p.label}{" "}
                              <span className="float-right">
                                {number(p.value)}
                              </span>
                              <progress
                                className="w-full accent-primary"
                                value={p.value}
                                max={Math.max(
                                  1,
                                  ...data.countries.map((c) => c.value),
                                )}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          {key === "series" ? (
                            <AreaChart data={data.series}>
                              <XAxis dataKey="label" hide />
                              <Tooltip />
                              <Area
                                dataKey="value"
                                stroke="var(--primary)"
                                fill="var(--primary)"
                                fillOpacity={0.15}
                              />
                            </AreaChart>
                          ) : key === "pages" ? (
                            <BarChart
                              data={data.pages}
                              layout="vertical"
                              margin={{ left: 60 }}
                            >
                              <XAxis type="number" hide />
                              <YAxis
                                dataKey="label"
                                type="category"
                                width={100}
                              />
                              <Tooltip />
                              <Bar dataKey="value" fill="var(--primary)" />
                            </BarChart>
                          ) : (
                            <PieChart>
                              <Tooltip />
                              <Pie
                                data={data.devices}
                                dataKey="value"
                                nameKey="label"
                                innerRadius={55}
                              >
                                {data.devices.map((p, i) => (
                                  <Cell
                                    key={p.label}
                                    fill={
                                      [
                                        "var(--primary)",
                                        "var(--muted-foreground)",
                                        "var(--border)",
                                      ][i % 3]
                                    }
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
