"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  function onChange(next: string) {
    if (next === locale) return;
    router.replace(pathname, { locale: next as Locale });
  }

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip={t("label")}
          aria-label={t("label")}
          onClick={() => {
            const idx = routing.locales.indexOf(locale);
            const next =
              routing.locales[(idx + 1) % routing.locales.length];
            onChange(next);
          }}
        >
          <Languages />
          <span>{t("label")}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground">
        <Languages className="size-4 shrink-0 opacity-70" aria-hidden />
        <label className="sr-only" htmlFor="locale-switcher">
          {t("label")}
        </label>
        <select
          id="locale-switcher"
          className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent py-0.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          value={locale}
          onChange={(e) => onChange(e.target.value)}
          aria-label={t("label")}
        >
          {routing.locales.map((code) => (
            <option key={code} value={code}>
              {localeNames[code]}
            </option>
          ))}
        </select>
      </div>
    </SidebarMenuItem>
  );
}
