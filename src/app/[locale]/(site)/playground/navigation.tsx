"use client";

import { Columns2, ListChecks, PanelsTopLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  SectionNavigation,
  SectionNavigationItem,
} from "@/components/layout/section-navigation";

export function PlaygroundNavigation() {
  const t = useTranslations("playground");
  const pathname = usePathname();
  const catalog = pathname === "/playground";
  const comparing = pathname === "/playground/design-systems";
  const local = pathname === "/playground/local-components";

  return (
    <SectionNavigation label={t("title")}>
      <SectionNavigationItem active={catalog}>
        <Link href="/playground" aria-current={catalog ? "page" : undefined}>
          <PanelsTopLeft aria-hidden />
          <span>{t("title")}</span>
        </Link>
      </SectionNavigationItem>
      <SectionNavigationItem active={comparing}>
        <Link
          href="/playground/design-systems"
          aria-current={comparing ? "page" : undefined}
        >
          <Columns2 aria-hidden />
          <span>{t("compare")}</span>
        </Link>
      </SectionNavigationItem>
      <SectionNavigationItem active={local}>
        <Link href="/playground/local-components" aria-current={local ? "page" : undefined}>
          <ListChecks aria-hidden />
          <span>{t("localTitle")}</span>
        </Link>
      </SectionNavigationItem>
    </SectionNavigation>
  );
}
