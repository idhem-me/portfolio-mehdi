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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { profileMeta } from "@/data/profile-meta";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { usePathname } from "@/i18n/navigation";
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

/** Accueil et commande indépendante du panel, alignés avec la navigation. */
export function MobileBrandBar({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <div className={cn("flex flex-col gap-1 p-2", className)}>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            tooltip={t("menu")}
            aria-label={t("menu")}
            className="h-9 group-data-[collapsible=icon]:[&>span]:sr-only"
            onClick={toggleSidebar}
          >
            <Menu aria-hidden="true" />
            <span>{t("menu")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === "/"}
            tooltip={t("home")}
            className="h-9 group-data-[collapsible=icon]:[&>span]:sr-only"
          >
            <TrackedLink
              href="/"
              aria-current={pathname === "/" ? "page" : undefined}
              event={AnalyticsEvents.nav_click}
              eventProps={{ href: "/", label: t("home") }}
            >
              <HomeAvatar />
              <span>{t("home")}</span>
            </TrackedLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
