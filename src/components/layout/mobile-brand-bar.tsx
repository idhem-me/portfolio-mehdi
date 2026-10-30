"use client";

import { useTranslations } from "next-intl";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import {
  DesignSystemSidebarButton as SidebarMenuButton,
  DesignSystemSidebarTrigger as SidebarTrigger,
} from "@/components/design-system/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { profileMeta } from "@/data/profile-meta";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function HomeAvatar() {
  return (
    <Avatar className="size-7 shrink-0" aria-hidden="true">
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

  return (
    <div className={cn("flex h-12 items-center gap-1 px-2", className)}>
      <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === "/"}
            className="h-9"
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
      <div className="group/home-control relative shrink-0">
        <SidebarTrigger className="size-8 group-data-[collapsible=icon]:[&>svg]:opacity-0 group-data-[collapsible=icon]:hover:[&>svg]:opacity-100 group-data-[collapsible=icon]:focus:[&>svg]:opacity-100 group-data-[collapsible=icon]:[@media(hover:none)]:[&>svg]:opacity-100" />
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center group-data-[collapsible=icon]:flex group-hover/home-control:opacity-0 group-focus-within/home-control:opacity-0 [@media(hover:none)]:opacity-0">
          <HomeAvatar />
        </span>
      </div>
    </div>
  );
}
