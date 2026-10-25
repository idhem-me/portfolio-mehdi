import { onboardingConfig, openingFor } from "../engine/opening";
let sessionClaimed = false;
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
/** Claim before spawning: abandoning the first game still counts as onboarding. */
export function claimOpening(storage?: StoragePort) {
  try {
    const store = storage ?? localStorage;
    const opening = openingFor(store.getItem(onboardingConfig.storageKey));
    if (opening.length) store.setItem(onboardingConfig.storageKey, "true");
    return opening;
  } catch {
    const opening = openingFor(sessionClaimed ? "true" : null);
    sessionClaimed = true;
    return opening;
  }
}
export function resetOpening(storage?: StoragePort) {
  try {
    (storage ?? localStorage).removeItem(onboardingConfig.storageKey);
  } catch {
    /* Private storage. */
  }
  sessionClaimed = false;
}
export function resetOpeningFromDevUrl() {
  if (process.env.NODE_ENV !== "development") return;
  const url = new URL(location.href);
  if (!url.searchParams.has("resetOnboarding")) return;
  resetOpening();
  url.searchParams.delete("resetOnboarding");
  history.replaceState(history.state, "", url);
}
