export function safeGamePath(value: string | null | undefined) {
  return value &&
    /^\/(?:fr\/|en\/|zh\/|ar\/|es\/|it\/|de\/)?(?:jeux(?:\/(?:tetris|clicker-burger|cards))?|boutique)\/?$/.test(
      value,
    )
    ? value
    : "/jeux/tetris";
}
export function googleDisplayName(metadata: Record<string, unknown>) {
  const raw = metadata.name ?? metadata.full_name ?? metadata.given_name;
  if (typeof raw !== "string" || raw.includes("@")) return "Joueur Google";
  return (
    raw
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N} ._-]/gu, "")
      .trim()
      .slice(0, 20) || "Joueur Google"
  );
}
export function googleIdentity(
  user: {
    id: string;
    app_metadata?: { provider?: string };
    identities?: { provider?: string }[];
  } | null,
) {
  return user &&
    (user.app_metadata?.provider === "google" ||
      user.identities?.some((i) => i.provider === "google"))
    ? `google:${user.id}`
    : null;
}
export type OAuthProvider = "google" | "apple";
export function accountProvider(
  user: {
    app_metadata?: { provider?: string };
    identities?: { provider?: string }[];
  } | null,
): OAuthProvider | null {
  if (!user) return null;
  const provider = user.app_metadata?.provider;
  if (provider === "google" || provider === "apple") return provider;
  return (
    user.identities?.find(
      (identity) => identity.provider === "google" || identity.provider === "apple",
    )?.provider as OAuthProvider | undefined
  ) ?? null;
}
export function accountIdentity(
  user: ({ id: string } & Parameters<typeof accountProvider>[0]) | null,
) {
  const provider = accountProvider(user);
  return user && provider ? `${provider}:${user.id}` : null;
}
export function accountDisplayName(
  provider: OAuthProvider,
  metadata: Record<string, unknown>,
) {
  if (provider === "google") return googleDisplayName(metadata);
  const raw = metadata.name ?? metadata.full_name ?? metadata.given_name;
  if (typeof raw !== "string" || raw.includes("@")) return "Joueur Apple";
  return (
    raw
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N} ._-]/gu, "")
      .trim()
      .slice(0, 20) || "Joueur Apple"
  );
}
export function suggestedNickname(metadata: Record<string, unknown>) {
  const raw = metadata.given_name ?? metadata.name ?? metadata.full_name;
  if (typeof raw !== "string" || raw.includes("@")) return "Joueur";
  const first = raw
    .trim()
    .split(/\s+/)[0]
    .replace(/[^\p{L}\p{N}._-]/gu, "")
    .slice(0, 20);
  return first.length >= 2 ? first : "Joueur";
}
