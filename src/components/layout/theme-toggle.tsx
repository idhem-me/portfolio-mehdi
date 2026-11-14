"use client";

import { useEffect, useState } from "react";
import { track as usage } from "@/lib/tracking/client";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { DesignSystemSidebarButton as SidebarMenuButton } from "@/components/design-system/sidebar-button";
import { Button } from "@/components/ui/button";
import { SidebarMenuItem } from "@/components/ui/sidebar";

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const t = useTranslations("theme");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration synchronizes browser-only state after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Placeholder stable SSR → client (évite mismatch next-themes).
  const isDark = mounted && resolvedTheme === "dark";
  const label = !mounted
    ? t("enableDark")
    : isDark
      ? t("enableLight")
      : t("enableDark");

  const buttonProps = {
    type: "button",
    "data-analytics-action": "theme_toggle",
    "data-analytics-value": isDark ? "light" : "dark",
    "aria-label": label,
    disabled: !mounted,
    onClick: () => {
      usage.increment("theme_toggles");
      setTheme(isDark ? "light" : "dark");
    },
    suppressHydrationWarning: true,
  } as const;
  const Icon = isDark ? Sun : Moon;

  if (iconOnly) {
    return (
      <Button variant="ghost" size="icon" {...buttonProps}>
        <Icon className="size-4 shrink-0" aria-hidden />
      </Button>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={label} {...buttonProps}>
        <Icon className="size-4 shrink-0" aria-hidden />
        <span suppressHydrationWarning>{isDark ? t("light") : t("dark")}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
