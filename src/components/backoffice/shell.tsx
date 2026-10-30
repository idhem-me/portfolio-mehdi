"use client";
import { SWRConfig } from "swr";
import { LayoutDashboard, Table, MousePointer2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAnalyticsConsent } from "@/lib/analytics/use-analytics-consent";
import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { DesignSystemSidebarButton } from "@/components/design-system/sidebar-button";
import { DesignSystemScope } from "@/components/design-system/provider";
export const navigation = [
  { href: "/backoffice", key: "dashboard", icon: LayoutDashboard },
  { href: "/backoffice/sessions", key: "sessions", icon: Table },
] as const;
export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("backoffice"),
    c = useAnalyticsConsent(),
    path = usePathname();
  return (
    <div className="flex min-h-svh">
      <DesignSystemScope className="contents">
        <nav
          aria-label="Backoffice"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-sidebar-foreground md:sticky md:z-0 md:inset-x-auto md:top-0 md:bottom-auto md:h-dvh md:w-44 md:shrink-0 md:self-start md:overflow-y-auto md:border-t-0 md:border-r md:pb-2"
        >
          <SidebarMenu className="flex-row md:flex-col">
            {navigation.map((n) => (
              <SidebarMenuItem key={n.href} className="flex-1 md:flex-none">
                <DesignSystemSidebarButton asChild isActive={path === n.href}>
                  <Link
                    href={n.href}
                    aria-current={path === n.href ? "page" : undefined}
                  >
                    <n.icon aria-hidden />
                    <span>{t(n.key)}</span>
                  </Link>
                </DesignSystemSidebarButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </nav>
      </DesignSystemScope>
      <main className="flex min-w-0 flex-1 flex-col p-4 pb-24 md:p-6">
        {c.granted ? (
          <SWRConfig value={{ provider: () => new Map() }}>
            {children}
          </SWRConfig>
        ) : (
          <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center gap-5 text-center">
            <MousePointer2
              className="size-16 text-muted-foreground"
              aria-hidden
            />
            <h1 className="text-3xl font-semibold">{t("emptyTitle")}</h1>
            <p className="text-muted-foreground">{t("emptyText")}</p>
            <p className="text-muted-foreground">{t("emptyPrivacy")}</p>
            <Button data-analytics-action="consent_accept" onClick={c.accept}>
              {t("accept")}
            </Button>
            <Button variant="ghost" onClick={c.openPreferences}>
              {t("cookies")}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
