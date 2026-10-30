"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useDesignSystem } from "@/components/design-system/provider";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function MobileMenuButton({ close = false }: { close?: boolean }) {
  const t = useTranslations("nav");
  const { designSystem } = useDesignSystem();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  if (!isMobile) return null;

  return (
    <Button
      data-analytics-action={close ? "menu_close" : "menu_open"}
      id={close ? undefined : "mobile-menu-trigger"}
      variant={designSystem === "adobe" ? "ghost" : "secondary"}
      size="icon"
      className={cn(
        "mobile-menu-toggle",
        designSystem === "adobe" && "ds-spectrum-mobile-toggle",
      )}
      aria-label={t(close ? "closeMenu" : "openMenu")}
      aria-expanded={openMobile}
      aria-controls="mobile-navigation"
      onClick={() => setOpenMobile(!close)}
    >
      {close ? (
        <X className="size-4" strokeWidth={1.75} />
      ) : (
        <Menu className="size-4" strokeWidth={1.75} />
      )}
    </Button>
  );
}
