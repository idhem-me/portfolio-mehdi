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
import type { Step } from "../engine/replay";
export type RankedRun = { id: string; seed: number; steps: Step[] };
export function Leaderboard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          <SheetDescription>
            Marathon classique · les 20 meilleurs scores des 90 derniers jours.
            Un record par navigateur.
          </SheetDescription>
        </SheetHeader>
        <div className="lava-settings">
          {error ? (
            <>
              <p role="alert">Le classement est momentanément indisponible.</p>
              <Button onClick={() => setRetry((v) => v + 1)}>Réessayer</Button>
            </>
          ) : rows === null ? (
            <p role="status">Chargement…</p>
          ) : rows.length === 0 ? (
            <p>Aucun score pour le moment. À vous d’ouvrir le bal.</p>
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
            Envoi volontaire après une partie. Pseudonyme public, sans compte.
            Le record local reste indépendant.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
export function SubmitScore({
  run,
  onOpen,
}: {
  run: RankedRun | null;
  onOpen: () => void;
}) {
  const [name, setName] = useState(""),
    [state, setState] = useState(""),
    [pending, setPending] = useState(false),
    [done, setDone] = useState(false);
  if (!run)
    return (
      <p className="text-xs text-muted-foreground">
        Partie locale : jouez à nouveau pour rejoindre le classement.
      </p>
    );
  return (
    <form
      className="space-y-2 w-full max-w-64"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending || done) return;
        setPending(true);
        setState("");
        try {
          const r = await fetch("/api/tetris/leaderboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...run, name }),
            signal: AbortSignal.timeout(15000),
          });
          const data = await r.json();
          if (!r.ok) throw Error(data.error);
          setDone(true);
          setState("Record pris en compte.");
        } catch (error) {
          setState(
            error instanceof Error ? error.message : "Envoi impossible.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <label htmlFor="lava-pseudo" className="text-sm">
        Votre pseudonyme public
      </label>
      <Input
        id="lava-pseudo"
        minLength={2}
        maxLength={20}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={pending || done}
        autoComplete="nickname"
      />
      <Button type="submit" disabled={pending || done}>
        {pending
          ? "Vérification…"
          : done
            ? "Score envoyé"
            : "Envoyer mon score"}
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
