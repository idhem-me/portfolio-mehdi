"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { profileMeta } from "@/data/profile-meta";
import { cn } from "@/lib/utils";

/**
 * Barre marque + trigger.
 * Géométrie alignée sur SidebarMenuButton : px-2 (group) + p-2 (item)
 * pour que l’icône panel tombe sur la même colonne que Accueil / etc.
 */
export function MobileBrandBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "px-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
        className
      )}
    >
      <div className="flex h-12 items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        <SidebarTrigger
          className={cn(
            // Icône size-4 + hit area élargie (after), comme les items de nav
            "relative size-4! shrink-0 p-0! hover:bg-transparent",
            "after:absolute after:-inset-3.5 after:rounded-md",
            "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:hover:bg-sidebar-accent group-data-[collapsible=icon]:after:hidden",
            "[&_svg]:size-4"
          )}
        />
        <span className="min-w-0 flex-1 truncate text-[length:var(--sidebar-menu-text)] font-medium tracking-tight group-data-[collapsible=icon]:hidden">
          {profileMeta.siteTitle}
        </span>
      </div>
    </div>
  );
}
