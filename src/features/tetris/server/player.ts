import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { verifiedGoogleUser } from "./auth";
import { googleIdentity, googleDisplayName } from "../auth/identity";
import { store } from "./store";
export function googlePhoto(metadata: Record<string, unknown>) {
  try {
    const url = new URL(String(metadata.picture ?? metadata.avatar_url ?? ""));
    if (
      url.protocol === "https:" &&
      (url.hostname === "googleusercontent.com" ||
        url.hostname.endsWith(".googleusercontent.com"))
    )
      return url.toString();
  } catch {}
  return null;
}
export async function activePlayer(request: NextRequest) {
  const auth = await verifiedGoogleUser(request);
  const account = auth.user ? googleIdentity(auth.user) : null;
  const owner = account ?? request.cookies.get("lava-player")?.value ?? "";
  const custom = (
    !account && owner ? await (await store()).profile(owner) : null
  ) as {
    name: string;
    avatar: string | null;
  } | null;
  const profile =
    account && auth.user
      ? {
          name: googleDisplayName(auth.user.user_metadata),
          avatar: googlePhoto(auth.user.user_metadata),
        }
      : custom;
  return {
    auth,
    owner,
    profile: profile
      ? {
          ...profile,
          kind: account ? "google" : "local",
          key: createHash("sha256").update(owner).digest("hex"),
        }
      : null,
  };
}
