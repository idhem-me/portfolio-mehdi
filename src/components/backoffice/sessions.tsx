"use client";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetcher, distance, type Row } from "./data";
export function Sessions() {
  const t = useTranslations("backoffice"),
    locale = useLocale(),
    router = useRouter(),
    path = usePathname(),
    search = useSearchParams(),
    mobile = useIsMobile();
  const [selected, setSelected] = useState<Row | null>(null);
  const [now] = useState(() => Date.now());
  const query = new URLSearchParams(search.toString());
  if (!query.has("from"))
    query.set("from", new Date(now - 7 * 86400000).toISOString());
  const { data, error, mutate } = useSWR<{
    rows: Row[];
    total: number;
    options?: { countries: string[]; paths: string[] };
  }>("/api/backoffice/sessions?" + query, fetcher, { refreshInterval: 30000 });
  const page = Number(search.get("page") || 1);
  function update(k: string, v: string) {
    const p = new URLSearchParams(search.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.delete("page");
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
  const index = data?.rows.findIndex((r) => r.id === selected?.id) ?? -1;
  async function adjacent(direction: number) {
    if (!data) return;
    const next = index + direction;
    if (next >= 0 && next < data.rows.length) {
      setSelected(data.rows[next]);
      return;
    }
    const nextPage = page + direction;
    if (nextPage < 1 || nextPage > Math.ceil(data.total / 20)) return;
    const params = new URLSearchParams(query);
    params.set("page", String(nextPage));
    const result = await fetcher("/api/backoffice/sessions?" + params);
    if (result.rows.length) {
      update("page", String(nextPage));
      setSelected(
        direction > 0 ? result.rows[0] : result.rows[result.rows.length - 1],
      );
    }
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
        <h3 className="mt-8 font-semibold">{t("games_played")}</h3>
        {selected.games.map((g, i) => (
          <p key={i}>
            {g.game} · {g.score}
          </p>
        ))}
        <p className="mt-6">
          {selected.country || t("unknown")} · {selected.device}
        </p>
      </div>
      <footer className="flex gap-3 border-t p-4">
        <Button
          className="flex-1"
          variant="outline"
          disabled={index <= 0 && page <= 1}
          onClick={() => void adjacent(-1)}
        >
          {t("previous")}
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={
            !data || (index >= data.rows.length - 1 && page * 20 >= data.total)
          }
          onClick={() => void adjacent(1)}
        >
          {t("next")}
        </Button>
      </footer>
    </>
  );
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t("sessions")}</h1>
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {["from", "to"].map((k) => (
            <div key={k} className="space-y-1.5">
              <label htmlFor={"filter-" + k} className="text-sm font-medium">
                {t(k === "from" ? "fromDate" : "toDate")}
              </label>
              <Input
                id={"filter-" + k}
                type="date"
                value={query.get(k)?.slice(0, 10) || ""}
                onChange={(e) =>
                  update(
                    k,
                    e.target.value
                      ? e.target.value +
                          (k === "to" ? "T23:59:59Z" : "T00:00:00Z")
                      : "",
                  )
                }
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <label htmlFor="filter-country" className="text-sm font-medium">
              {t("country")}
            </label>
            <Select
              id="filter-country"
              label={t("country")}
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
          </div>
          <div className="space-y-1.5">
            <label htmlFor="filter-device" className="text-sm font-medium">
              {t("device")}
            </label>
            <Select
              id="filter-device"
              label={t("device")}
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
          </div>
          <div className="space-y-1.5">
            <label htmlFor="filter-page" className="text-sm font-medium">
              {t("visitedPage")}
            </label>
            <Select
              id="filter-page"
              label={t("visitedPage")}
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
          </div>
          <div className="space-y-1.5">
            <label htmlFor="filter-played" className="text-sm font-medium">
              {t("played")}
            </label>
            <Select
              id="filter-played"
              label={t("played")}
              value={search.get("played") || "all"}
              onValueChange={(v) => update("played", v === "all" ? "" : v)}
              options={[
                { value: "all", label: t("all") },
                { value: "true", label: t("yes") },
                { value: "false", label: t("no") },
              ]}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end border-t pt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.replace(path)}
          >
            <RotateCcw aria-hidden className="size-3.5" />
            {t("reset")}
          </Button>
        </div>
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
      ) : !data ? (
        <div className="min-h-48 flex-1 animate-pulse rounded-xl bg-muted" />
      ) : !data.rows.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">{t("none")}</p>
          <Button variant="outline" onClick={() => router.replace(path)}>
            {t("reset")}
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden min-h-0 flex-1 overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {[
                    "sessions",
                    "started_at",
                    "active_ms",
                    "pages",
                    "clicks",
                    "mouse_px",
                    "games_played",
                    "country",
                    "device",
                    "online",
                  ].map((k) => (
                    <th className="border-b p-3 text-sm font-medium" key={k}>
                      {[
                        "started_at",
                        "active_ms",
                        "clicks",
                        "mouse_px",
                      ].includes(k) ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md py-1 text-start text-sm font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => {
                            const p = new URLSearchParams(search.toString());
                            p.set("sort", k);
                            p.set(
                              "order",
                              search.get("order") === "asc" ? "desc" : "asc",
                            );
                            router.replace(path + "?" + p);
                          }}
                        >
                          {t(k === "started_at" ? "start" : k)} ↕
                        </button>
                      ) : (
                        t(k)
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr
                    key={r.id}
                    className={
                      "border-b " + (r.isCurrent ? "bg-primary/5" : "")
                    }
                  >
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-mx-2.5 justify-start"
                        onClick={() => setSelected(r)}
                      >
                        {r.short_label} {r.isMe && "· " + t("you")}
                      </Button>
                    </td>
                    <td className="p-3">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(r.started_at))}
                    </td>
                    {[
                      "active_ms",
                      "pages",
                      "clicks",
                      "mouse_px",
                      "games_played",
                    ].map((k) => (
                      <td className="p-3" key={k}>
                        {k === "pages"
                          ? Object.values(r.pages).reduce((a, b) => a + b, 0)
                          : metric(r, k)}
                      </td>
                    ))}
                    <td className="p-3">{r.country}</td>
                    <td className="p-3">{r.device}</td>
                    <td className="whitespace-nowrap p-3">
                      {online(r) ? "● " + t("online") : t("ended")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {data.rows.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="block w-full rounded-xl border p-4 text-left"
              >
                <span className="font-medium">
                  {r.short_label} {r.isMe && t("you")}
                </span>
                <span className="float-right text-xs">
                  {online(r) ? t("online") : t("ended")}
                </span>
                <p className="mt-3 text-sm">
                  {metric(r, "active_ms")} · {metric(r, "clicks")} {t("clicks")}{" "}
                  · {metric(r, "mouse_px")}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("previousPage")}
              disabled={page <= 1}
              onClick={() => update("page", String(page - 1))}
            >
              <ArrowLeft aria-hidden className="size-4" />
            </Button>
            <span>
              {page} / {Math.max(1, Math.ceil(data.total / 20))}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("nextPage")}
              disabled={page * 20 >= data.total}
              onClick={() => update("page", String(page + 1))}
            >
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          </div>
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
                {selected?.short_label}
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
            <SheetTitle className="p-6">{selected?.short_label}</SheetTitle>
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
