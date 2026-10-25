"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GoogleSignIn } from "./google-sign-in";
import { saveDraft, clearDraft } from "../auth/draft";
import type { GameSummary, RankedRun, ScoreDraft } from "../auth/draft";

import { PlayerProfileButton } from "./player-profile";
import {
  submitLocalScore,
  usePlayerProfile,
  useProfileLoaded,
  saveProfile,
  loadProfile,
} from "../profile/client-store";
import { usePlayerIdentity } from "./player-identity";
export function GameOver({
  summary,
  run,
  localRun,
  initialName,
  expectedRecipient,
  onReplay,
  onMenu,
  preparing,
}: {
  summary: GameSummary;
  run: RankedRun | null;
  localRun: (RankedRun & { opening: boolean }) | null;
  initialName?: string;
  expectedRecipient?: string;
  onReplay: () => void;
  onMenu: () => void;
  preparing: boolean;
}) {
  const [sent, setSent] = useState(false);
  const [rank, setRank] = useState<number | null | undefined>(undefined);
  const saving = useRef(false);
  const recipientRef = useRef(expectedRecipient);
  const profile = usePlayerProfile();
  const loaded = useProfileLoaded();
  const identity = usePlayerIdentity();
  const [name, setName] = useState(initialName ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const draft: ScoreDraft | undefined = localRun
    ? { run: localRun, summary, name, recipient: expectedRecipient }
    : undefined;
  const latestDraft = useRef(draft);
  useEffect(() => {
    latestDraft.current = draft;
  });
  useEffect(() => {
    if (latestDraft.current && !sent)
      saveDraft({ ...latestDraft.current, recipient: recipientRef.current });
  }, [sent, name, localRun?.id]);
  useEffect(() => {
    if (
      !loaded ||
      identity.auth.loading ||
      !profile ||
      !localRun ||
      sent ||
      saving.current
    )
      return;
    if (profile.kind === "google" && localRun.opening) {
      clearDraft(undefined, localRun.id);
      return;
    }
    if (recipientRef.current && recipientRef.current !== profile.key) {
      setMessage(
        "Cette partie attend son identité d’origine. Reconnecte-toi pour la sauvegarder.",
      );
      return;
    }
    recipientRef.current = profile.key;
    if (latestDraft.current)
      saveDraft({ ...latestDraft.current, recipient: profile.key });
    saving.current = true;
    const recipient = profile.key;
    void submitLocalScore(
      {
        id: localRun.id,
        steps: localRun.steps,
        opening: localRun.opening,
        recipient,
        ...(profile.kind === "google"
          ? { identity: "google" as const, name: profile.name }
          : {}),
      },
      (result) => setRank(result.rank),
    )
      .then((ok) => {
        if (ok) {
          setSent(true);
          clearDraft(undefined, localRun.id);
          setMessage("Score enregistré");
        } else
          setMessage(
            "Sauvegarde en attente. Tu peux continuer à jouer ou réessayer.",
          );
      })
      .finally(() => {
        saving.current = false;
      });
  }, [profile, loaded, identity.auth.loading, localRun, sent, retry]);
  const privateProfile = profile?.kind === "local";
  return (
    <div
      className="lava-cover lava-gameover"
      role="region"
      aria-labelledby="lava-gameover-title"
    >
      <Card className="lava-end-panel">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>
              <h2 id="lava-gameover-title" tabIndex={-1}>
                Game over
              </h2>
            </CardTitle>
            <PlayerProfileButton />
          </div>
        </CardHeader>
        <CardContent className="lava-end-content">
          <dl className="lava-end-stats">
            <div>
              <dt>
                <CardDescription>Record</CardDescription>
              </dt>
              <dd className="lava-end-number">
                {summary.best.toLocaleString("fr")}
              </dd>
            </div>
            <div>
              <dt>
                <CardDescription>Classement</CardDescription>
              </dt>
              <dd className="lava-end-state">
                {profile?.kind === "google" && localRun?.opening
                  ? "Partie guidée"
                  : privateProfile
                    ? sent
                      ? "Score enregistré"
                      : "En attente"
                    : !run
                      ? "Non classé"
                      : !sent
                        ? "En attente"
                        : rank === undefined
                          ? "Indisponible"
                          : rank === null
                            ? "Hors du top 20"
                            : rank === 1
                              ? "1er"
                              : `${rank}e`}
              </dd>
            </div>
            <div>
              <dt>
                <CardDescription>Score</CardDescription>
              </dt>
              <dd className="lava-end-number">
                {summary.score.toLocaleString("fr")}
              </dd>
            </div>
            <div>
              <dt>
                <CardDescription>Lignes</CardDescription>
              </dt>
              <dd className="lava-end-state">
                {summary.lines.toLocaleString("fr")}
              </dd>
            </div>
          </dl>
          {loaded && !identity.auth.loading && !profile && localRun && (
            <div className="space-y-4">
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  setMessage("");
                  try {
                    await saveProfile(name, null);
                  } catch (cause) {
                    setMessage(
                      cause instanceof Error
                        ? cause.message
                        : "Profil indisponible.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label htmlFor="gameover-name" className="text-sm">
                  Pseudo
                </label>
                <Input
                  id="gameover-name"
                  autoComplete="nickname"
                  minLength={2}
                  maxLength={20}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={busy}
                />
                <Button variant="primary" type="submit" disabled={busy}>
                  {busy ? "Enregistrement…" : "Enregistrer avec un pseudo"}
                </Button>
              </form>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>
              <GoogleSignIn draft={draft} disabled={busy} />
            </div>
          )}
          {(!loaded || identity.auth.loading) && (
            <p role="status" className="text-sm text-muted-foreground">
              Chargement du profil…
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadProfile(true)}
              >
                Réessayer
              </Button>
            </p>
          )}
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
          {profile && !sent && message && (
            <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
              Réessayer la sauvegarde
            </Button>
          )}
          {!localRun && (
            <p role="status" className="text-sm text-muted-foreground">
              Cette partie n’a pas pu être synchronisée. Ton record reste sur
              cet appareil.
            </p>
          )}
        </CardContent>
        <CardFooter className="lava-end-actions">
          <Button
            variant={sent || !run ? "accent" : "outline"}
            size={sent || !run ? "lg" : "default"}
            disabled={preparing}
            onClick={onReplay}
          >
            {preparing ? "Préparation…" : "Rejouer"}
          </Button>
          <Button variant="outline" onClick={onMenu}>
            Menu
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
