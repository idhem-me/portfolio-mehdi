"use client";

import { NativeInput, NativeTextarea } from "@/components/design-system/native-controls";

import { useState } from "react";
import { Check, Loader2, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AnalyticsEvents, track } from "@/lib/analytics/events";
import { sendContactEmail } from "@/lib/contact-email";
import { cn } from "@/lib/utils";

function gameHomeUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

export function GameSettingsOutreach({
  gameName,
  shareText,
  className,
  showTitle = true,
}: {
  gameName: string;
  shareText?: string;
  className?: string;
  showTitle?: boolean;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">(
    "idle",
  );

  async function share() {
    const url = gameHomeUrl();
    const payload = {
      title: gameName,
      text: shareText ?? `Viens jouer à ${gameName}`,
      url,
    };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
        setShareState("shared");
        track(AnalyticsEvents.game_share, { game: gameName, method: "native" });
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
        track(AnalyticsEvents.game_share, {
          game: gameName,
          method: "clipboard",
        });
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError")
        return;
      try {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
        track(AnalyticsEvents.game_share, {
          game: gameName,
          method: "clipboard",
        });
      } catch {
        setShareState("idle");
        return;
      }
    }
    window.setTimeout(() => setShareState("idle"), 2200);
  }

  function resetFeedback() {
    setMessage("");
    setReplyEmail("");
    setHoneypot("");
    setStatus("idle");
    setError("");
  }

  function onFeedbackOpenChange(open: boolean) {
    setFeedbackOpen(open);
    if (!open) resetFeedback();
  }

  async function sendFeedback() {
    const body = message.trim();
    if (!body || status === "sending") return;

    // Honeypot anti-spam (ne pas nommer "website" / "email" : autofill navigateur)
    if (honeypot.trim()) {
      setStatus("sent");
      window.setTimeout(() => {
        setFeedbackOpen(false);
        resetFeedback();
      }, 800);
      return;
    }

    setStatus("sending");
    setError("");

    const result = await sendContactEmail({
      message: body,
      replyEmail: replyEmail.trim() || undefined,
      source: gameName,
      pageUrl: gameHomeUrl(),
    });

    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    track(AnalyticsEvents.game_feedback, { game: gameName });
    setStatus("sent");
    window.setTimeout(() => {
      setFeedbackOpen(false);
      resetFeedback();
    }, 1600);
  }

  return (
    <section className={cn("game-settings-outreach", className)}>
      {showTitle && <h3>À propos</h3>}
      <p className="game-settings-outreach-note">
        Une idée, un bug, une envie de mise à jour ? Écris-moi. Tu peux aussi
        partager la page du jeu.
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setFeedbackOpen(true)}
      >
        <MessageSquare />
        Retour
      </Button>
      <Button type="button" variant="secondary" onClick={() => void share()}>
        {shareState === "idle" ? <Share2 /> : <Check aria-hidden />}
        {shareState === "copied"
          ? "Lien copié"
          : shareState === "shared"
            ? "Partagé"
            : "Partager le jeu"}
      </Button>
      <Dialog open={feedbackOpen} onOpenChange={onFeedbackOpenChange}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-medium tracking-tight">
            Retour : {gameName}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Ton message m’est envoyé directement. Laisse un email si tu veux une
            réponse.
          </DialogDescription>

          {status === "sent" ? (
            <p
              className="mt-6 flex items-center gap-2 text-sm text-foreground"
              role="status"
            >
              <Check className="size-4 shrink-0" aria-hidden />
              Merci — message envoyé.
            </p>
          ) : (
            <>
              <label className="mt-4 grid gap-2 text-sm">
                <span className="text-muted-foreground">Message</span>
                <NativeTextarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                  maxLength={4000}
                  placeholder="Ex. idée d’amélioration, bug, équilibre…"
                  disabled={status === "sending"}
                  className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-[length:var(--control-text)] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                />
              </label>
              <label className="mt-3 grid gap-2 text-sm">
                <span className="text-muted-foreground">
                  Ton email{" "}
                  <span className="text-muted-foreground/70">(optionnel)</span>
                </span>
                <Input
                  type="email"
                  autoComplete="email"
                  value={replyEmail}
                  onChange={(event) => setReplyEmail(event.target.value)}
                  placeholder="toi@exemple.com"
                  disabled={status === "sending"}
                />
              </label>
              <NativeInput
                type="text"
                name="company_url_hp"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                className="hidden"
                aria-hidden
              />
              {error ? (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={status === "sending"}
                  onClick={() => onFeedbackOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!message.trim() || status === "sending"}
                  onClick={() => void sendFeedback()}
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    "Envoyer"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
