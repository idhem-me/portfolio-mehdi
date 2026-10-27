"use client";
import { Button } from "@/components/ui/button";
import { usePlayerProfile } from "../client-store";
import { IdentitySelector, PlayerAvatar } from "./identity-selector";
import { ProfileHelpButton } from "./profile-help";
import type { ScoreDraft } from "../../tetris/auth/draft";
export function PlayerProfileButton({
  className = "",
  draft,
  showHelp = true,
  avatarOverride,
}: {
  className?: string;
  showHelp?: boolean;
  avatarOverride?: React.ReactNode;
  draft?: ScoreDraft;
}) {
  const profile = usePlayerProfile();
  return (
    <div className="flex items-center gap-2">
      {showHelp && <ProfileHelpButton />}
      <IdentitySelector
        dropdown
        avatarOverride={avatarOverride}
        draft={draft}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={"rounded-full " + className}
            aria-label={
              profile
                ? "Profil joueur : " + profile.name
                : "Choisir mon identité"
            }
          >
            {avatarOverride ?? (
              <PlayerAvatar name={profile?.name} avatar={profile?.avatar} />
            )}
          </Button>
        }
      />
    </div>
  );
}
