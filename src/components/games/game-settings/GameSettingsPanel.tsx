"use client";

import { useTranslations } from "next-intl";
import { SettingsModal } from "@/components/ui/settings-modal";
import { AccountSection } from "./sections/AccountSection";
import { AboutSection } from "./sections/AboutSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { AudioSection } from "./sections/AudioSection";
import { HapticsSection } from "./sections/HapticsSection";
import { SettingsCard } from "./primitives/SettingsCard";
import { SettingsSection } from "./primitives/SettingsSection";
import { SettingsToggleRow } from "./primitives/SettingsToggleRow";
import type {
  CustomSection,
  GameSettingsConfig,
  SettingsChange,
  SettingsValue,
} from "./types";
import "./game-settings.css";

export function GameSettingsPanel({
  open,
  onClose,
  config,
  settings,
  onSettingChange,
  customSections = config.customSections ?? [],
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  config: GameSettingsConfig;
  settings: SettingsValue;
  onSettingChange: SettingsChange;
  customSections?: CustomSection[];
  triggerRef?: { current: HTMLElement | null };
}) {
  const t = useTranslations("ui");
  return (
    <SettingsModal
      variant="right"
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("settingsTitle")}
      description={t("gameSettingsDescription", { game: config.gameName })}
      triggerRef={triggerRef}
      className="game-settings-panel"
    >
      <div className="game-settings-scroll">
        {config.account !== false && <AccountSection />}
        {config.appearance !== false && <AppearanceSection />}
        {config.audio && (
          <AudioSection
            channels={config.audio.channels}
            soundEnabled={config.audio.sound !== false}
            sound={Boolean(settings.sound)}
            settings={settings}
            onChange={onSettingChange}
          />
        )}
        {config.haptics && config.haptics.enabled !== false && (
          <HapticsSection
            ios={config.haptics.ios !== false}
            settings={settings}
            onChange={onSettingChange}
          />
        )}
        {!!config.toggles?.length && (
          <SettingsSection title="Options du jeu">
            {config.toggles.map((toggle) => (
              <SettingsCard key={toggle.id}>
                <SettingsToggleRow
                  id={toggle.id}
                  label={toggle.label}
                  description={toggle.description}
                  checked={Boolean(settings[toggle.id])}
                  onChange={(next) => onSettingChange(toggle.id, next)}
                />
              </SettingsCard>
            ))}
          </SettingsSection>
        )}
        {customSections.map((section) => (
          <SettingsSection
            key={section.title}
            title={section.title}
            description={section.description}
          >
            {section.content}
          </SettingsSection>
        ))}
        {config.about !== false && (
          <AboutSection
            gameName={config.gameName}
            shareText={config.about?.shareText}
          />
        )}
      </div>
    </SettingsModal>
  );
}
