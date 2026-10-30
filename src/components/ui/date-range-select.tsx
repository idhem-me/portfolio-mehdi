"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { selectChipTriggerClassName } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function parseYmd(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toYmd(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function DateRangeSelect({
  from,
  to,
  onFromChange,
  onToChange,
  label,
  fromLabel,
  toLabel,
  summary,
  locale,
  clearLabel,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  label: string;
  fromLabel: string;
  toLabel: string;
  summary?: string;
  locale: string;
  clearLabel: string;
}) {
  const empty = !from && !to;
  const selected = useMemo<DateRange | undefined>(
    () => ({
      from: parseYmd(from),
      to: parseYmd(to),
    }),
    [from, to],
  );
  const [month, setMonth] = useState<Date>(
    () => selected?.from ?? selected?.to ?? new Date(),
  );

  function formatHeader(date?: Date) {
    if (!date) return "—";
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={selectChipTriggerClassName}
      >
        <span className="min-w-0 flex-1 truncate text-start">
          {empty ? (
            label
          ) : (
            <>
              <span className="text-muted-foreground">{label}</span>
              <span className="text-muted-foreground">: </span>
              <span>{summary}</span>
            </>
          )}
        </span>
        <ChevronDown
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-auto min-w-[20rem] p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div
          className="border-b border-border px-4 py-3"
          onKeyDown={(event) => event.stopPropagation()}
        >
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {fromLabel}
              </p>
              <p className="mt-0.5 text-sm font-medium tabular-nums">
                {formatHeader(selected?.from)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {toLabel}
              </p>
              <p className="mt-0.5 text-sm font-medium tabular-nums">
                {formatHeader(selected?.to)}
              </p>
            </div>
          </div>
        </div>
        <DayPicker
          mode="range"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(range) => {
            onFromChange(range?.from ? toYmd(range.from) : "");
            onToChange(range?.to ? toYmd(range.to) : "");
          }}
          numberOfMonths={1}
          locale={locale.startsWith("fr") ? fr : undefined}
          className="p-3"
          classNames={{
            months: "relative flex flex-col",
            month: "space-y-3",
            month_caption: "flex items-center justify-center pt-1",
            caption_label: "text-sm font-medium",
            nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
            button_previous: cn(
              "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            ),
            button_next: cn(
              "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            ),
            month_grid: "w-full border-collapse",
            weekdays: "flex",
            weekday:
              "w-9 text-center text-[11px] font-medium text-muted-foreground",
            week: "mt-1 flex w-full",
            day: "relative p-0 text-center text-sm",
            day_button: cn(
              "inline-flex size-9 items-center justify-center rounded-full text-sm outline-none transition-colors",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
            ),
            selected: "bg-transparent",
            range_start: "rounded-l-full bg-primary/15",
            range_end: "rounded-r-full bg-primary/15",
            range_middle: "rounded-none bg-primary/10",
            today: "font-semibold text-accent",
            outside: "text-muted-foreground/40",
            disabled: "text-muted-foreground/30",
            hidden: "invisible",
          }}
          components={{
            Chevron: ({ orientation }) =>
              orientation === "left" ? (
                <ChevronLeft className="size-4" aria-hidden />
              ) : (
                <ChevronRight className="size-4" aria-hidden />
              ),
          }}
          modifiersClassNames={{
            selected:
              "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
            range_start:
              "[&>button]:bg-primary [&>button]:text-primary-foreground",
            range_end:
              "[&>button]:bg-primary [&>button]:text-primary-foreground",
            range_middle: "[&>button]:rounded-none [&>button]:bg-transparent",
          }}
        />
        <div className="flex justify-end border-t border-border px-3 py-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={empty}
            onClick={() => {
              onFromChange("");
              onToChange("");
            }}
          >
            {clearLabel}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
