"use client";

import { NativeInput } from "@/components/design-system/native-controls";
import { useEffect, useId, useRef, useState } from "react";
import { UserRound, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OAuthSignInButtons } from "./google-sign-in";
import {
  loadProfile,
  loginWithProvider,
  logout,
  saveProfile,
  useIdentityState,
} from "../client-store";
import { validateNickname } from "../profile/fields";
import { encodePhoto } from "../profile/photo";
import type { ScoreDraft } from "../../tetris/auth/draft";
import "./identity.css";
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
      {retry && !String(children).startsWith("Serveur injoignable") && (
        <Button type="button" variant="outline" onClick={retry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
function LocalProfileForm({
  onDone,
  initialName = "",
}: {
  onDone: () => void;
  initialName?: string;
}) {
  const state = useIdentityState(),
    id = useId(),
    file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(state.profile?.name ?? initialName),
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
          className="identity-photo-select"
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
            className="identity-photo-remove"
            disabled={busy || photoBusy}
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
      <NativeInput
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
        {busy ? "Enregistrement…" : "Enregistrer"}
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
  trigger,
  dropdown = false,
  connectOnly = false,
  editOnly = false,
  avatarOverride,
  menuExtras,
  providersOnly = false,
  hideNickname = false,
}: {
  draft?: ScoreDraft;
  disabled?: boolean;
  trigger?: React.ReactNode;
  dropdown?: boolean;
  connectOnly?: boolean;
  editOnly?: boolean;
  avatarOverride?: React.ReactNode;
  /** Extra items rendered at the end of the avatar dropdown. */
  menuExtras?: React.ReactNode;
  /** Hide local nickname/profile editing for games that use provider identity only. */
  providersOnly?: boolean;
  hideNickname?: boolean;
}) {
  const state = useIdentityState();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<"choices" | "pseudo" | "connect">(
    "choices",
  );
  const profile = state.profile;
  const unavailable =
    disabled || !state.loaded || state.loading || !!state.busy;
  useEffect(() => {
    if (
      open &&
      panel === "connect" &&
      (state.kind === "google" || state.kind === "apple")
    ) {
      const frame = requestAnimationFrame(() => setOpen(false));
      return () => cancelAnimationFrame(frame);
    }
  }, [open, panel, state.kind]);
  const show = (next: "pseudo" | "connect") => {
    setPanel(next);
    setOpen(true);
  };
  const error = state.error && (
    <IdentityError
      retry={() => {
        if (
          state.error.includes("Google") ||
          state.error.includes("Apple") ||
          state.error.includes("fenêtre")
        ) {
          const provider = state.error.includes("Apple") ? "apple" : "google";
          void loginWithProvider(provider, draft);
        } else void loadProfile(true);
      }}
    >
      {state.error}
    </IdentityError>
  );
  const signedIn = state.kind === "google" || state.kind === "apple";
  if (providersOnly) {
    return (
      <div className="identity-selector">
        {profile && <div className="identity-profile"><PlayerAvatar name={profile.name} avatar={profile.avatar} /><div><strong>{profile.name}</strong><p>Compte {state.kind === "apple" ? "Apple" : "Google"}</p></div></div>}
        {signedIn ? (
          <Button type="button" variant="outline" disabled={!!state.busy} onClick={() => void logout()}>{state.busy === "logout" ? "Déconnexion…" : "Se déconnecter"}</Button>
        ) : <OAuthSignInButtons draft={draft} disabled={disabled} />}
        {!state.error.startsWith("Serveur injoignable") && error}
      </div>
    );
  }
  const choices = (
    <section
      className="identity-selector"
      data-identity={state.kind}
      aria-label="Identité du joueur"
      aria-busy={state.loading || !!state.busy}
    >
      {profile && (
        <div className="identity-profile">
          {avatarOverride ?? (
            <PlayerAvatar name={profile.name} avatar={profile.avatar} />
          )}
          <div>
            <strong>{profile.name}</strong>
            <p>
              {state.kind === "google"
                ? "Compte Google"
                : state.kind === "apple"
                  ? "Compte Apple"
                  : "Pseudo"}
            </p>
          </div>
        </div>
      )}
      {state.loading && <p role="status">Chargement du profil…</p>}
      {signedIn ? (
        <Button
          type="button"
          className="identity-action"
          variant="outline"
          disabled={disabled || !!state.busy}
          onClick={() => void logout()}
        >
          {state.busy === "logout" ? "Déconnexion…" : "Se déconnecter"}
        </Button>
      ) : (
        <>
          <Button
            type="button"
            className="identity-action"
            variant="outline"
            disabled={unavailable}
            onClick={() => show("pseudo")}
          >
            {state.kind === "local" ? "Modifier" : "Pseudo"}
          </Button>
          <Button
            type="button"
            className="identity-action"
            variant="secondary"
            disabled={unavailable}
            onClick={() => show("connect")}
          >
            Se connecter
          </Button>
        </>
      )}
      {!open && error}
    </section>
  );
  const activePanel = signedIn ? "choices" : panel;
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value && trigger) setPanel("choices");
      }}
    >
      {trigger && dropdown ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="identity-dropdown z-[95] min-w-56 w-[min(22rem,calc(100vw-2rem))]"
            onCloseAutoFocus={(event) => {
              if (open) event.preventDefault();
            }}
          >
            {profile && (
              <>
                <DropdownMenuLabel>{profile.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            {!hideNickname && <DropdownMenuItem
              disabled={unavailable || signedIn}
              title={
                signedIn
                  ? `Le pseudo vient de ton compte ${state.kind === "apple" ? "Apple" : "Google"}`
                  : undefined
              }
              onSelect={() => show("pseudo")}
            >
              {profile ? "Modifier mon pseudo" : "Ajouter un pseudo"}
            </DropdownMenuItem>}
            {signedIn ? (
              <DropdownMenuItem
                disabled={!!state.busy}
                onSelect={(event) => {
                  event.preventDefault();
                  void logout().then((ok) => {
                    if (ok) setMenuOpen(false);
                  });
                }}
              >
                {state.busy === "logout" ? "Déconnexion…" : "Se déconnecter"}
              </DropdownMenuItem>
            ) : hideNickname ? (
              <div className="flex flex-col gap-2 p-2" onKeyDown={(event) => event.stopPropagation()}>
                <OAuthSignInButtons draft={draft} layout="vertical" />
              </div>
            ) : (
              <DropdownMenuItem
                disabled={
                  unavailable ||
                  (!state.googleAvailable && !state.appleAvailable) ||
                  !state.online
                }
                onSelect={() => show("connect")}
              >
                Se connecter avec Google ou Apple
              </DropdownMenuItem>
            )}
            {menuExtras}
            {state.error && !hideNickname && <div className="p-2">{error}</div>}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : trigger ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : editOnly ? (
        <div className="identity-selector">
          <Button
            type="button"
            variant="secondary"
            className="identity-action"
            disabled={unavailable || signedIn}
            title={
              signedIn
                ? `Le pseudo vient de ton compte ${state.kind === "apple" ? "Apple" : "Google"}`
                : undefined
            }
            onClick={() => show("pseudo")}
          >
            Modifier le pseudo
          </Button>
        </div>
      ) : connectOnly ? (
        <div className="identity-selector">
          <Button
            type="button"
            variant="secondary"
            className="identity-action"
            disabled={
              unavailable ||
              (!state.googleAvailable && !state.appleAvailable) ||
              !state.online ||
              signedIn
            }
            onClick={() => show("connect")}
          >
            Se connecter
          </Button>
        </div>
      ) : (
        choices
      )}
      <SheetContent
        side="bottom"
        className="identity-bottom-sheet z-[90]"
        overlayClassName="z-[85]"
      >
        <SheetHeader>
          <SheetTitle>
            {activePanel === "pseudo"
              ? profile
                ? "Modifier mon pseudo"
                : "Pseudo"
              : activePanel === "connect"
                ? "Se connecter"
                : "Ton profil"}
          </SheetTitle>
          <SheetDescription>
            {activePanel === "pseudo"
              ? "Choisis un pseudo et, si tu veux, une photo. Ton profil est partagé sur ce site."
              : activePanel === "connect"
                ? "Connecte ton compte Google ou Apple pour utiliser ton profil sur tout le site."
                : "Choisis un pseudo ou connecte ton compte."}
          </SheetDescription>
        </SheetHeader>
        <div className="identity-sheet-content identity-selector">
          {activePanel === "pseudo" ? (
            <LocalProfileForm
              initialName={draft?.name}
              onDone={() => setOpen(false)}
            />
          ) : activePanel === "connect" ? (
            <>
              <OAuthSignInButtons draft={draft} disabled={disabled} />
              {error}
            </>
          ) : (
            <>
              {choices}
              {open && error}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
