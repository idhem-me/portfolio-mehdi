"use client";

import type { ReactElement, ReactNode } from "react";
import { DesignSystemScope } from "@/components/design-system/provider";
import { DesignSystemSidebarButton } from "@/components/design-system/sidebar-button";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

export function SectionNavigation({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <DesignSystemScope className="contents">
      <nav
        aria-label={label}
        className="fixed left-1/2 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-30 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl border border-sidebar-border bg-sidebar p-1 text-sidebar-foreground shadow-lg md:sticky md:left-auto md:z-0 md:top-0 md:bottom-auto md:h-dvh md:w-44 md:max-w-none md:translate-x-0 md:shrink-0 md:self-start md:overflow-y-auto md:rounded-none md:border-0 md:border-e md:p-2 md:shadow-none"
      >
        <SidebarMenu className="w-auto flex-row gap-1 md:w-full md:flex-col">
          {children}
        </SidebarMenu>
      </nav>
    </DesignSystemScope>
  );
}

export function SectionNavigationItem({
  active,
  children,
}: {
  active: boolean;
  children: ReactElement;
}) {
  return (
    <SidebarMenuItem className="shrink-0 md:shrink">
      <DesignSystemSidebarButton
        asChild
        isActive={active}
        className="w-auto justify-center whitespace-nowrap px-3 data-[active=true]:bg-background data-[active=true]:shadow-sm md:w-full md:justify-start md:px-2 md:data-[active=true]:bg-sidebar-accent md:data-[active=true]:shadow-none"
      >
        {children}
      </DesignSystemSidebarButton>
    </SidebarMenuItem>
  );
}
