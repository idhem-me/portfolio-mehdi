"use client";

import { usePathname } from "@/i18n/navigation";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileMenuButton } from "@/components/layout/mobile-menu-button";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset
          className={
            pathname === "/"
              ? "min-w-0 home-paper-background"
              : "min-w-0"
          }
        >
          <header
            className="shrink-0 md:hidden"
            style={{
              height:
                "calc(max(1rem, env(safe-area-inset-top)) + var(--control-height-icon) + 1rem)",
            }}
          >
            <MobileMenuButton />
          </header>
          <div className="min-w-0 flex-1">{children}</div>
        </SidebarInset>
        <ConsentBanner />
      </SidebarProvider>
    </TooltipProvider>
  );
}
