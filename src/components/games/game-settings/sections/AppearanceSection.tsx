"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { SettingsCard } from "../primitives/SettingsCard";
import { SettingsSegmented } from "../primitives/SettingsSegmented";
import { SettingsSection } from "../primitives/SettingsSection";

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <SettingsSection
      title="Apparence"
      description="Le thème est partagé avec le portfolio."
    >
      <SettingsCard className="is-borderless">
        <SettingsSegmented
          label="Thème du jeu"
          value={theme ?? "system"}
          onChange={setTheme}
          options={[
            { value: "light", label: "Clair", icon: Sun },
            { value: "dark", label: "Sombre", icon: Moon },
            { value: "system", label: "Système", icon: Monitor },
          ]}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
