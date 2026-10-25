export function safeGamePath(value: string | null | undefined) {
  return value &&
    /^\/(?:fr\/|en\/|zh\/|ar\/|es\/|it\/|de\/)?jeux\/tetris\/?$/.test(value)
    ? value
    : "/jeux/tetris";
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
