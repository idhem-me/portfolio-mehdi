"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { PokemonBatch } from "./data";

function FilterSelect({ children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className="h-(--control-height) w-full appearance-none rounded-lg border border-input bg-background ps-3 pe-9 text-[length:var(--control-text)] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export function PokemonCatalogue({
  initialBatch,
  generations,
}: {
  initialBatch: PokemonBatch;
  generations: number[];
}) {
  const t = useTranslations("pokemon");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [generation, setGeneration] = useState("all");
  const [shiny, setShiny] = useState(false);
  const types = t.raw("types") as string[];
  const search = query.trim();
  const filters = new URLSearchParams({ locale });
  if (search) filters.set("query", search);
  if (type !== "all") filters.set("type", type);
  if (generation !== "all") filters.set("generation", generation);
  const key = filters.toString();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="pokemon-search" className="block text-sm font-medium">
            {t("search")}
          </label>
          <Input
            id="pokemon-search"
            type="search"
            value={query}
            maxLength={100}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pokemon-type" className="block text-sm font-medium">
            {t("type")}
          </label>
          <FilterSelect
            id="pokemon-type"
            value={type}
            onChange={(event) => setType(event.currentTarget.value)}
          >
            <option value="all">{t("allTypes")}</option>
            {types.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="pokemon-generation"
            className="block text-sm font-medium"
          >
            {t("generation")}
          </label>
          <FilterSelect
            id="pokemon-generation"
            value={generation}
            onChange={(event) => setGeneration(event.currentTarget.value)}
          >
            <option value="all">{t("allGenerations")}</option>
            {generations.map((value) => (
              <option key={value} value={value}>
                {t("generationNumber", { value })}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="catalogue-shiny"
            aria-label={t("shiny")}
            checked={shiny}
            onCheckedChange={setShiny}
          />
          <label htmlFor="catalogue-shiny" className="text-sm font-medium">
            {t("shiny")}
          </label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!query && type === "all" && generation === "all"}
          onClick={() => {
            setQuery("");
            setType("all");
            setGeneration("all");
          }}
        >
          <RotateCcw aria-hidden className="size-3.5" />
          {t("resetFilters")}
        </Button>
      </div>
      <PokemonResults
        key={key}
        filters={key}
        initialBatch={filters.size === 1 ? initialBatch : null}
        shiny={shiny}
        types={types}
      />
    </div>
  );
}

function PokemonResults({
  filters,
  initialBatch,
  shiny,
  types,
}: {
  filters: string;
  initialBatch: PokemonBatch | null;
  shiny: boolean;
  types: string[];
}) {
  const t = useTranslations("pokemon");
  const [batch, setBatch] = useState(initialBatch);
  const [offset, setOffset] = useState<number | null>(initialBatch ? null : 0);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const rows = batch?.rows ?? [];
  const hasMore = !!batch && rows.length < batch.total;

  useEffect(() => {
    if (offset === null || failed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        try {
          const response = await fetch(
            `/api/pokemon?${filters}&offset=${offset}`,
            {
              signal: controller.signal,
            },
          );
          if (!response.ok) throw new Error("Pokémon request failed");
          const next: PokemonBatch = await response.json();
          if (controller.signal.aborted) return;
          setBatch((current) => ({
            rows:
              offset && current ? [...current.rows, ...next.rows] : next.rows,
            total: next.total,
          }));
          setOffset(null);
        } catch {
          if (!controller.signal.aborted) setFailed(true);
        }
      },
      offset === 0 ? 180 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters, offset, failed]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || offset !== null) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          setOffset(rows.length);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, offset, rows.length]);

  return (
    <div className="space-y-3">
      {batch && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("results", { count: batch.total })}
        </p>
      )}
      {batch && rows.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {t("noResults")}
        </p>
      )}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table aria-label={t("title")}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("title")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("type")}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("generation")}
                </TableHead>
                <TableHead className="text-end">
                  <span className="sr-only">{t("play")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => {
                const sprite = (shiny && entry.shiny) || entry.sprite;
                return (
                  <TableRow key={entry.id} className="last:border-b-0">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {sprite && (
                          <Image
                            src={`/pokemon/${sprite}`}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="size-10 shrink-0 object-contain [image-rendering:pixelated]"
                          />
                        )}
                        <div className="min-w-0">
                          <span className="block font-medium [overflow-wrap:anywhere]">
                            {entry.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            #{entry.id}
                          </span>
                          <span className="block text-xs text-muted-foreground sm:hidden">
                            {entry.types.map((id) => types[id - 1]).join(" · ")}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {entry.types.map((id) => types[id - 1]).join(" · ")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entry.generation}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          aria-label={t("playPokemon", { name: entry.name })}
                          href={`/jeux/pokemon/${entry.id}${shiny && entry.shiny ? "?shiny=1" : ""}`}
                          prefetch={false}
                        >
                          {t("play")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {hasMore && (
        <div
          ref={sentinel}
          data-testid="pokemon-load-more"
          className="h-px"
          aria-hidden
        />
      )}
      {failed ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <p role="alert">{t("loadError")}</p>
          <Button variant="outline" size="sm" onClick={() => setFailed(false)}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        offset !== null && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("loading")}
          </p>
        )
      )}
    </div>
  );
}
