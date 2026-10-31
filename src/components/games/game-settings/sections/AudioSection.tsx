"use client";

import { SettingsCard } from "../primitives/SettingsCard";
import { SettingsSlider } from "../primitives/SettingsSlider";
import { SettingsToggleRow } from "../primitives/SettingsToggleRow";
import { SettingsSection } from "../primitives/SettingsSection";
import type { AudioChannel, SettingsChange, SettingsValue } from "../types";

export function AudioSection({
  channels,
  soundEnabled,
  settings,
  onChange,
  sound,
}: {
  channels: AudioChannel[];
  soundEnabled: boolean;
  settings: SettingsValue;
  onChange: SettingsChange;
  sound: boolean;
}) {
  return (
    <SettingsSection title="Son">
      {soundEnabled && (
        <SettingsCard>
          <SettingsToggleRow
            id="sound"
            label="Son"
            checked={sound}
            onChange={(next) => onChange("sound", next)}
          />
        </SettingsCard>
      )}
      <SettingsCard className={!sound ? "is-disabled" : undefined}>
        {channels.map((channel) => (
          <SettingsSlider
            key={channel.id}
            id={`${channel.id}-volume`}
            label={channel.label}
            description={channel.description}
            value={Number(settings[channel.id] ?? 50)}
            disabled={!sound}
            onChange={(next) => onChange(channel.id, next)}
          />
        ))}
      </SettingsCard>
    </SettingsSection>
  );
}
