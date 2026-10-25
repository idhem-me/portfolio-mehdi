"use client";
import "./player-profile.css";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ImagePlus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerIdentity } from "./player-identity";
import { GoogleSignIn } from "./google-sign-in";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  loadProfile,
  saveProfile,
  syncLocalScores,
  usePlayerProfile,
  useProfileLoaded,
} from "../profile/client-store";

const subscribeHydration = () => () => {};
async function encodePhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5_000_000
  )
    throw Error("Choisis une image JPEG, PNG ou WebP de moins de 5 Mo.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width > 6000 || bitmap.height > 6000) {
    bitmap.close();
    throw Error("Image trop grande.");
  }
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(Error("Conversion impossible.")),
      "image/webp",
      0.82,
    ),
  );
  if (blob.size > 180_000) throw Error("Photo trop lourde après compression.");
  return (
    "data:image/webp;base64," +
    (await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(Error("Lecture de la photo impossible."));
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(blob);
    }))
  );
}
export function PlayerProfileButton({
  className = "",
}: {
  className?: string;
}) {
  const profile = usePlayerProfile();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const identity = usePlayerIdentity();
  const loaded = useProfileLoaded();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [avatar, setAvatar] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setName(profile?.name ?? "");
      setAvatar(profile?.avatar ?? null);
    });
    return () => cancelAnimationFrame(frame);
  }, [profile]);
  const selectPhoto = async (value?: File) => {
    if (!value) return;
    setPhotoBusy(true);
    try {
      setAvatar(await encodePhoto(value));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Photo invalide.");
    } finally {
      setPhotoBusy(false);
    }
  };
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!hydrated}
        aria-label={
          profile
            ? "Profil joueur : " + profile.name
            : "Créer mon profil joueur"
        }
        className={"rounded-full " + className}
        onClick={() => {
          setName(profile?.name ?? "");
          setAvatar(profile?.avatar ?? null);
          setError("");
          setOpen(true);
        }}
      >
        <Avatar className="size-8">
          {profile?.avatar && <AvatarImage src={profile.avatar} alt="" />}
          <AvatarFallback>
            {profile?.name?.slice(0, 1).toUpperCase() ?? <UserRound />}
          </AvatarFallback>
        </Avatar>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="player-profile-sheet z-[90]">
          <SheetHeader>
            <SheetTitle>Profil joueur</SheetTitle>
            <SheetDescription>
              Ton pseudo et ta photo pour jouer.
            </SheetDescription>
          </SheetHeader>
          {!loaded && (
            <p role="status" className="px-6 text-sm">
              Chargement du profil…{" "}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void loadProfile(true)}
              >
                Réessayer
              </Button>
            </p>
          )}
          {loaded && !profile && (
            <div className="px-6 pt-2 space-y-4">
              <GoogleSignIn disabled={busy} />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}
          <form
            className="player-profile-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                await saveProfile(name, avatar);
                setOpen(false);
                void syncLocalScores();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Enregistrement impossible.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar size="lg">
                {avatar && <AvatarImage src={avatar} alt="" />}
                <AvatarFallback>
                  {name.slice(0, 1).toUpperCase() || <UserRound />}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={photoBusy || busy}
                  className="min-w-0 shrink whitespace-normal text-left h-auto min-h-(--control-height-sm)"
                  onClick={() => file.current?.click()}
                >
                  <ImagePlus />{" "}
                  {avatar
                    ? "Modifier ma photo de profil"
                    : "Ajouter une photo de profil"}
                </Button>
                {avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Supprimer la photo"
                    onClick={() => setAvatar(null)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <input
                ref={file}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void selectPhoto(event.target.files?.[0])}
              />
            </div>
            <label htmlFor="player-profile-name">Pseudo</label>
            <Input
              id="player-profile-name"
              minLength={2}
              maxLength={20}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="nickname"
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={busy || photoBusy || !loaded}
            >
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
          {profile?.kind === "google" && (
            <div className="px-6 pb-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={identity.logout}
              >
                Se déconnecter
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
