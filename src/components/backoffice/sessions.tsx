"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import useSWR from "swr";
import { Drawer } from "vaul";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Select } from "@/components/ui/select";
import {
  ArrowUpDown,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
} from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { fetcher, distance, type Row } from "./data";
import { DateRangeSelect } from "@/components/ui/date-range-select";

const SORTABLE = ["started_at", "active_ms", "clicks", "mouse_px"] as const;

function sessionId(row: Row) {
  const match = row.short_label.match(/#[A-Za-z0-9]+/);
  return match?.[0] ?? row.id.slice(0, 8);
}

function DeviceIcon({
  device,
  className,
}: {
  device: string;
  className?: string;
}) {
  const Icon =
    device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Monitor;
  return (
    <Icon
      className={cn("size-4 text-muted-foreground", className)}
      aria-hidden
    />
  );
}

function CountryFlag({
  country,
  locale,
  className,
}: {
  country: string | null | undefined;
  locale: string;
  className?: string;
}) {
  if (!country) {
    return (
      <span
        className={cn(
          "inline-flex size-4 items-center justify-center text-xs font-medium text-muted-foreground",
          className,
        )}
        aria-label="?"
      >
        ?
      </span>
    );
  }
  const name =
    new Intl.DisplayNames([locale], { type: "region" }).of(country) || country;
  return (
    <ReactCountryFlag
      countryCode={country}
      svg
      style={{ width: "1.15em", height: "1.15em" }}
      className={className}
      aria-label={name}
      title={name}
    />
  );
}

export function Sessions() {
  const t = useTranslations("backoffice"),
    locale = useLocale(),
    router = useRouter(),
    path = usePathname(),
    search = useSearchParams(),
    mobile = useIsMobile();
  const [selected, setSelected] = useState<Row | null>(null);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [now] = useState(() => Date.now());
  const query = useMemo(() => {
    const next = new URLSearchParams(search.toString());
    next.delete("page");
    if (!next.has("from"))
      next.set("from", new Date(now - 7 * 86400000).toISOString());
    return next;
  }, [search, now]);
  const filterKey = query.toString();
  const { data, error, mutate, isValidating } = useSWR<{
    rows: Row[];
    total: number;
    options?: { countries: string[]; paths: string[] };
  }>("/api/backoffice/sessions?" + filterKey + "&page=" + page, fetcher, {
    refreshInterval: 30000,
  });

  useEffect(() => {
    setPage(1);
    setRows([]);
  }, [filterKey]);

  useEffect(() => {
    if (!data) return;
    setRows((previous) =>
      page === 1 ? data.rows : mergeRows(previous, data.rows),
    );
    // Appliquer uniquement quand la réponse SWR change — pas au seul setPage,
    // sinon la page N réutiliserait encore les rows de N-1.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- page lu volontairement au moment du fetch résolu
  }, [data]);

  function update(k: string, v: string) {
    const p = new URLSearchParams(search.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    p.delete("page");
    router.replace(path + "?" + p.toString(), { scroll: false });
  }
  const online = (r: Row) => now - Date.parse(r.last_seen_at) < 120000;
  const metric = (r: Row, k: string) =>
    k === "mouse_px"
      ? distance(Number(r[k]), locale)
      : k === "active_ms"
        ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
            Number(r[k]) / 60000,
          ) + " min"
        : new Intl.NumberFormat(locale).format(Number(r[k]) || 0);
  const index = rows.findIndex((r) => r.id === selected?.id);
  const total = data?.total ?? 0;
  const hasMore = rows.length < total;
  const fromValue = query.get("from")?.slice(0, 10) || "";
  const toValue = query.get("to")?.slice(0, 10) || "";
  const dateSummary = formatDateSummary(fromValue, toValue, locale);

  function adjacent(direction: number) {
    const next = index + direction;
    if (next >= 0 && next < rows.length) setSelected(rows[next]);
  }

  const content = selected && (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-5">
          {[
            "active_ms",
            "mouse_px",
            "clicks",
            "key_presses",
            "brush_strokes",
            "colors_used",
            "games_played",
            "cta_clicks",
            "theme_toggles",
            "lang_changes",
          ].map((k) => (
            <div key={k}>
              <p className="text-xs text-muted-foreground">
                {t.has(k) ? t(k) : k}
              </p>
              <p className="text-xl">{metric(selected, k)}</p>
            </div>
          ))}
        </div>
        <h3 className="mt-8 font-semibold">{t("pages")}</h3>
        {Object.entries(selected.pages).map(([p, n]) => (
          <p className="mt-2 flex justify-between" key={p}>
            <span>{p}</span>
            <span>{n}</span>
          </p>
        ))}
        {selected.games.length > 0 ? (
          <>
            <h3 className="mt-8 font-semibold">{t("games_played")}</h3>
            {selected.games.map((g, i) => (
              <p key={i}>
                {g.game} · {g.score}
              </p>
            ))}
          </>
        ) : null}
        <div className="mt-8 flex items-center gap-3 text-muted-foreground">
          <CountryFlag country={selected.country} locale={locale} />
          <span className="inline-flex items-center gap-1.5">
            <DeviceIcon device={selected.device} className="size-4" />
            <span className="sr-only">
              {t.has("deviceLabels." + selected.device)
                ? t("deviceLabels." + selected.device)
                : selected.device}
            </span>
          </span>
        </div>
      </div>
      <footer className="flex gap-3 border-t p-4">
        <Button
          className="flex-1"
          variant="outline"
          disabled={index <= 0}
          onClick={() => adjacent(-1)}
        >
          {t("previous")}
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={index < 0 || index >= rows.length - 1}
          onClick={() => adjacent(1)}
        >
          {t("next")}
        </Button>
      </footer>
    </>
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="text-3xl font-semibold">{t("sessions")}</h1>

      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
        <DateRangeSelect
          label={t("date")}
          fromLabel={t("fromDate")}
          toLabel={t("toDate")}
          clearLabel={t("clearDates")}
          locale={locale}
          from={fromValue}
          to={toValue}
          summary={dateSummary}
          onFromChange={(value) =>
            update("from", value ? value + "T00:00:00Z" : "")
          }
          onToChange={(value) =>
            update("to", value ? value + "T23:59:59Z" : "")
          }
        />
        <Select
          variant="chip"
          id="filter-country"
          label={t("country")}
          placeholder="all"
          value={search.get("country") || "all"}
          onValueChange={(v) => update("country", v === "all" ? "" : v)}
          options={[
            { value: "all", label: t("allCountries") },
            ...Array.from(
              new Set([
                ...(data?.options?.countries || []),
                ...(search.get("country") ? [search.get("country")!] : []),
              ]),
            ).map((value) => ({
              value,
              label:
                new Intl.DisplayNames([locale], { type: "region" }).of(
                  value,
                ) || value,
            })),
          ]}
        />
        <Select
          variant="chip"
          id="filter-device"
          label={t("device")}
          placeholder="all"
          value={search.get("device") || "all"}
          onValueChange={(v) => update("device", v === "all" ? "" : v)}
          options={[
            { value: "all", label: t("allDevices") },
            ...["desktop", "mobile", "tablet"].map((value) => ({
              value,
              label: t("deviceLabels." + value),
            })),
          ]}
        />
        <Select
          variant="chip"
          id="filter-page"
          label={t("visitedPage")}
          placeholder="all"
          value={search.get("visitedPath") || "all"}
          onValueChange={(v) => update("visitedPath", v === "all" ? "" : v)}
          options={[
            { value: "all", label: t("allPages") },
            ...Array.from(
              new Set([
                ...(data?.options?.paths || []),
                ...(search.get("visitedPath")
                  ? [search.get("visitedPath")!]
                  : []),
              ]),
            ).map((value) => ({ value, label: value })),
          ]}
        />
        <Button
          size="sm"
          variant="ghost"
          className="ms-auto shrink-0"
          onClick={() => router.replace(path)}
        >
          <RotateCcw aria-hidden className="size-3.5" />
          <span className="sr-only sm:not-sr-only">{t("reset")}</span>
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4 text-sm"
        >
          {t("error")}
          <Button variant="outline" onClick={() => mutate()}>
            {t("retry")}
          </Button>
        </div>
      ) : !data && rows.length === 0 ? (
        <div className="min-h-48 animate-pulse rounded-xl bg-muted" />
      ) : !rows.length ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">{t("none")}</p>
          <Button variant="outline" onClick={() => router.replace(path)}>
            {t("reset")}
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr>
                  {(
                    [
                      ["sessions", "started_at"],
                      ["active_ms", "active_ms"],
                      ["pages", null],
                      ["clicks", "clicks"],
                      ["mouse_px", "mouse_px"],
                      ["country", null],
                      ["device", null],
                      ["status", null],
                    ] as const
                  ).map(([labelKey, sortKey]) => (
                    <th
                      className="group/col border-b border-border p-3 text-sm font-medium text-muted-foreground"
                      key={labelKey}
                    >
                      {sortKey &&
                      SORTABLE.includes(
                        sortKey as (typeof SORTABLE)[number],
                      ) ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md py-1 text-start text-sm font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => {
                            const p = new URLSearchParams(search.toString());
                            p.set("sort", sortKey);
                            p.set(
                              "order",
                              search.get("sort") === sortKey &&
                                search.get("order") === "asc"
                                ? "desc"
                                : "asc",
                            );
                            router.replace(path + "?" + p);
                          }}
                        >
                          {t(labelKey)}
                          <ArrowUpDown
                            className={cn(
                              "size-3.5 shrink-0 opacity-0 transition-opacity group-hover/col:opacity-100 group-focus-within/col:opacity-100",
                              search.get("sort") === sortKey && "opacity-100",
                            )}
                            aria-hidden
                          />
                        </button>
                      ) : (
                        t(labelKey)
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const id = sessionId(r);
                  const started = new Intl.DateTimeFormat(locale, {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(r.started_at));
                  const isOnline = online(r);
                  return (
                    <tr
                      key={r.id}
                      className={
                        "border-b border-border " +
                        (r.isCurrent ? "bg-primary/5" : "")
                      }
                    >
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-mx-2.5 h-auto flex-col items-start gap-0.5 py-1.5 text-start"
                          onClick={() => setSelected(r)}
                        >
                          <span>
                            {id}
                            {r.isMe ? " · " + t("you") : ""}
                          </span>
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {started}
                          </span>
                        </Button>
                      </td>
                      {["active_ms", "pages", "clicks", "mouse_px"].map(
                        (k) => (
                          <td className="p-3" key={k}>
                            {k === "pages"
                              ? Object.values(r.pages).reduce((a, b) => a + b, 0)
                              : metric(r, k)}
                          </td>
                        ),
                      )}
                      <td className="p-3">
                        {r.country ? (
                          <span className="inline-flex items-center gap-2">
                            <CountryFlag country={r.country} locale={locale} />
                            <span className="text-muted-foreground">
                              {r.country}
                            </span>
                          </span>
                        ) : (
                          <CountryFlag country={r.country} locale={locale} />
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className="inline-flex"
                          title={
                            t.has("deviceLabels." + r.device)
                              ? t("deviceLabels." + r.device)
                              : r.device
                          }
                        >
                          <DeviceIcon device={r.device} />
                          <span className="sr-only">
                            {t.has("deviceLabels." + r.device)
                              ? t("deviceLabels." + r.device)
                              : r.device}
                          </span>
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-block size-2.5 rounded-full",
                            isOnline ? "bg-success" : "bg-destructive",
                          )}
                          title={isOnline ? t("online") : t("offline")}
                          aria-label={isOnline ? t("online") : t("offline")}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((r) => {
              const isOnline = online(r);
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="block w-full rounded-xl border p-4 text-left"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="font-medium">{sessionId(r)}</span>
                      {r.isMe ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {t("you")}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(r.started_at))}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <CountryFlag country={r.country} locale={locale} />
                      <DeviceIcon device={r.device} />
                      <span
                        className={cn(
                          "inline-block size-2.5 rounded-full",
                          isOnline ? "bg-success" : "bg-destructive",
                        )}
                        aria-label={isOnline ? t("online") : t("offline")}
                      />
                    </span>
                  </span>
                  <p className="mt-3 text-sm">
                    {metric(r, "active_ms")} · {metric(r, "clicks")}{" "}
                    {t("clicks")} · {metric(r, "mouse_px")}
                  </p>
                </button>
              );
            })}
          </div>
          {hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                disabled={isValidating}
                onClick={() => setPage((current) => current + 1)}
              >
                {t("loadMore")}
              </Button>
            </div>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            {t("resultsCount", { count: total })}
          </p>
        </>
      )}
      {mobile ? (
        <Drawer.Root
          open={!!selected}
          onOpenChange={(o) => {
            if (!o) setSelected(null);
          }}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl bg-background">
              <Drawer.Title className="p-6 font-semibold">
                {selected ? sessionId(selected) : null}
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                {t("sessions")}
              </Drawer.Description>
              <Drawer.Close
                className="absolute right-4 top-4"
                aria-label={t("close")}
              >
                ×
              </Drawer.Close>
              {content}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <Sheet
          open={!!selected}
          onOpenChange={(o) => {
            if (!o) setSelected(null);
          }}
        >
          <SheetContent className="inset-y-3 right-3 flex h-auto flex-col gap-0 rounded-xl p-0 sm:max-w-lg">
            <SheetTitle className="p-6">
              {selected ? sessionId(selected) : null}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t("sessions")}
            </SheetDescription>
            {content}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function mergeRows(previous: Row[], next: Row[]) {
  const seen = new Set(previous.map((row) => row.id));
  return [...previous, ...next.filter((row) => !seen.has(row.id))];
}

function formatDateSummary(from: string, to: string, locale: string) {
  const format = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
    }).format(new Date(value + "T00:00:00"));
  if (from && to) return format(from) + " – " + format(to);
  if (from) return format(from);
  if (to) return format(to);
  return "";
}
