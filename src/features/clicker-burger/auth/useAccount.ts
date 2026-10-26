import type { PlayerProfile } from "@/features/account/client-store";
export type Profile = Pick<PlayerProfile, "key" | "name" | "avatar" | "kind">;
export function validProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const p = value as Profile;
  return (
    typeof p.name === "string" &&
    p.name.length <= 100 &&
    /^[a-f0-9]{64}$/.test(p.key) &&
    ["local", "google"].includes(p.kind) &&
    (p.avatar === null || typeof p.avatar === "string")
  );
}
export function accountSaveKey(profile: Profile | null) {
  return profile
    ? `clicker-burger.save.v1.${profile.key}`
    : "food-empire.save.v1";
}
