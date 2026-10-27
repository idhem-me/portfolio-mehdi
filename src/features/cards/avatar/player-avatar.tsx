"use client";
import Image from "next/image";
import { PlayerAvatar } from "@/features/account/ui/identity-selector";
import { usePlayerProfile } from "@/features/account/client-store";
import { useCardsAccount } from "../account/client";
import { COSMETICS } from "../shop/catalog";
export function CardsPlayerAvatar() {
  const { data } = useCardsAccount();
  const identity = usePlayerProfile();
  const profile = data?.profile;
  const frame = COSMETICS.find((c) => c.id === profile?.equipped_avatar_frame);
  const avatar =
    profile?.custom_avatar_enabled && profile.custom_avatar_path
      ? `/api/tetris/cards/avatar?v=${profile.avatar_version}`
      : (data?.user.avatar ?? identity?.avatar);
  return (
    <span className="cards-player-avatar">
      <PlayerAvatar name={data?.user.name ?? identity?.name} avatar={avatar} />
      {frame && "asset" in frame && (
        <Image
          src={frame.asset}
          alt={`Cadre ${frame.name}`}
          width={128}
          height={128}
          className={`cards-avatar-frame ${frame.id === "frame-shiny" ? "is-shiny" : ""}`}
        />
      )}
    </span>
  );
}
