"use client";

import { useEffect, useState } from "react";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBrandBar } from "@/components/layout/mobile-brand-bar";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

function MobileHeader() {
  const { isMobile } = useSidebar();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydration synchronizes browser-only state after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  if (!ready || !isMobile) return null;

  return (
    <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <MobileBrandBar />
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <MobileHeader />
          <div className="min-w-0 flex-1">{children}</div>
        </SidebarInset>
        <ConsentBanner />
      </SidebarProvider>
    </TooltipProvider>
  );
}
