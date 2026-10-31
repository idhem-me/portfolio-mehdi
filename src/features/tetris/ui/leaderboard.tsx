"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIdentityState } from "../profile/client-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OAuthSignInButtons } from "@/features/account/ui/google-sign-in";
export type { RankedRun } from "../auth/draft";
export function Leaderboard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const identity = useIdentityState();
  const [rows, setRows] = useState<
      | {
          name: string;
          score: number;
          lines: number;
          rank: number;
          avatar?: string | null;
        }[]
      | null
    >(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/tetris/leaderboard", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        setRows(data);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [open, retry]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="lava-sheet z-[80]">
        <SheetHeader>
          <SheetTitle>Classement général</SheetTitle>
          <SheetDescription>Les 20 meilleurs scores.</SheetDescription>
        </SheetHeader>
        <div className="lava-settings">
          {error ? (
            <>
              <p role="alert">Classement indisponible.</p>
              <Button onClick={() => setRetry((v) => v + 1)}>Réessayer</Button>
            </>
          ) : rows === null ? (
            <p role="status">Chargement…</p>
          ) : rows.length === 0 ? (
            <p>Aucun score.</p>
          ) : (
            <ol className="space-y-4">
              {rows.map((row, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 border-b border-border pb-4"
                >
                  <Avatar className="size-9">
                    {row.avatar && (
                      <AvatarImage
                        src={row.avatar}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback>
                      {row.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate" title={row.name}>
                    {row.rank}. {row.name}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {row.score.toLocaleString("fr")}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {identity.scores.length > 0 && (
            <section aria-label="Scores sur cet appareil">
              <h3 className="font-medium">Sur cet appareil</h3>
              <ol className="space-y-3">
                {[...identity.scores]
                  .filter(
                    (row) =>
                      (row.kind !== "google" && row.kind !== "apple") ||
                      row.identityKey === identity.profile?.key,
                  )
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 20)
                  .map((row) => {
                    const accountProfile =
                      identity.kind === "google" || identity.kind === "apple"
                        ? identity.profile
                        : null;
                    const ownScore =
                      accountProfile !== null &&
                      row.identityKey === accountProfile.key;
                    const displayName =
                      row.kind === "google" || row.kind === "apple"
                        ? accountProfile && ownScore
                          ? accountProfile.name
                          : row.name
                        : "Anonyme";
                    return (
                      <li key={row.id} className="flex items-center gap-3">
                        <Avatar className="size-9">
                          {ownScore && accountProfile?.avatar && (
                            <AvatarImage src={accountProfile.avatar} alt="" />
                          )}
                          <AvatarFallback>
                            {displayName.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate">
                          {displayName}
                        </span>
                        <span className="tabular-nums">
                          {row.score.toLocaleString("fr")}
                        </span>
                      </li>
                    );
                  })}
              </ol>
            </section>
          )}
          <section
            aria-label="Enregistrement en ligne"
            className="lava-leaderboard-auth space-y-3 text-left"
          >
            {identity.kind === "google" || identity.kind === "apple" ? (
              <>
                <p className="text-sm font-medium">
                  Connecté avec {identity.profile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  À la fin d’une partie, choisis « Enregistrer en ligne » pour
                  envoyer ton score.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-medium">Enregistrer mes scores en ligne</h3>
                <p className="lava-leaderboard-auth-copy text-sm text-muted-foreground">
                  Sans connexion, tes scores restent anonymes et sauvegardés sur
                  cet appareil.
                </p>
                <OAuthSignInButtons layout="horizontal" />
              </>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
