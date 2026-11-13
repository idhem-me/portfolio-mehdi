"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  clearDraft,
  savePendingScore,
  removePendingScore,
  type GameSummary,
  type RankedRun,
} from "../auth/draft";
import {
  loadProfile,
  saveDeviceScore,
  submitLocalScore,
  useIdentityState,
} from "../profile/client-store";

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
  const t = useTranslations("Tetris.result");
  const locale = useLocale();
  const identity = useIdentityState();
  const heading = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);
  const recipient = useRef(expectedRecipient);
  const [offlineRun] = useState(() => ({
    id: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
    seed: 0,
    steps: [],
    opening: false,
    localOnly: true,
  }));
  const [run] = useState(() => localRun ?? offlineRun);
  const [localState, setLocalState] = useState<"saving" | "saved" | "error">(
    "saving",
  );
  const [onlineState, setOnlineState] = useState<
    "idle" | "sending" | "sent" | "error" | "identity" | "storage"
  >("idle");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    void loadProfile();
  }, []);
  useEffect(() => {
    if (!identity.loaded || identity.loading) return;
    let active = true;
    recipient.current ??= identity.profile?.key;
    void saveDeviceScore({
      ...run,
      summary,
      name: initialName || identity.profile?.name || t("anonymous"),
      recipient: recipient.current ?? identity.profile?.key,
    })
      .then(() => {
        if (active) setLocalState("saved");
        clearDraft(undefined, run.id);
      })
      .catch(() => {
        if (active) setLocalState("error");
      });
    return () => {
      active = false;
    };
  }, [
    identity.loaded,
    identity.loading,
    identity.profile?.key,
    identity.profile?.name,
    initialName,
    run,
    summary,
    retry,
    t,
  ]);

  const publish = async () => {
    const profile = identity.profile;
    if (
      sending.current ||
      !leaderboardAvailable ||
      !profile ||
      run.localOnly ||
      run.opening
    )
      return;
    if (recipient.current && recipient.current !== profile.key) {
      setOnlineState("identity");
      return;
    }
    recipient.current = profile.key;
    // Preserve explicit intent before any network request, independently of this screen.
    if (
      !savePendingScore({
        run,
        summary,
        name: profile.name,
        recipient: profile.key,
      })
    ) {
      setOnlineState("storage");
      return;
    }
    sending.current = true;
    setOnlineState("sending");
    try {
      const result = await submitLocalScore({
        ...run,
        summary,
        recipient: profile.key,
        name: profile.name,
        ...(profile.kind !== "local" ? { identity: profile.kind } : {}),
      });
      if (result.ok) {
        removePendingScore(run.id);
        clearDraft(undefined, run.id);
        setOnlineState("sent");
      } else {
        setOnlineState(
          result.reason === "auth" || result.reason === "identity"
            ? "identity"
            : "error",
        );
        if (result.reason === "auth") void loadProfile(true);
      }
    } catch {
      setOnlineState("error");
    } finally {
      sending.current = false;
    }
  };
  const onlineAccount = identity.kind === "google" || identity.kind === "apple";
  const seconds = Math.floor(summary.elapsed / 1000);
  const duration = `${Math.floor(seconds / 60).toLocaleString(locale)}:${(seconds % 60).toLocaleString(locale, { minimumIntegerDigits: 2, useGrouping: false })}`;
  return (
    <section
      className="lava-cover lava-gameover"
      aria-labelledby="lava-gameover-title"
    >
      <Card className="lava-end-panel">
        <CardHeader>
          <CardTitle>
            <h2 ref={heading} id="lava-gameover-title" tabIndex={-1}>
              {t("title")}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="lava-end-content">
          <div>
            <p>{t("score")}</p>
            <p className="lava-end-score lava-end-number">
              {summary.score.toLocaleString(locale)}
            </p>
            <p>{t("best", { score: summary.best.toLocaleString(locale) })}</p>
          </div>
          <dl className="lava-end-stats">
            <div>
              <dt>{t("lines")}</dt>
              <dd>{summary.lines.toLocaleString(locale)}</dd>
            </div>
            <div>
              <dt>{t("level")}</dt>
              <dd>{summary.level.toLocaleString(locale)}</dd>
            </div>
            <div>
              <dt>{t("duration")}</dt>
              <dd>{duration}</dd>
            </div>
          </dl>
          <div
            className="lava-result-storage"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>
              {t(
                localState === "saved"
                  ? "localSaved"
                  : localState === "error"
                    ? "localError"
                    : "localSaving",
              )}
            </p>
            {localState === "error" && (
              <Button
                variant="outline"
                onClick={() => {
                  setLocalState("saving");
                  setRetry((v) => v + 1);
                }}
              >
                {t("retry")}
              </Button>
            )}
            {run.opening || run.localOnly ? (
              <p>{t(run.opening ? "guided" : "offline")}</p>
            ) : null}
            {onlineState !== "idle" && <p>{t(`online.${onlineState}`)}</p>}
            {leaderboardAvailable &&
              onlineAccount &&
              !run.localOnly &&
              !run.opening && (
                <Button
                  variant="outline"
                  disabled={onlineState === "sending" || onlineState === "sent"}
                  onClick={() => void publish()}
                >
                  {t(
                    onlineState === "sent"
                      ? "published"
                      : onlineState === "sending"
                        ? "publishing"
                        : "publish",
                  )}
                </Button>
              )}
          </div>
        </CardContent>
        <CardFooter className="lava-end-actions">
          <Button
            variant="accent"
            size="lg"
            disabled={preparing}
            onClick={onReplay}
          >
            {t(preparing ? "preparing" : "replay")}
          </Button>
          <Button variant="outline" onClick={onMenu}>
            {t("home")}
          </Button>
          {leaderboardAvailable && (
            <Button variant="ghost" onClick={onLeaderboard}>
              {t("leaderboard")}
            </Button>
          )}
        </CardFooter>
      </Card>
    </section>
  );
}
