import { GameSettingsOutreach } from "@/components/games/game-settings-outreach";
import { SettingsCard } from "../primitives/SettingsCard";
import { SettingsSection } from "../primitives/SettingsSection";

export function AboutSection({
  gameName,
  shareText,
}: {
  gameName: string;
  shareText?: string;
}) {
  return (
    <SettingsSection title="À propos">
      <SettingsCard className="is-borderless">
        <GameSettingsOutreach
          gameName={gameName}
          shareText={shareText}
          showTitle={false}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
