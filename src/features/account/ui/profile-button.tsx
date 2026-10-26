"use client";
import { Button } from "@/components/ui/button";
import { usePlayerProfile } from "../client-store";
import { IdentitySelector, PlayerAvatar } from "./identity-selector";
import { ProfileHelpButton } from "./profile-help";
import type { ScoreDraft } from "../../tetris/auth/draft";
export function PlayerProfileButton({
  className = "",
  draft,
}: {
  className?: string;
  draft?: ScoreDraft;
}) {
  const profile = usePlayerProfile();
  return (
    <div className="flex items-center gap-2">
      <ProfileHelpButton />
      <IdentitySelector
        dropdown
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
            <PlayerAvatar name={profile?.name} avatar={profile?.avatar} />
          </Button>
        }
      />
    </div>
  );
}
