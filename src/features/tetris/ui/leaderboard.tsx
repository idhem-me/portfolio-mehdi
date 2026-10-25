"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { clearDraft, type RankedRun, type ScoreDraft } from "../auth/draft";
import { IdentityChoices, usePlayerIdentity } from "./player-identity";
import { writeStore } from "../feel/config";
export type { RankedRun } from "../auth/draft";
export function Leaderboard({
  open,
  onOpenChange,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft?: ScoreDraft;
}) {
  const [rows, setRows] = useState<
      { name: string; score: number; lines: number; rank: number }[] | null
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
          <IdentityChoices draft={draft} />
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
                  className="flex justify-between gap-4 border-b border-border pb-4"
                >
                  <span className="min-w-0 break-words">
                    {row.rank}. {row.name}
                  </span>
                  <span className="shrink-0 text-right font-mono">
                    {row.score.toLocaleString("fr")}
                    <small className="block text-muted-foreground">
                      {row.lines} lignes
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs text-muted-foreground">
            Envoi volontaire après une partie, avec un pseudo ou Google. Le
            record local reste indépendant.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
export function SubmitScore({
  run,
  onOpen,
  draft,
  initialName,
  onSubmitted,
}: {
  run: RankedRun | null;
  onOpen: () => void;
  draft?: ScoreDraft;
  initialName?: string;
  onSubmitted?: (rank: number | null | undefined) => void;
}) {
  const identity = usePlayerIdentity();
  const [name, setName] = useState<string | undefined>(
      initialName || undefined,
    ),
    [state, setState] = useState(""),
    [pending, setPending] = useState(false),
    [done, setDone] = useState(false);
  const publicName =
    name ??
    (identity.mode === "google" ? identity.auth.user?.displayName || "" : "");
  if (!run)
    return <p className="text-xs text-muted-foreground">Partie non classée.</p>;
  if (done)
    return (
      <div className="lava-score-saved">
        <span className="sr-only" role="status">
          Score enregistré
        </span>
        <Button type="button" variant="outline" onClick={onOpen}>
          Voir le classement
        </Button>
      </div>
    );
  return (
    <form
      className="lava-score-form w-full space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending || done) return;
        setPending(true);
        setState("");
        try {
          const r = await fetch("/api/tetris/leaderboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...run,
              name: publicName,
              identity: identity.mode,
            }),
            signal: AbortSignal.timeout(15000),
          });
          const data = await r.json();
          if (!r.ok) throw Error(data.error);
          clearDraft();
          writeStore("lava-nickname", publicName);
          setDone(true);
          onSubmitted?.(data.rank);
        } catch (error) {
          setState(
            error instanceof Error ? error.message : "Envoi impossible.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <IdentityChoices
        disabled={pending || done}
        draft={draft ? { ...draft, name: publicName } : undefined}
      />
      <label htmlFor="lava-pseudo" className="text-sm">
        {identity.mode === "google"
          ? "Nom affiché au classement"
          : "Votre pseudonyme public"}
      </label>
      <Input
        id="lava-pseudo"
        minLength={2}
        maxLength={20}
        required
        value={publicName}
        onChange={(e) => setName(e.target.value)}
        disabled={pending || done}
        autoComplete="nickname"
      />
      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={pending || done}
      >
        {pending ? "Vérification…" : done ? "Score envoyé" : "Valider"}
      </Button>
      <p role="status" className="text-xs">
        {state}
      </p>
      {done && (
        <Button type="button" variant="ghost" onClick={onOpen}>
          Voir le classement
        </Button>
      )}
    </form>
  );
}
