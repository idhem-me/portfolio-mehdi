import { SettingsCard } from "../primitives/SettingsCard";
import { SettingsToggleRow } from "../primitives/SettingsToggleRow";
import { SettingsSection } from "../primitives/SettingsSection";
import type { SettingsChange, SettingsValue } from "../types";

const IOS_NOTE =
  "L’option iOS utilise une astuce non officielle de Safari 18+. Elle peut ne produire aucune vibration. Safari iOS ne prend pas en charge navigator.vibrate.";

export function HapticsSection({
  ios,
  settings,
  onChange,
}: {
  ios: boolean;
  settings: SettingsValue;
  onChange: SettingsChange;
}) {
  return (
    <SettingsSection title="Haptiques">
      <SettingsCard>
        <SettingsToggleRow
          id="haptics"
          label="Haptiques"
          checked={Boolean(settings.haptics)}
          onChange={(next) => onChange("haptics", next)}
        />
        {ios && (
          <SettingsToggleRow
            id="ios"
            label="Haptiques iOS expérimentales"
            checked={Boolean(settings.ios)}
            onChange={(next) => onChange("ios", next)}
          />
        )}
      </SettingsCard>
      {ios && <p className="game-settings-note">{IOS_NOTE}</p>}
    </SettingsSection>
  );
}
