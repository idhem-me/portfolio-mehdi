"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function ThemeToggle() {
  const t = useTranslations("theme");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Placeholder stable SSR → client (évite mismatch next-themes).
  const isDark = mounted && resolvedTheme === "dark";
  const label = !mounted
    ? t("enableDark")
    : isDark
      ? t("enableLight")
      : t("enableDark");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        tooltip={label}
        aria-label={label}
        disabled={!mounted}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        suppressHydrationWarning
      >
        {!mounted || !isDark ? <Moon /> : <Sun />}
        <span suppressHydrationWarning>
          {!mounted || !isDark ? t("dark") : t("light")}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
