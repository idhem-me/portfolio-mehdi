"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileMenuButton({ close = false }: { close?: boolean }) {
  const t = useTranslations("nav");
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  if (!isMobile) return null;

  return (
    <Button
      data-analytics-action={close ? "menu_close" : "menu_open"}
      id={close ? undefined : "mobile-menu-trigger"}
      variant="secondary"
      size="icon"
      className="mobile-menu-toggle"
      aria-label={t(close ? "closeMenu" : "openMenu")}
      aria-expanded={openMobile}
      aria-controls="mobile-navigation"
      onClick={() => setOpenMobile(!close)}
    >
      {close ? <X /> : <Menu />}
    </Button>
  );
}
