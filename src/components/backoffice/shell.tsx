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
    <div className="flex min-h-svh min-w-0">
      <DesignSystemScope className="contents">
        <nav
          aria-label="Backoffice"
          className="fixed left-1/2 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-30 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl border border-sidebar-border bg-sidebar p-1 text-sidebar-foreground shadow-lg md:sticky md:left-auto md:z-0 md:top-0 md:bottom-auto md:h-dvh md:w-44 md:max-w-none md:translate-x-0 md:shrink-0 md:self-start md:overflow-y-auto md:rounded-none md:border-0 md:border-r md:p-2 md:shadow-none"
        >
          <SidebarMenu className="w-auto flex-row gap-1 md:w-full md:flex-col">
            {navigation.map((n) => (
              <SidebarMenuItem key={n.href} className="shrink-0 md:shrink">
                <DesignSystemSidebarButton
                  asChild
                  isActive={path === n.href}
                  className="w-auto justify-center whitespace-nowrap px-3 data-[active=true]:bg-background data-[active=true]:shadow-sm md:w-full md:justify-start md:px-2 md:data-[active=true]:bg-sidebar-accent md:data-[active=true]:shadow-none"
                >
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
      <main className="flex min-w-0 flex-1 flex-col p-4 pb-32 md:p-6">
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
