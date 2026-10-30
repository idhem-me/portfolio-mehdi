"use client";
import { cardsEnabled } from "@/features/cards/flags";
import { clickerBurgerEnabled } from "@/features/clicker-burger/flags";

import { Home, Layers, UserRound, Gamepad2, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { setAvatarWink } from "@/components/creative/gaze-avatar";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileMenuButton } from "@/components/layout/mobile-menu-button";
import { MobileBrandBar } from "@/components/layout/mobile-brand-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { profileMeta } from "@/data/profile-meta";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import {tetrisEnabled} from "@/features/tetris/flags";

const HAS_AVATAR = true;
const AVATAR_SRC = "/img/photos/avatar.png";

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const contactActive = pathname.startsWith("/contact");

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
      ? [{
          href: "/jeux",
          label: t("games"),
          icon: Gamepad2,
          match: (path: string) => path.startsWith("/jeux"),
        }]
      : []),
    {
      href: "/a-propos",
      label: t("about"),
      icon: UserRound,
      match: (path: string) => path.startsWith("/a-propos"),
    },
  ] as const;

  if (isMobile) {
    const mobileItems = [...navItems, {
      href: "/contact",
      label: t("contact"),
      icon: UserRound,
      match: (path: string) => path.startsWith("/contact"),
    }];

    return (
      <Sidebar>
        <MobileMenuButton close />
        <div className="mobile-navigation-body">
          <nav aria-label={t("menu")} className="mobile-navigation-links">
            <SidebarMenu className="gap-4">
              {mobileItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={item.match(pathname)} className="mobile-navigation-tile">
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
              <LanguageSwitcher />
              <ThemeToggle />
            </SidebarMenu>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-0 border-b border-sidebar-border p-0">
        <MobileBrandBar />
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

      <SidebarFooter className={cn("gap-1 p-2", isMobile && "pb-6")}>
        <SidebarMenu>
          <LanguageSwitcher />
          <ThemeToggle />
        </SidebarMenu>
        <div className="border-t border-sidebar-border pt-1">
          <SidebarMenu>
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
                  onClick={closeMobilePanel}
                  onMouseEnter={() => setAvatarWink("AG-clin")}
                  onMouseLeave={() => setAvatarWink(null)}
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
                  <span className="truncate text-[length:var(--sidebar-menu-text)] font-medium group-data-[collapsible=icon]:hidden">
                    {t("contact")}
                  </span>
                </TrackedLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
