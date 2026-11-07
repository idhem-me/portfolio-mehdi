"use client";

import { Columns2, PanelsTopLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  SectionNavigation,
  SectionNavigationItem,
} from "@/components/layout/section-navigation";

export function PlaygroundNavigation() {
  const t = useTranslations("playground");
  const comparing = usePathname() === "/playground/design-systems";

  return (
    <SectionNavigation label={t("title")}>
      <SectionNavigationItem active={!comparing}>
        <Link href="/playground" aria-current={!comparing ? "page" : undefined}>
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
    </SectionNavigation>
  );
}
