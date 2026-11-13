"use client";
import { LayoutDashboard, Table } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  SectionNavigation,
  SectionNavigationItem,
} from "@/components/layout/section-navigation";
export const navigation = [
  { href: "/backoffice", key: "dashboard", icon: LayoutDashboard },
  { href: "/backoffice/sessions", key: "sessions", icon: Table },
] as const;
export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("backoffice");
  const nav = useTranslations("nav");
  const path = usePathname();
  return (
    <div className="flex min-h-svh min-w-0">
      <SectionNavigation label={nav("backoffice")} showBackLink={false}>
        {navigation.map((n) => (
          <SectionNavigationItem key={n.href} active={path === n.href}>
            <Link
              href={n.href}
              aria-current={path === n.href ? "page" : undefined}
            >
              <n.icon aria-hidden />
              <span>{t(n.key)}</span>
            </Link>
          </SectionNavigationItem>
        ))}
      </SectionNavigation>
      <main className="flex min-w-0 flex-1 flex-col p-4 pb-32 md:p-6">
        {children}
      </main>
    </div>
  );
}
