"use client";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import useSWR from "swr";
import { useLocale, useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  CartesianGrid,
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
  const deviceChartData = useMemo(
    () =>
      data?.devices.map((device) => ({
        ...device,
        label: ["desktop", "mobile", "tablet"].includes(device.label)
          ? t("deviceLabels." + device.label)
          : device.label,
      })) ?? [],
    [data?.devices, t],
  );
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
  const reducedMotion = useReducedMotion();
  const gradientId = useId().replaceAll(":", "");
  const chartColors = [
    "var(--primary)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ];
  const tooltipStyle = {
    background: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  };
  const dateLabel = (label: string) => {
    const date = new Date(label);
    return Number.isNaN(date.getTime())
      ? label
      : new Intl.DateTimeFormat(
          locale,
          range === "24h"
            ? { hour: "2-digit" }
            : { day: "numeric", month: "short" },
        ).format(date);
  };
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("dashboard")}
        </h1>
        <div className="flex w-36 flex-col items-end gap-1.5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            <span className="tabular-nums">
              {data?.online ?? "—"} {t("online")}
            </span>
          </span>
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
      </header>
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm"
        >
          {t("error")}{" "}
          <Button variant="outline" onClick={() => mutate()}>
            {t("retry")}
          </Button>
        </div>
      ) : !data ? (
        <div className="grid gap-3" role="status" aria-label={t("dashboard")}>
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : null}
      {data && (
        <>
          <Card size="sm" className="gap-0 py-0">
            <div className="grid grid-cols-2 divide-border sm:grid-cols-3 xl:grid-cols-6">
              {metrics.map((k) => {
                const prev = data.previous?.[k];
                const delta = prev
                  ? ((data.current[k] - prev) / prev) * 100
                  : null;
                const Trend =
                  delta !== null && delta < 0 ? ArrowDownRight : ArrowUpRight;
                return (
                  <div
                    key={k}
                    className="min-w-0 border-b border-r p-4 xl:border-b-0 last:border-r-0"
                  >
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={t(k)}
                    >
                      {t(k)}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                      {value(k, data.current[k])}
                    </p>
                    {delta !== null ? (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Trend className="size-3" aria-hidden />
                        <span className="tabular-nums">
                          {number(Math.abs(delta))}%
                        </span>
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="grid gap-3 lg:grid-cols-3">
            <Card size="sm" className="min-w-0 lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("sessions")}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {t("ranges." + range)}
                </span>
              </CardHeader>
              <CardContent>
                <div
                  className="h-[190px] min-w-0"
                  role="img"
                  aria-label={t("sessions")}
                >
                  {data.series.length ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                    >
                      <AreaChart
                        data={data.series}
                        margin={{ top: 12, right: 8, bottom: 0, left: -18 }}
                      >
                        <defs>
                          <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--primary)"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--primary)"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          vertical={false}
                          stroke="var(--border)"
                          strokeDasharray="3 4"
                        />
                        <XAxis
                          dataKey="label"
                          tickFormatter={dateLabel}
                          minTickGap={36}
                          tick={{
                            fill: "var(--muted-foreground)",
                            fontSize: 10,
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{
                            fill: "var(--muted-foreground)",
                            fontSize: 10,
                          }}
                          tickLine={false}
                          axisLine={false}
                          width={44}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelFormatter={(label) => dateLabel(String(label))}
                          formatter={(n) => [number(Number(n)), t("sessions")]}
                          cursor={{
                            stroke: "var(--muted-foreground)",
                            strokeDasharray: "3 4",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          name={t("sessions")}
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          fill={`url(#${gradientId})`}
                          dot={false}
                          activeDot={{
                            r: 4,
                            stroke: "var(--background)",
                            strokeWidth: 2,
                          }}
                          isAnimationActive={!reducedMotion}
                          animationDuration={650}
                          animationEasing="ease-out"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState label={t("none")} />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card size="sm" className="min-w-0">
              <CardHeader>
                <CardTitle>{t("devices")}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.devices.some((device) => device.value > 0) ? (
                  <>
                    <div
                      className="h-[135px]"
                      role="img"
                      aria-label={t("devices")}
                    >
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minWidth={0}
                      >
                        <PieChart>
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(n) => number(Number(n))}
                          />
                          <Pie
                            data={deviceChartData}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={43}
                            outerRadius={61}
                            paddingAngle={3}
                            cornerRadius={3}
                            stroke="var(--card)"
                            isAnimationActive={!reducedMotion}
                            animationDuration={650}
                          >
                            {data.devices.map((device, i) => (
                              <Cell
                                key={device.label}
                                fill={chartColors[i % chartColors.length]}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1.5">
                      {data.devices.map((device, i) => (
                        <li
                          key={device.label}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{
                              background: chartColors[i % chartColors.length],
                            }}
                            aria-hidden
                          />
                          <span className="text-muted-foreground">
                            {["desktop", "mobile", "tablet"].includes(
                              device.label,
                            )
                              ? t("deviceLabels." + device.label)
                              : device.label}
                          </span>
                          <span className="ml-auto tabular-nums">
                            {number(device.value)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="h-[190px]">
                    <EmptyState label={t("none")} />
                  </div>
                )}
              </CardContent>
            </Card>
            {(["pages", "countries"] as const).map((key) => (
              <Card size="sm" key={key} className="min-w-0">
                <CardHeader>
                  <CardTitle>{t(key)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[205px] overflow-y-auto">
                    {data[key].length ? (
                      <ul className="divide-y divide-border">
                        {data[key].map((point) => (
                          <li key={point.label} className="py-2 first:pt-0">
                            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                              <span className="truncate" title={point.label}>
                                {point.label || t("unknown")}
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {number(point.value)}
                              </span>
                            </div>
                            <div className="h-0.5 rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${(Math.max(0, point.value) / Math.max(1, ...data[key].map((item) => item.value))) * 100}%`,
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState label={t("none")} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card size="sm" className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("mine")}</CardTitle>
                <Activity
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    "mouse_px",
                    "clicks",
                    "active_ms",
                    "pages",
                    "games_played",
                    "brush_strokes",
                  ].map((k) => (
                    <div key={k}>
                      <dt className="text-[11px] text-muted-foreground">
                        {t(k)}
                      </dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {value(
                          k,
                          (me?.[k] || 0) +
                            Math.max(
                              0,
                              (live[k] || 0) - (me?.localSnapshot?.[k] || 0),
                            ),
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="border-t pt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {t("since")}
                </p>
                {me &&
                  data.current.mouse_px > 0 &&
                  data.current.sessions > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("comparison", {
                        ratio: number(
                          (me.mouse_px || 0) /
                            (data.current.mouse_px / data.current.sessions),
                        ),
                      })}
                    </p>
                  )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
      {label}
    </p>
  );
}
