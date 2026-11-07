"use client";

import { Columns2, PanelsTopLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import {
  SectionNavigation,
  SectionNavigationItem,
} from "@/components/layout/section-navigation";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function PlaygroundNavigation() {
  const t = useTranslations("playground");
  const comparing = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash === "#comparer",
    () => false,
  );

  return (
    <SectionNavigation label={t("title")}>
      <SectionNavigationItem active={!comparing}>
        <a href="#catalogue" aria-current={!comparing ? "location" : undefined}>
          <PanelsTopLeft aria-hidden />
          <span>{t("title")}</span>
        </a>
      </SectionNavigationItem>
      <SectionNavigationItem active={comparing}>
        <a href="#comparer" aria-current={comparing ? "location" : undefined}>
          <Columns2 aria-hidden />
          <span>{t("compare")}</span>
        </a>
      </SectionNavigationItem>
    </SectionNavigation>
  );
}
