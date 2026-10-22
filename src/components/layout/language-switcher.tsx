"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  function onChange(next: string) {
    if (next === locale) return;
    router.replace(pathname, { locale: next as Locale });
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <SidebarMenuButton
          asChild
          tooltip={t("label")}
          aria-label={t("label")}
        >
          <DropdownMenuTrigger>
            <Languages />
            <span>{localeNames[locale]}</span>
          </DropdownMenuTrigger>
        </SidebarMenuButton>
        <DropdownMenuContent
          side={collapsed && !isMobile ? "right" : "top"}
          align="start"
          sideOffset={8}
          className="min-w-44 w-auto"
        >
          <DropdownMenuRadioGroup value={locale} onValueChange={onChange}>
            {routing.locales.map((code) => (
              <DropdownMenuRadioItem key={code} value={code}>
                {localeNames[code]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
