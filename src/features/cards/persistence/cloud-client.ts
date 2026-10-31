"use client";
import { useEffect, useState } from "react";
import { useIdentityState } from "@/features/account/client-store";
import type { OpeningController } from "../engine/opening";
import { BOOSTER_CAPACITY } from "../engine/boosters";
import { emptySave, type CardsSave } from "./types";
import { parseSave } from "./repository";

const ENDPOINT = "/api/tetris/cards"; // Reuses the existing HttpOnly account cookie scope.
const BINDING = "cards.cloud-binding.v1";
type Remote = { accountKey: string; revision: number; save: CardsSave | null };
type Binding = { account: string; revision: number; signature: string };
export type CloudView = {
  status: "local" | "loading" | "saved" | "pending" | "conflict";
  message?: string;
  conflict?: {
    localCards: number;
    remoteCards: number;
    differentAccount: boolean;
  };
  useLocal?: () => void;
  useRemote?: () => void;
  dismiss?: () => void;
  retry?: () => void;
};
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    );
  return value;
}
export function cloudSnapshot(save: CardsSave): CardsSave {
  return {
    ...save,
    activeOpen: save.activeOpen?.simulation ? null : save.activeOpen,
  };
}
export function progressSignature(save: CardsSave): string {
  const clean = cloudSnapshot(save);
  return JSON.stringify(
    stable({
      ...clean,
      boosters: {
        ...clean.boosters,
        updatedAt:
          clean.boosters.available === BOOSTER_CAPACITY
            ? 0
            : clean.boosters.updatedAt,
      },
    }),
  );
}
const copies = (save: CardsSave | null) =>
  Object.values(save?.collection ?? {}).reduce(
    (sum, entry) => sum + entry.qty,
    0,
  );
const hasProgress = (save: CardsSave) =>
  copies(save) > 0 ||
  save.stats.boostersOpened > 0 ||
  Boolean(save.activeOpen && !save.activeOpen.simulation);
function binding(): Binding | null {
  try {
    return JSON.parse(localStorage.getItem(BINDING) || "null");
  } catch {
    return null;
  }
}
function bind(account: string, revision: number, save: CardsSave) {
  try {
    localStorage.setItem(
      BINDING,
      JSON.stringify({ account, revision, signature: progressSignature(save) }),
    );
  } catch {}
}
function backup(label: string, save: CardsSave) {
  // Never replace a conflicting snapshot if the recoverable local backup cannot be written.
  localStorage.setItem(`cards.backup.${label}`, JSON.stringify(save));
}
class Conflict extends Error {}
class ResetInterrupted extends Error {}

