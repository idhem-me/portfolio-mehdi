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
import {
  saveDraft,
  clearDraft,
  type GameSummary,
  type RankedRun,
  type ScoreDraft,
} from "../auth/draft";
import { submitLocalScore, useIdentityState } from "../profile/client-store";
import { IdentitySelector, IdentityError } from "./identity-selector";
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
  const identity = useIdentityState();
  const [offlineRun] = useState(() => ({
    id: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
    seed: 0,
    steps: [],
    opening: false,
    localOnly: true,
  }));
  const scoreRun = localRun ?? offlineRun;
  const [sent, setSent] = useState(false),
    [skipped, setSkipped] = useState(false),
    [rank, setRank] = useState<number | null | undefined>(),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false);
  const saving = useRef(false),
    recipient = useRef(expectedRecipient);
  const draft: ScoreDraft | undefined = scoreRun
    ? {
        run: scoreRun,
        summary,
        name: initialName ?? "",
        recipient: expectedRecipient,
      }
    : undefined;
  const currentDraft = useRef(draft);
  useEffect(() => {
    currentDraft.current = draft;
  });
  useEffect(() => {
    if (currentDraft.current && !sent && !skipped)
      saveDraft(currentDraft.current);
  }, [scoreRun.id, sent, skipped]);
  useEffect(() => {
    const profile = identity.profile;
    if (
      !identity.loaded ||
      identity.loading ||
      !profile ||
      sent ||
      skipped ||
      saving.current
    )
      return;
    if (recipient.current && recipient.current !== profile.key) {
      setMessage(
        "Cette partie attend son identité d’origine. Reconnecte-toi pour la sauvegarder.",
      );
      return;
    }
    recipient.current = profile.key;
    if (currentDraft.current)
      saveDraft({ ...currentDraft.current, recipient: profile.key });
    saving.current = true;
    setBusy(true);
    setMessage("");
    void submitLocalScore(
      {
        id: scoreRun.id,
        steps: scoreRun.steps,
        opening: scoreRun.opening,
        localOnly: scoreRun.localOnly,
        recipient: profile.key,
        summary,
        ...(profile.kind === "google"
          ? { identity: "google" as const, name: profile.name }
          : {}),
      },
      (result) => setRank(result.rank),
    )
      .then((ok) => {
        if (ok) {
          setSent(true);
          clearDraft(undefined, scoreRun.id);
          setMessage(
            profile.kind === "local" || scoreRun.localOnly
              ? "Score enregistré sur cet appareil"
              : scoreRun.opening
                ? "Partie guidée enregistrée sur cet appareil"
                : "Score enregistré",
          );
        } else
          setMessage(
            "Le score n’a pas pu être envoyé. Il est conservé ici ; vérifie ta connexion et réessaie.",
          );
      })
      .finally(() => {
        saving.current = false;
        setBusy(false);
      });
  }, [
    identity.profile,
    identity.loaded,
    identity.loading,
    scoreRun,
    sent,
    skipped,
    retry,
    summary,
  ]);
  async function anonymous(name: string) {
    const ok = await submitLocalScore(
      {
        id: scoreRun.id,
        steps: scoreRun.steps,
        opening: scoreRun.opening,
        localOnly: scoreRun.localOnly,
        identity: "guest",
        name,
        summary,
      },
      (result) => setRank(result.rank),
    );
    if (!ok)
      throw Error(
        "Le score n’a pas pu être envoyé. Il est conservé ici ; vérifie ta connexion et réessaie.",
      );
    setSent(true);
    clearDraft(undefined, scoreRun.id);
    setMessage("Score enregistré avec ton pseudo anonyme");
  }
  return (
    <div
      className="lava-cover lava-gameover"
      role="region"
      aria-labelledby="lava-gameover-title"
    >
      <Card className="lava-end-panel">
        <CardHeader>
          <CardTitle>
            <h2 id="lava-gameover-title" tabIndex={-1}>
              Game over
            </h2>
          </CardTitle>
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
                {localRun?.opening
                  ? "Partie guidée"
                  : identity.kind === "local"
                    ? "Sur cet appareil"
                    : !run
                      ? "Non classé"
                      : !sent
                        ? "En attente"
                        : rank == null
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
          {((!sent && !skipped) || identity.kind !== "anonymous") && (
            <IdentitySelector
              context="gameover"
              draft={draft}
              disabled={busy}
              onAnonymous={anonymous}
              onContinue={() => {
                setSkipped(true);
                clearDraft(undefined, scoreRun.id);
              }}
            />
          )}
          {busy && <p role="status">Enregistrement du score…</p>}
          {message &&
            (sent ? (
              <p role="status">{message}</p>
            ) : (
              <IdentityError retry={() => setRetry((v) => v + 1)}>
                {message}
              </IdentityError>
            ))}
          {skipped && <p role="status">Partie terminée sans enregistrement.</p>}
          {!localRun && (
            <p role="status">
              Ton record reste sur cet appareil. La connexion n’a pas permis de
              préparer l’envoi de cette partie.
            </p>
          )}
        </CardContent>
        <CardFooter className="lava-end-actions">
          <Button
            variant="accent"
            size="lg"
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
