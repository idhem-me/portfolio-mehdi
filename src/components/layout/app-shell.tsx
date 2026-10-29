"use client";

import { ConsentBanner } from "@/components/analytics/consent-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileMenuButton } from "@/components/layout/mobile-menu-button";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <MobileMenuButton />
          <div className="min-w-0 flex-1">{children}</div>
        </SidebarInset>
        <ConsentBanner />
      </SidebarProvider>
    </TooltipProvider>
  );
}
