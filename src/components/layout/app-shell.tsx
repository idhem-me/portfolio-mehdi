"use client";

import { useEffect, useState } from "react";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { profileMeta } from "@/data/profile-meta";

function MobileHeader() {
  const { isMobile } = useSidebar();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || !isMobile) return null;

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ms-1" />
      <span className="text-sm font-medium tracking-tight">
        {profileMeta.name}
      </span>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset>
          <MobileHeader />
          <div className="flex-1">{children}</div>
        </SidebarInset>
        <ConsentBanner />
      </SidebarProvider>
    </TooltipProvider>
  );
}
