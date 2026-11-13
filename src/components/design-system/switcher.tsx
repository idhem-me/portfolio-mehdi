"use client";

import type { ReactNode } from "react";
import { Contrast, Droplet, Leaf, Palette, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { DesignSystemChoiceMenu } from "./choice-menu";
import {
  DESIGN_SYSTEMS,
  useDesignSystem,
  type DesignSystem,
} from "./provider";
import { isDesignSystem } from "./registry";

const ICONS: Record<DesignSystem, ReactNode> = {
  mehdi: <Contrast className="size-4 shrink-0" aria-hidden />,
  fun: <Sparkles className="size-4 shrink-0" aria-hidden />,
  "frutiger-aero": <Leaf className="size-4 shrink-0" aria-hidden />,
  "liquid-glass": <Droplet className="size-4 shrink-0" aria-hidden />,
};

export function DesignSystemSwitcher() {
  const t = useTranslations("designSystem");
  const { designSystem, setDesignSystem } = useDesignSystem();
  return (
    <DesignSystemChoiceMenu
      label={t("label")}
      title={t("label")}
      value={designSystem}
      icon={<Palette className="size-4 shrink-0" />}
      choices={DESIGN_SYSTEMS.map((system) => ({
        value: system.id,
        label: system.label,
        icon: ICONS[system.id],
      }))}
      onChange={(value) => {
        if (isDesignSystem(value)) setDesignSystem(value);
      }}
      analyticsAction="design_system"
    />
  );
}
