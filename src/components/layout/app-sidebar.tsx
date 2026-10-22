"use client";

import { Briefcase, Home, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { TrackedLink } from "@/components/analytics/tracked-link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { profileMeta } from "@/data/profile-meta";
import { usePathname } from "@/i18n/navigation";

const HAS_AVATAR = true;
const AVATAR_SRC = "/img/photos/avatar.png";

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const contactActive = pathname.startsWith("/contact");

  const navItems = [
    {
      href: "/",
      label: t("home"),
      icon: Home,
      match: (path: string) => path === "/",
    },
    {
      href: "/product-designer",
      label: t("productDesigner"),
      icon: Briefcase,
      match: (path: string) => path.startsWith("/product-designer"),
    },
    {
      href: "/a-propos",
      label: t("about"),
      icon: UserRound,
      match: (path: string) => path.startsWith("/a-propos"),
    },
  ] as const;

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-3">
        <div className="flex min-w-0 flex-1 items-center overflow-hidden px-1 group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-medium tracking-tight">
            {profileMeta.name}
          </span>
        </div>
        <SidebarTrigger className="shrink-0" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.match(pathname)}
                    tooltip={item.label}
                  >
                    <TrackedLink
                      href={item.href}
                      event={AnalyticsEvents.nav_click}
                      eventProps={{ href: item.href, label: item.label }}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </TrackedLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 px-2 pb-3">
        <SidebarMenu>
          <LanguageSwitcher />
          <ThemeToggle />
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              isActive={contactActive}
              tooltip={t("contact")}
              className="h-12 data-[active=true]:bg-sidebar-accent"
            >
              <TrackedLink
                href="/contact"
                event={AnalyticsEvents.nav_click}
                eventProps={{ href: "/contact", label: t("contact") }}
              >
                <Avatar className="size-7">
                  {HAS_AVATAR ? (
                    <AvatarImage
                      src={AVATAR_SRC}
                      alt={t("photoAlt", { name: profileMeta.name })}
                    />
                  ) : null}
                  <AvatarFallback className="text-[10px] font-medium">
                    {profileMeta.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                  {t("contact")}
                </span>
              </TrackedLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
