"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  saveDraft,
  clearDraft,
  type GameSummary,
  type RankedRun,
  type ScoreDraft,
} from "../auth/draft";
import {
  loadProfile,
  saveDeviceScore,
  submitLocalScore,
  useIdentityState,
} from "../profile/client-store";
import { IdentityError } from "./identity-selector";
import { Link } from "@/i18n/navigation";
export function GameOver({
  summary,
  localRun,
  initialName,
  expectedRecipient,
  onReplay,
  onMenu,
  onLeaderboard,
  leaderboardAvailable,
  preparing,
}: {
  summary: GameSummary;
  localRun: (RankedRun & { opening: boolean }) | null;
  initialName?: string;
  expectedRecipient?: string;
  onReplay: () => void;
  onMenu: () => void;
  onLeaderboard: () => void;
  leaderboardAvailable: boolean;
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
    [message, setMessage] = useState(""),
    [needsReconnect, setNeedsReconnect] = useState(false),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false);
  const [shareRequested, setShareRequested] = useState(false);
  const [deviceSaved, setDeviceSaved] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const saving = useRef(false),
    recipient = useRef(expectedRecipient),
    summaryRef = useRef(summary),
    attemptKey = useRef<string | null>(null),
    sawLogin = useRef(false);
  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);
  useEffect(() => {
    if (identity.busy === "login") {
      sawLogin.current = true;
      return;
    }
    if (!sawLogin.current) return;
    sawLogin.current = false;
    if (!needsReconnect) return;
    attemptKey.current = null;
    const timer = window.setTimeout(() => {
      setNeedsReconnect(false);
      setRetry((value) => value + 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [identity.busy, needsReconnect]);
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
    if (currentDraft.current && !sent) saveDraft(currentDraft.current);
  }, [scoreRun.id, sent]);
  useEffect(() => {
    if (
      !identity.loaded ||
      identity.loading ||
      identity.kind === "google" ||
      identity.kind === "apple"
    )
      return;
    let active = true;
    void saveDeviceScore({
      ...scoreRun,
      summary: summaryRef.current,
      name: identity.profile?.name ?? (initialName || "Anonyme"),
      recipient: recipient.current ?? identity.profile?.key,
    })
      .then(() => {
        if (active) {
          setDeviceSaved(true);
          setDeviceError("");
        }
      })
      .catch((error) => {
        if (active)
          setDeviceError(
            error instanceof Error
              ? error.message
              : "Le score n’a pas pu être enregistré sur cet appareil.",
          );
      });
    return () => {
      active = false;
    };
  }, [
    identity.loaded,
    identity.loading,
    identity.kind,
    identity.profile?.key,
    identity.profile?.name,
    initialName,
    scoreRun,
    scoreRun.id,
    retry,
  ]);
  useEffect(() => {
    const profile = identity.profile;
    if (
      !identity.loaded ||
      identity.loading ||
      !profile ||
      !shareRequested ||
      sent ||
      saving.current
    )
      return;
    if (recipient.current && recipient.current !== profile.key) {
      setNeedsReconnect(true);
      setMessage(
        "Cette partie attend son identité d’origine. Reconnecte-toi pour la sauvegarder.",
      );
      return;
    }
    const key = `${scoreRun.id}:${profile.key}:${retry}`;
    if (attemptKey.current === key) return;
    attemptKey.current = key;
    recipient.current = profile.key;
    if (currentDraft.current)
      saveDraft({ ...currentDraft.current, recipient: profile.key });
    saving.current = true;
    setBusy(true);
    setNeedsReconnect(false);
    setMessage("");
    void submitLocalScore({
      id: scoreRun.id,
      steps: scoreRun.steps,
      opening: scoreRun.opening,
      localOnly: scoreRun.localOnly,
      recipient: profile.key,
      summary: summaryRef.current,
      ...(profile.kind === "google" || profile.kind === "apple"
        ? { identity: profile.kind, name: profile.name }
        : {}),
    })
      .then((result) => {
        if (result.ok) {
          setSent(true);
          clearDraft(undefined, scoreRun.id);
          setMessage(
            profile.kind === "local" || scoreRun.localOnly
              ? "Score enregistré sur cet appareil"
              : scoreRun.opening
                ? "Partie guidée enregistrée sur cet appareil"
                : "Score enregistré",
          );
        } else if (result.reason === "auth") {
          setNeedsReconnect(true);
          setMessage(
            "Reconnecte-toi à ton compte pour enregistrer ce score. Il est conservé ici en attendant.",
          );
          void loadProfile(true);
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
    scoreRun.id,
    scoreRun.steps,
    scoreRun.opening,
    scoreRun.localOnly,
    sent,
    shareRequested,
    retry,
  ]);
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
          <div>
            <p className="text-sm text-muted-foreground">Score</p>
            <p className="lava-end-score lava-end-number">
              {summary.score.toLocaleString("fr")}
            </p>
            {identity.kind !== "google" &&
              identity.kind !== "apple" &&
              deviceSaved && (
              <p className="mt-2 text-sm" role="status">
                Score enregistré sur cet appareil
              </p>
            )}
          </div>
          {identity.profile && <p className="text-sm">Connecté avec {identity.profile.name}</p>}
          {busy && (
            <p className="text-sm" role="status">
              Enregistrement du score…
            </p>
          )}
          {message && !sent && (
            <IdentityError retry={() => setRetry((v) => v + 1)}>
              {message}
            </IdentityError>
          )}
          {deviceError && (
            <IdentityError retry={() => setRetry((v) => v + 1)}>
              {deviceError}
            </IdentityError>
          )}
          <p className="text-sm text-muted-foreground">
            Record : {summary.best.toLocaleString("fr")}
          </p>
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
          <Button
            variant="outline"
            onClick={onLeaderboard}
            disabled={!leaderboardAvailable}
          >
            Classement
          </Button>
          <Button variant="outline" onClick={onMenu}>
            Menu
          </Button>
          <Button variant="outline" asChild>
            <Link href="/jeux">Quitter le jeu</Link>
          </Button>
          {identity.profile?.kind === "google" || identity.profile?.kind === "apple" ? (
            <Button variant="secondary" disabled={busy || sent || !!scoreRun.localOnly} onClick={() => setShareRequested(true)}>Enregistrer en ligne</Button>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
