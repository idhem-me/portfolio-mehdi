"use client";

import { useState } from "react";
import { Check, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { profileMeta } from "@/data/profile-meta";
import { AnalyticsEvents, track } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

function gameHomeUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

export function GameSettingsOutreach({
  gameName,
  shareText,
  className,
}: {
  gameName: string;
  shareText?: string;
  className?: string;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [message, setMessage] = useState("");
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
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
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

  function sendFeedback() {
    const body = message.trim();
    if (!body) return;
    const subject = encodeURIComponent(`Retour : ${gameName}`);
    const mailBody = encodeURIComponent(
      `${body}\n\n---\nJeu : ${gameName}\nPage : ${gameHomeUrl()}`,
    );
    track(AnalyticsEvents.game_feedback, { game: gameName });
    window.location.href = `mailto:${profileMeta.email}?subject=${subject}&body=${mailBody}`;
    setFeedbackOpen(false);
    setMessage("");
  }

  return (
    <section className={cn("game-settings-outreach", className)}>
      <h3>À propos</h3>
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
        {shareState === "idle" ? (
          <Share2 />
        ) : (
          <Check aria-hidden />
        )}
        {shareState === "copied"
          ? "Lien copié"
          : shareState === "shared"
            ? "Partagé"
            : "Partager le jeu"}
      </Button>
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-medium tracking-tight">
            Retour : {gameName}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Ton message s’ouvre dans ton appli mail, adressé au développeur.
          </DialogDescription>
          <label className="mt-4 grid gap-2 text-sm">
            <span className="text-muted-foreground">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              placeholder="Ex. idée d’amélioration, bug, équilibre…"
              className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-[length:var(--control-text)] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFeedbackOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!message.trim()}
              onClick={sendFeedback}
            >
              Envoyer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
