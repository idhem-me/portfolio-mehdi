"use client";
import { useId, useRef, useState } from "react";
import { UserRound, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GoogleSignIn } from "./google-sign-in";
import {
  loadProfile,
  logout,
  saveProfile,
  useIdentityState,
} from "../profile/client-store";
import { validateNickname } from "../profile/fields";
import { encodePhoto } from "../profile/photo";
import type { ScoreDraft } from "../auth/draft";
import "./player-profile.css";
export function PlayerAvatar({
  name,
  avatar,
}: {
  name?: string;
  avatar?: string | null;
}) {
  return (
    <Avatar className="size-10">
      {avatar && (
        <AvatarImage src={avatar} alt="" referrerPolicy="no-referrer" />
      )}
      <AvatarFallback>
        {name
          ?.trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase() || <UserRound />}
      </AvatarFallback>
    </Avatar>
  );
}
export function IdentityError({
  children,
  retry,
}: {
  children: React.ReactNode;
  retry?: () => void;
}) {
  return (
    <div className="identity-error" role="alert" aria-live="polite">
      <p>{children}</p>
      {retry && (
        <Button type="button" variant="outline" onClick={retry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
function LocalProfileForm({ onDone }: { onDone: () => void }) {
  const state = useIdentityState(),
    id = useId(),
    file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(state.profile?.name ?? ""),
    [avatar, setAvatar] = useState<string | null>(
      state.profile?.avatar ?? null,
    );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false);
  async function submit() {
    setError("");
    setBusy(true);
    try {
      await saveProfile(validateNickname(name), avatar);
      onDone();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Enregistrement du profil impossible. Réessaie.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="identity-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="identity-photo">
        <PlayerAvatar name={name} avatar={avatar} />
        <Button
          type="button"
          variant="secondary"
          disabled={busy || photoBusy}
          onClick={() => file.current?.click()}
        >
          <ImagePlus />
          {photoBusy
            ? "Préparation…"
            : avatar
              ? "Modifier la photo"
              : "Ajouter une photo"}
        </Button>
        {avatar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Supprimer la photo"
            onClick={() => setAvatar(null)}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      <label className="sr-only" htmlFor={id + "-photo"}>
        Photo du profil
      </label>
      <input
        id={id + "-photo"}
        ref={file}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (event) => {
          const image = event.target.files?.[0];
          if (!image) return;
          setPhotoBusy(true);
          setError("");
          try {
            setAvatar(await encodePhoto(image));
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Photo invalide. Réessaie.",
            );
          } finally {
            setPhotoBusy(false);
            event.target.value = "";
          }
        }}
      />
      <label htmlFor={id + "-name"}>Pseudo</label>
      <Input
        id={id + "-name"}
        autoComplete="nickname"
        maxLength={20}
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={busy}
        aria-invalid={!!error}
        aria-describedby={error ? id + "-error" : undefined}
      />
      {error && (
        <div id={id + "-error"}>
          <IdentityError retry={() => void submit()}>{error}</IdentityError>
        </div>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={busy || photoBusy}
        aria-busy={busy}
      >
        {busy ? "Enregistrement…" : "Enregistrer le profil"}
      </Button>
      <Button type="button" variant="ghost" disabled={busy} onClick={onDone}>
        Annuler
      </Button>
    </form>
  );
}
export function IdentitySelector({
  draft,
  disabled = false,
  context = "entry",
  onContinue,
  onAnonymous,
}: {
  draft?: ScoreDraft;
  disabled?: boolean;
  context?: "entry" | "gameover";
  onContinue?: () => void;
  onAnonymous?: (name: string) => Promise<void>;
}) {
  const state = useIdentityState(),
    id = useId();
  const [form, setForm] = useState<"local" | "anonymous" | null>(null),
    [name, setName] = useState(draft?.name ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [continued, setContinued] = useState(false);
  const profile = state.profile;
  return (
    <section
      className="identity-selector"
      data-identity={state.kind}
      aria-label="Identité du joueur"
      aria-busy={state.loading || !!state.busy}
    >
      {profile && (
        <div className="identity-profile">
          <PlayerAvatar name={profile.name} avatar={profile.avatar} />
          <div>
            <strong>{profile.name}</strong>
            <p>
              {state.kind === "google"
                ? "Compte Google"
                : "Profil sur cet appareil"}
            </p>
          </div>
        </div>
      )}
      {state.loading && <p role="status">Chargement du profil…</p>}
      {state.kind === "google" ? (
        <Button
          className="identity-action"
          variant="outline"
          disabled={disabled || !!state.busy}
          onClick={() => void logout()}
        >
          {state.busy === "logout" ? "Déconnexion…" : "Se déconnecter"}
        </Button>
      ) : (
        <>
          <GoogleSignIn
            draft={draft}
            disabled={disabled || busy || !!state.busy}
          />
          {form !== "local" && (
            <Button
              className="identity-action"
              variant="outline"
              disabled={
                disabled ||
                busy ||
                !!state.busy ||
                !state.loaded ||
                state.loading
              }
              onClick={() => {
                setForm("local");
                setError("");
              }}
            >
              {state.kind === "local" ? "Modifier" : "Créer un profil local"}
            </Button>
          )}
          {form === "local" && (
            <LocalProfileForm onDone={() => setForm(null)} />
          )}
          {state.kind === "anonymous" &&
            context === "gameover" &&
            onAnonymous &&
            form !== "anonymous" && (
              <Button
                className="identity-action"
                variant="outline"
                disabled={disabled || busy || !!state.busy}
                onClick={() => setForm("anonymous")}
              >
                Enregistrer avec un pseudo anonyme
              </Button>
            )}
          {state.kind === "anonymous" &&
            form === "anonymous" &&
            onAnonymous && (
              <form
                className="identity-form"
                noValidate
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await onAnonymous(validateNickname(name));
                  } catch (error) {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Le score n’a pas pu être enregistré. Réessaie.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label htmlFor={id}>Pseudo anonyme</label>
                <Input
                  id={id}
                  value={name}
                  maxLength={20}
                  onChange={(event) => setName(event.target.value)}
                  disabled={busy}
                  autoComplete="nickname"
                />
                {error && <IdentityError>{error}</IdentityError>}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={busy || disabled}
                  aria-busy={busy}
                >
                  {busy ? "Enregistrement…" : "Enregistrer le score"}
                </Button>
              </form>
            )}
          {state.kind === "anonymous" && !continued && (
            <Button
              className="identity-action"
              variant="ghost"
              disabled={disabled || busy || !!state.busy}
              onClick={() => (onContinue ? onContinue() : setContinued(true))}
            >
              Continuer sans enregistrer
            </Button>
          )}
        </>
      )}
      {continued && (
        <p role="status">Tu peux choisir un jeu et jouer sans enregistrer.</p>
      )}
      {state.error && (
        <IdentityError
          retry={() => {
            if (
              state.error.includes("Google") ||
              state.error.includes("fenêtre")
            )
              void import("../profile/client-store").then(({ login }) =>
                login(draft),
              );
            else void loadProfile(true);
          }}
        >
          {state.error}
        </IdentityError>
      )}
    </section>
  );
}
