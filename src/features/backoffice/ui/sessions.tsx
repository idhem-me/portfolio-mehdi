"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Drawer } from "vaul";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableRowButton, TableSortButton,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import {
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
} from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { distance, type Row } from "./data";
import { DateRangeSelect } from "@/components/ui/date-range-select";

import { DEMO_NOW, filterDemoSessions } from "./demo";


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
  const search = useSearchParams();
  return <SessionList key={search.toString()} />;
}
function SessionList() {
  const t = useTranslations("backoffice"),
    locale = useLocale(),
    router = useRouter(),
    path = usePathname(),
    search = useSearchParams(),
    mobile = useIsMobile();
  const [selected, setSelected] = useState<Row | null>(null);
  const [page, setPage] = useState(1);
  const now = DEMO_NOW;
  const sentinel = useRef<HTMLDivElement>(null);
  const query = useMemo(() => {
    const next = new URLSearchParams(search.toString());
    next.delete("page");
    if (!next.has("from"))
      next.set("from", new Date(now - 7 * 86400000).toISOString());
    return next;
  }, [search, now]);
  const data = useMemo(() => filterDemoSessions(query), [query]);
  const rows = data.rows.slice(0, page * 15);
  const hasMore = rows.length < data.total;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setPage((current) => current + 1);
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, page]);

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
  const fromValue = query.get("from")?.slice(0, 10) || "";
  const toValue = query.get("to")?.slice(0, 10) || "";

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
    <div className="@container flex w-full min-w-0 flex-col gap-4">
      <h1 className="text-3xl font-semibold">{t("sessions")}</h1>
      <p className="text-xs text-muted-foreground">{t("demoNotice")}</p>

      <div className="flex min-w-0 flex-wrap items-center gap-2 pb-1 [&>*]:max-w-full">
        <DateRangeSelect
          label={t("date")}
          fromLabel={t("fromDate")}
          toLabel={t("toDate")}
          clearLabel={t("clearDates")}
          locale={locale}
          from={fromValue}
          to={toValue}
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
                new Intl.DisplayNames([locale], { type: "region" }).of(value) ||
                value,
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

      {!rows.length ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">{t("none")}</p>
          <Button variant="outline" onClick={() => router.replace(path)}>
            {t("reset")}
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-clip rounded-xl border @min-[48rem]:block">
            <Table className="table-fixed [overflow-wrap:anywhere]">
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <TableRow>
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
                  ).map(([labelKey, sortKey]) => {
                    const direction =
                      sortKey && search.get("sort") === sortKey
                        ? search.get("order") === "asc" ? "ascending" : "descending"
                        : undefined;
                    return (
                      <TableHead key={labelKey} aria-sort={direction} className="group p-0 first:w-[24%]">
                        {sortKey ? (
                          <TableSortButton
                            direction={direction}
                            revealIconOnHover={!direction}
                            className="h-full min-h-0 w-full max-w-none justify-start gap-1 rounded-none px-1 py-2 text-sm leading-tight"
                            onClick={() => {
                              const p = new URLSearchParams(search.toString());
                              p.set("sort", sortKey);
                              p.set("order", direction === "ascending" ? "desc" : "asc");
                              router.replace(path + "?" + p);
                            }}
                          >
                            {t(labelKey)}
                          </TableSortButton>
                        ) : t(labelKey)}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const id = sessionId(r);
                  const started = new Intl.DateTimeFormat(locale, {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(r.started_at));
                  const isOnline = online(r);
                  return (
                    <TableRow
                      key={r.id}
                      className={r.isCurrent ? "bg-primary/5" : undefined}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-mx-2.5 h-auto max-w-full flex-col items-start gap-0.5 whitespace-normal py-1.5 text-start"
                          onClick={() => setSelected(r)}
                        >
                          <span>
                            {id}
                            {r.isMe ? " · " + t("you") : ""}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {started}
                          </span>
                        </Button>
                      </TableCell>
                      {["active_ms", "pages", "clicks", "mouse_px"].map((k) => (
                        <TableCell key={k}>
                          {k === "pages"
                            ? Object.values(r.pages).reduce((a, b) => a + b, 0)
                            : metric(r, k)}
                        </TableCell>
                      ))}
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block size-2.5 rounded-full",
                            isOnline ? "bg-success" : "bg-destructive",
                          )}
                          title={isOnline ? t("online") : t("offline")}
                          aria-label={isOnline ? t("online") : t("offline")}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 @min-[48rem]:hidden">
            {rows.map((r) => {
              const isOnline = online(r);
              return (
                <TableRowButton
                  key={r.id}
                  onClick={() => setSelected(r)}
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
                  <span className="mt-3 block text-sm">
                    {metric(r, "active_ms")} · {metric(r, "clicks")}{" "}
                    {t("clicks")} · {metric(r, "mouse_px")}
                  </span>
                </TableRowButton>
              );
            })}
          </div>
          {hasMore ? (
            <div
              ref={sentinel}
              className="flex justify-center pt-1"
              data-testid="session-load-more"
            >
              <Button
                variant="outline"
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
