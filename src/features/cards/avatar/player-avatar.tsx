"use client";
import { PlayerAvatar } from "@/features/account/ui/identity-selector";
import { usePlayerProfile } from "@/features/account/client-store";
import { useCardsAccount } from "../account/client";
export function CardsPlayerAvatar() {
  const { data } = useCardsAccount();
  const identity = usePlayerProfile();
  return (
    <span className="cards-player-avatar">
      <PlayerAvatar
        name={data?.user.name ?? identity?.name}
        avatar={data?.user.avatar ?? identity?.avatar}
      />
    </span>
  );
}
