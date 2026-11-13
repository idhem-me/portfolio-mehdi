"use client";

import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DesignSystemSidebarButton as SidebarMenuButton,
} from "@/components/design-system/sidebar-button";
import { DesignSystemButton } from "@/components/design-system/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { profileMeta } from "@/data/profile-meta";
import { cn } from "@/lib/utils";

export function HomeAvatar({ className }: { className?: string }) {
  return (
    <Avatar
      className={cn("size-7 shrink-0", className)}
      aria-hidden="true"
    >
      <AvatarImage src="/img/avatar/AD-droite.svg" alt="" />
      <AvatarFallback className="text-[10px] font-medium">
        {profileMeta.initials}
      </AvatarFallback>
    </Avatar>
  );
}

/** Commande indépendante qui ouvre ou réduit le panneau de navigation. */
export function SidebarMenuToggle({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const { state, setOpen, toggleSidebar } = useSidebar();
  const isExpanded = state === "expanded";

  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-0 p-2", className)}>
      {isExpanded ? (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="pointer-events-none hover:bg-transparent hover:text-sidebar-foreground"
            >
              <div>
                <Menu aria-hidden="true" />
                <span>{t("menu")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      ) : (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip={t("openMenu")}
              aria-label={t("openMenu")}
              className="w-8 justify-center"
              onClick={toggleSidebar}
            >
              <Menu aria-hidden="true" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
      {isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DesignSystemButton
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("closeMenu")}
              onClick={() => setOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M5,21q-0.83,0-1.41-0.59T3,19V5Q3,4.17 3.59,3.59T5,3H19q0.83,0 1.41,0.59T21,5V19q0,0.82-0.59,1.41T19,21H5Zm3-2V5H5V19H8Zm2,0h9V5H10V19ZM8,19H5H8Z" />
              </svg>
            </DesignSystemButton>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {t("closeMenu")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
