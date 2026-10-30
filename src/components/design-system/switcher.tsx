"use client";

import type { ReactNode } from "react";
import { MarkGithubIcon } from "@primer/octicons-react";
import { Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { DesignSystemChoiceMenu } from "./choice-menu";
import {
  ENABLED_DESIGN_SYSTEMS,
  useDesignSystem,
  type DesignSystem,
} from "./provider";

function MehdiIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/img/avatar/AD-droite.svg"
      alt=""
      width={16}
      height={16}
      className="size-4 shrink-0 rounded-full"
    />
  );
}

function AdobeIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      className="size-4 shrink-0"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M9.77 2H14v12h-3.25L9.77 2ZM2 14h3.26L6.23 2H2v12Zm5.12-4.46L8.5 5.2l1.38 4.34H7.12Z"
      />
    </svg>
  );
}

const ICONS: Record<DesignSystem, ReactNode> = {
  mehdi: <MehdiIcon />,
  github: <MarkGithubIcon size={16} className="size-4 shrink-0" />,
  adobe: <AdobeIcon />,
};

export function DesignSystemSwitcher() {
  const t = useTranslations("designSystem");
  const { designSystem, setDesignSystem } = useDesignSystem();
  return (
    <DesignSystemChoiceMenu
      label={t("label")}
      title="Design System"
      value={designSystem}
      icon={<Palette className="size-4 shrink-0" />}
      choices={ENABLED_DESIGN_SYSTEMS.map((system) => ({
        value: system.id,
        label: system.label,
        icon: ICONS[system.id],
      }))}
      onChange={(value) => setDesignSystem(value as DesignSystem)}
      analyticsAction="design_system"
    />
  );
}
