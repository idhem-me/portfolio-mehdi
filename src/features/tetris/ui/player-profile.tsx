"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={"rounded-full " + className}
        aria-label={
          profile ? "Profil joueur : " + profile.name : "Choisir mon identité"
        }
        onClick={() => setOpen(true)}
      >
        <PlayerAvatar name={profile?.name} avatar={profile?.avatar} />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="player-profile-sheet z-[90]">
          <SheetHeader>
            <SheetTitle>Profil joueur</SheetTitle>
            <SheetDescription>
              Choisis comment jouer et conserver tes scores.
            </SheetDescription>
          </SheetHeader>
          <div className="identity-sheet-content">
            <IdentitySelector draft={draft} onContinue={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
