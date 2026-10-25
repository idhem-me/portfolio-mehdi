"use client";
import { Button } from "@/components/ui/button";
import { usePlayerProfile } from "../profile/client-store";
import { IdentitySelector, PlayerAvatar } from "./identity-selector";
import type { ScoreDraft } from "../auth/draft";
export function PlayerProfileButton({
  className = "",
  draft,
}: {
  className?: string;
  draft?: ScoreDraft;
}) {
  const profile = usePlayerProfile();
  return (
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
            profile ? "Profil joueur : " + profile.name : "Choisir mon identité"
          }
        >
          <PlayerAvatar name={profile?.name} avatar={profile?.avatar} />
        </Button>
      }
    />
  );
}
