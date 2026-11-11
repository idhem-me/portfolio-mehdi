"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EllipsisVertical, Heart, LayoutGrid, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { safeWebUrl, type GiftItem } from "../types";
import { GiftImage } from "./shared";

type View = "grid" | "table";
type Density = "auto" | "desktop" | "mobile";

const subscribe = () => () => {};

export function useGiftView(role: "creator" | "visitor") {
  const key = `gift-list-view:${role}`;
  const [choice, setChoice] = useState<View>();
  const saved = useSyncExternalStore<View>(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === "table" ? "table" : "grid";
      } catch {
        return "grid";
      }
    },
    () => "grid",
  );
  function change(view: View) {
    setChoice(view);
    try {
      localStorage.setItem(key, view);
    } catch {
      // The current page still uses the selected view.
    }
  }
  return [choice ?? saved, change] as const;
}

export function GiftViewSwitch({
  view,
  onChange,
  id,
}: {
  view: View;
  onChange: (view: View) => void;
  id?: string;
}) {
  const t = useTranslations("giftViews");
  const locale = useLocale();
  return (
    <div
      id={id}
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      role="group"
      aria-label={t("view")}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-muted p-1"
    >
      {(
        [
          { value: "grid", Icon: LayoutGrid },
          { value: "table", Icon: Table2 },
        ] as const
      ).map(({ value, Icon }) => (
        <Button
          key={value}
          type="button"
          variant={view === value ? "secondary" : "ghost"}
          aria-pressed={view === value}
          onClick={() => onChange(value)}
        >
          <Icon aria-hidden="true" />
          {t(value)}
        </Button>
      ))}
    </div>
  );
}

export type GiftAction = {
  kind: "edit" | "delete" | "reserve" | "contribute";
  run: (trigger: HTMLButtonElement) => void;
};

function GiftActionMenu({
  item,
  actions,
}: {
  item: GiftItem;
  actions: GiftAction[];
}) {
  const t = useTranslations("giftViews");
  const locale = useLocale();
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = useRef<GiftAction | null>(null);
  const href = safeWebUrl(item.url);
  if (!href && !actions.length) return null;
  return (
    <DropdownMenu dir={locale === "ar" ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={trigger}
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={t("actionsFor", { title: item.title })}
        >
          <EllipsisVertical className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        lang={locale}
        align="end"
        className="w-max max-w-[calc(100vw-2rem)]"
        onCloseAutoFocus={(event) => {
          const action = selected.current;
          selected.current = null;
          if (!action || !trigger.current) return;
          event.preventDefault();
          trigger.current.focus({ preventScroll: true });
          action.run(trigger.current);
        }}
      >
        {href && (
          <DropdownMenuItem asChild>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              {t("shop")}
              <span className="sr-only"> ({t("newTab")})</span>
            </a>
          </DropdownMenuItem>
        )}
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.kind}
            variant={action.kind === "delete" ? "destructive" : "default"}
            onSelect={() => {
              selected.current = action;
            }}
          >
            {t(action.kind)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type GiftRow = { item: GiftItem; status: ReactNode; actions: GiftAction[] };

function GiftSummary({ item }: { item: GiftItem }) {
  const t = useTranslations("giftViews");
  return (
    <div className="flex min-w-0 items-start gap-2">
      <GiftImage key={item.image_url} item={item} thumbnail />
      <div className="min-w-0 space-y-1 wrap-anywhere">
        <p className="font-semibold">{item.title}</p>
        {item.comment && (
          <p className="text-sm text-muted-foreground">{item.comment}</p>
        )}
        {(item.is_group_gift || item.priority === "high") && (
          <div className="flex flex-wrap gap-1">
            {item.is_group_gift && (
              <Badge variant="outline" className="whitespace-normal">
                {t("group")}
              </Badge>
            )}
            {item.priority === "high" && (
              <Badge variant="secondary" className="whitespace-normal">
                <Heart aria-hidden="true" />
                {t("favorite")}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function GiftTable({
  rows,
  density = "auto",
}: {
  rows: GiftRow[];
  density?: Density;
}) {
  const t = useTranslations("giftViews");
  const locale = useLocale();
  const format = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  });
  const price = (item: GiftItem) =>
    item.price == null ? t("freePrice") : format.format(item.price);
  return (
    <div
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="min-w-0"
    >
      <div
        className={cn(
          density === "auto" && "hidden md:block",
          density === "mobile" && "hidden",
        )}
      >
        <Table aria-label={t("gifts")} className="table-fixed wrap-anywhere">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">{t("gift")}</TableHead>
              <TableHead className="w-[16%]">{t("price")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="w-22 text-end">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item, status, actions }) => (
              <TableRow key={item.id} className="align-top">
                <TableCell>
                  <GiftSummary item={item} />
                </TableCell>
                <TableCell>{price(item)}</TableCell>
                <TableCell>{status}</TableCell>
                <TableCell className="text-end">
                  <GiftActionMenu item={item} actions={actions} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul
        aria-label={t("gifts")}
        className={cn(
          "space-y-2",
          density === "auto" && "md:hidden",
          density === "desktop" && "hidden",
        )}
      >
        {rows.map(({ item, status, actions }) => (
          <li
            key={item.id}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm wrap-anywhere"
          >
            <GiftSummary item={item} />
            <p className="max-w-24 text-end font-medium">{price(item)}</p>
            <div className="min-w-0 self-end">{status}</div>
            <div className="self-end justify-self-end">
              <GiftActionMenu item={item} actions={actions} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function restoreGiftFocus(
  event: Event,
  trigger: HTMLButtonElement | null,
  fallbackId: string,
  secondaryId?: string,
) {
  if (!trigger) return;
  event.preventDefault();
  const fallback =
    document
      .getElementById(fallbackId)
      ?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ??
    (secondaryId ? document.getElementById(secondaryId) : null);
  const target =
    trigger.isConnected && trigger.getClientRects().length ? trigger : fallback;
  target?.focus({ preventScroll: true });
}
