"use client";
import { cardsEnabled } from "@/features/cards/flags";
import { clickerBurgerEnabled } from "@/features/clicker-burger/flags";

import {
  Home,
  LayoutDashboard,
  Cookie,
  Layers,
  UserRound,
  Gamepad2,
  Wrench,
  MessageCircle,
} from "lucide-react";
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
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { DesignSystemSidebarButton as SidebarMenuButton } from "@/components/design-system/sidebar-button";
import { DesignSystemScope } from "@/components/design-system/provider";
import { DesignSystemSwitcher } from "@/components/design-system/switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileMenuButton } from "@/components/layout/mobile-menu-button";
import { MobileBrandBar } from "@/components/layout/mobile-brand-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { openAnalyticsPreferences } from "@/lib/analytics/consent";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { usePathname } from "@/i18n/navigation";

import { tetrisEnabled } from "@/features/tetris/flags";

export function AppSidebar() {
  const t = useTranslations("nav");
  const privacy = useTranslations("backoffice");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobilePanel() {
    if (isMobile) setOpenMobile(false);
  }

  const navItems = [
    {
      href: "/",
      label: t("home"),
      icon: Home,
      match: (path: string) => path === "/",
    },
    {
      href: "/backoffice",
      label: t("backoffice"),
      icon: LayoutDashboard,
      match: (path: string) => path.startsWith("/backoffice"),
    },
    {
      href: "/realisations",
      label: t("realisations"),
      icon: Layers,
      match: (path: string) => path.startsWith("/realisations"),
    },
    {
      href: "/outils",
      label: t("tools"),
      icon: Wrench,
      match: (path: string) => path.startsWith("/outils"),
    },
    ...(tetrisEnabled || clickerBurgerEnabled || cardsEnabled
      ? [
          {
            href: "/jeux",
            label: t("games"),
            icon: Gamepad2,
            match: (path: string) => path.startsWith("/jeux"),
          },
        ]
      : []),
    {
      href: "/a-propos",
      label: t("about"),
      icon: UserRound,
      match: (path: string) => path.startsWith("/a-propos"),
    },
    {
      href: "/contact",
      label: t("contact"),
      icon: MessageCircle,
      match: (path: string) => path.startsWith("/contact"),
    },
  ] as const;

  if (isMobile) {
    return (
      <Sidebar>
        <DesignSystemScope portalRoot className="flex size-full flex-col">
          <MobileMenuButton close />
          <div className="mobile-navigation-body">
            <nav aria-label={t("menu")} className="mobile-navigation-links">
              <SidebarMenu className="gap-4">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.match(pathname)}
                      className="mobile-navigation-tile"
                    >
                      <TrackedLink
                        href={item.href}
                        aria-current={item.match(pathname) ? "page" : undefined}
                        event={AnalyticsEvents.nav_click}
                        eventProps={{ href: item.href, label: item.label }}
                        onClick={closeMobilePanel}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </TrackedLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
            <div className="mobile-navigation-settings">
              <SidebarMenu className="gap-4 [&_[data-slot=sidebar-menu-button]]:min-h-12">
                <DesignSystemSwitcher />
                <LanguageSwitcher />
                <ThemeToggle />
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={openAnalyticsPreferences}
                    tooltip={privacy("cookies")}
                    aria-label={privacy("cookies")}
                  >
                    <Cookie />
                    <span>{privacy("cookies")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </div>
        </DesignSystemScope>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <DesignSystemScope portalRoot className="flex size-full flex-col">
        <SidebarHeader className="gap-0 p-0">
          <MobileBrandBar />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.slice(1).map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.match(pathname)}
                      tooltip={item.label}
                    >
                      <TrackedLink
                        href={item.href}
                        aria-current={item.match(pathname) ? "page" : undefined}
                        event={AnalyticsEvents.nav_click}
                        eventProps={{ href: item.href, label: item.label }}
                        onClick={closeMobilePanel}
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

        <SidebarFooter className="gap-1 p-2">
          <SidebarMenu>
            <DesignSystemSwitcher />
            <LanguageSwitcher />
            <ThemeToggle />
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={openAnalyticsPreferences}
                tooltip={privacy("cookies")}
                aria-label={privacy("cookies")}
              >
                <Cookie />
                <span>{privacy("cookies")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </DesignSystemScope>
    </Sidebar>
  );
}