export function useCardsCloudSync(
  controller: OpeningController,
  onChange: () => void,
): CloudView {
  const identity = useIdentityState();
  const account =
    (identity.kind === "google" || identity.kind === "apple") &&
    identity.profile
      ? identity.profile.key
      : null;
  const [view, setView] = useState<CloudView>({ status: "local" });

  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let revision = 0,
      baseline = "",
      initialized = false,
      busy = false,
      paused = false;
    const update = (patch: Partial<CloudView>) => {
      if (!abort.signal.aborted)
        setView((previous) => ({ ...previous, ...patch }));
    };
    let resetGeneration = 0;
    const request = async (save?: CardsSave, expected = 0): Promise<Remote> => {
      const generation = resetGeneration;
      const response = await fetch(ENDPOINT, {
        method: save ? "PUT" : "GET",
        credentials: "same-origin",
        cache: "no-store",
        signal: abort.signal,
        ...(save
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accountKey: account,
                revision: expected,
                save: cloudSnapshot(save),
              }),
            }
          : {}),
      });
      if (generation !== resetGeneration) throw new ResetInterrupted();
      if (response.status === 409) throw new Conflict();
      if (!response.ok)
        throw Error(
          "La synchronisation est indisponible. Ta progression reste sur cet appareil.",
        );
      const data = (await response.json()) as Remote;
      if (data.accountKey !== account || !Number.isSafeInteger(data.revision))
        throw Error(
          "Le compte actif a changé. Reconnecte-toi avant de synchroniser.",
        );
      return { ...data, save: data.save ? parseSave(data.save) : null };
    };
    const acknowledge = (record: Remote, local: CardsSave, replace = false) => {
      if (abort.signal.aborted || !account) return;
      revision = record.revision;
      baseline = progressSignature(local);
      initialized = true;
      paused = false;
      bind(account, revision, local);
      if (replace) {
        controller.replaceSave(local);
        onChange();
      }
      update({
        status:
          progressSignature(controller.getSave()) === baseline
            ? "saved"
            : "loading",
        conflict: undefined,
        message: undefined,
      });
    };
    const pending = (error: unknown) => {
      if (error instanceof ResetInterrupted) return;
      if (!abort.signal.aborted)
        update({
          status: "pending",
          message:
            error instanceof Error
              ? error.message
              : "La progression reste enregistrée sur cet appareil.",
        });
    };
    const schedule = () => {
      if (!initialized || paused || abort.signal.aborted) return;
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), 400);
    };
    const flush = async () => {
      if (!account || !initialized || paused || busy || abort.signal.aborted)
        return;
      const local = cloudSnapshot(controller.getSave());
      if (progressSignature(local) === baseline) return;
      busy = true;
      update({ status: "loading", message: undefined });
      try {
        acknowledge(await request(local, revision), local);
      } catch (error) {
        if (error instanceof Conflict) {
          busy = false;
          await initialize();
        } else {
          viewStatusRetryAllowed = false;
          pending(error);
        }
      } finally {
        busy = false;
        if (
          initialized &&
          !paused &&
          progressSignature(controller.getSave()) !== baseline &&
          !abort.signal.aborted &&
          viewStatusRetryAllowed
        )
          schedule();
      }
    };
    // A failed network request waits for online/focus/manual retry instead of looping.
    let viewStatusRetryAllowed = true;
    const initialize = async () => {
      if (!account || busy || abort.signal.aborted) return;
      busy = true;
      viewStatusRetryAllowed = true;
      update({ status: "loading", message: undefined });
      try {
        const remote = await request();
        if (abort.signal.aborted) return;
        const local = controller.getSave(),
          bound = binding();
        const differentAccount = Boolean(
          bound?.account && bound.account !== account,
        );
        const localUnchanged =
          bound?.account === account &&
          progressSignature(local) === bound.signature;
        if (
          !differentAccount &&
          (!hasProgress(local) ||
            (remote.save &&
              (localUnchanged ||
                progressSignature(local) === progressSignature(remote.save))))
        ) {
          if (remote.save) acknowledge(remote, remote.save, true);
          else acknowledge(await request(local, 0), local);
        } else if (
          !differentAccount &&
          (!remote.save ||
            (bound?.account === account && bound.revision === remote.revision))
        ) {
          acknowledge(await request(local, remote.revision), local);
        } else {
          initialized = false;
          paused = true;
          update({
            status: "conflict",
            conflict: {
              localCards: copies(local),
              remoteCards: copies(remote.save),
              differentAccount,
            },
            useRemote: () => void resolve(remote, false),
            useLocal: () => void resolve(remote, true),
            dismiss: () => {
              paused = true;
              update({
                status: "local",
                conflict: undefined,
                message:
                  "Synchronisation suspendue : ta progression reste locale.",
              });
            },
          });
        }
      } catch (error) {
        viewStatusRetryAllowed = false;
        pending(error);
      } finally {
        busy = false;
        if (
          initialized &&
          !paused &&
          !abort.signal.aborted &&
          viewStatusRetryAllowed &&
          progressSignature(controller.getSave()) !== baseline
        )
          schedule();
      }
    };
    const resolve = async (remote: Remote, keepLocal: boolean) => {
      if (busy || abort.signal.aborted || !account) return;
      busy = true;
      update({ status: "loading", message: undefined });
      try {
        if (keepLocal) {
          if (remote.save) backup(`remote.${account}`, remote.save);
          const local = controller.getSave();
          acknowledge(await request(local, remote.revision), local);
        } else {
          backup(
            `local.${binding()?.account ?? "guest"}`,
            controller.getSave(),
          );
          const next = remote.save ?? emptySave();
          acknowledge(
            remote.save ? remote : await request(next, 0),
            next,
            true,
          );
        }
      } catch (error) {
        viewStatusRetryAllowed = false;
        pending(error);
      } finally {
        busy = false;
      }
    };
    const refresh = () => {
      if (!paused) void initialize();
    };
    const start = setTimeout(() => {
      if (!account) {
        setView({ status: "local" });
        return;
      }
      update({
        retry: () => {
          paused = false;
          void initialize();
        },
      });
      void initialize();
    }, 0);
    const onSave = () => {
      viewStatusRetryAllowed = true;
      if (
        initialized &&
        !paused &&
        progressSignature(controller.getSave()) !== baseline
      )
        update({ status: "loading", message: undefined });
      if (paused)
        setView((previous) =>
          previous.conflict
            ? {
                ...previous,
                conflict: {
                  ...previous.conflict,
                  localCards: copies(controller.getSave()),
                },
              }
            : previous,
        );
      schedule();
    };
    const onReset = () => {
      resetGeneration++;
      paused = true;
      initialized = false;
      clearTimeout(timer);
      if (account)
        update({
          status: "local",
          conflict: undefined,
          message:
            "Collection locale réinitialisée. Ta sauvegarde de compte est conservée.",
        });
    };
    window.addEventListener("cards:save", onSave);
    window.addEventListener("cards:reset", onReset);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      abort.abort();
      clearTimeout(start);
      clearTimeout(timer);
      window.removeEventListener("cards:save", onSave);
      window.removeEventListener("cards:reset", onReset);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [account, controller, onChange]);
  return view;
}
