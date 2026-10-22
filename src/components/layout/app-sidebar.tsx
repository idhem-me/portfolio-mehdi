"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, UserRound } from "lucide-react";
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
import { profile } from "@/data/resume";

/** Remplace par true + fichier `public/avatar.jpg` quand la photo est prête. */
const HAS_AVATAR = false;

const navItems = [
  {
    href: "/",
    label: "Accueil",
    icon: Home,
    match: (path: string) => path === "/",
  },
  {
    href: "/product-designer",
    label: "Product designer",
    icon: Briefcase,
    match: (path: string) => path.startsWith("/product-designer"),
  },
  {
    href: "/a-propos",
    label: "À propos de moi",
    icon: UserRound,
    match: (path: string) => path.startsWith("/a-propos"),
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const contactActive = pathname.startsWith("/contact");

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-1 group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-medium tracking-tight">
            {profile.name.split(" ")[0]}
          </span>
          <span
            className="size-1.5 shrink-0 rounded-full bg-emerald-500"
            title={profile.status}
            aria-label={profile.status}
          />
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
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              isActive={contactActive}
              tooltip="Me contacter"
              className="h-12 data-[active=true]:bg-sidebar-accent"
            >
              <Link href="/contact">
                <Avatar className="size-7">
                  {HAS_AVATAR ? (
                    <AvatarImage
                      src="/avatar.jpg"
                      alt={`Photo de ${profile.name}`}
                    />
                  ) : null}
                  <AvatarFallback className="text-[10px] font-medium">
                    {profile.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col items-start gap-0.5 leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">
                    Me contacter
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {profile.email}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
