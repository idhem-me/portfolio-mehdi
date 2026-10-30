"use client";

import { MarkGithubIcon } from "@primer/octicons-react";
import { Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { DesignSystemChoiceMenu } from "./choice-menu";
import { useDesignSystem, type DesignSystem } from "./provider";

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
export function DesignSystemSwitcher() {
  const t = useTranslations("designSystem");
  const { designSystem, setDesignSystem } = useDesignSystem();
  return (
    <DesignSystemChoiceMenu
      label={t("label")}
      title="Design System"
      value={designSystem}
      icon={<Palette />}
      choices={[
        { value: "mehdi", label: "Mehdi", icon: <MehdiIcon /> },
        {
          value: "github",
          label: "GitHub",
          icon: <MarkGithubIcon size={16} className="size-4 shrink-0" />,
        },
      ]}
      onChange={(value) => setDesignSystem(value as DesignSystem)}
      analyticsAction="design_system"
    />
  );
}
