"use client";

import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdentityState, logout } from "@/features/account/client-store";
import { OAuthSignInButtons } from "@/features/account/ui/google-sign-in";
import { SettingsCard } from "./game-settings/primitives/SettingsCard";

export function GameAccountSettings() {
  const account = useIdentityState();
  const signedIn = account.kind === "google" || account.kind === "apple";
  return (
    <SettingsCard className="game-account-card is-borderless" aria-labelledby="game-account-heading">
      <h2 id="game-account-heading" className="game-settings-account-title"><UserRound aria-hidden="true" />Compte</h2>
      {signedIn ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Connecté avec {account.profile.name}</p>
          <Button variant="outline" onClick={() => void logout()}>Se déconnecter</Button>
        </div>
      ) : <OAuthSignInButtons layout="horizontal" />}
    </SettingsCard>
  );
}
