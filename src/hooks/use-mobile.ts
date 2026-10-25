import { useSyncExternalStore } from "react";
const query = "(max-width: 767px)";
function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
// Browser snapshot is read during hydration, without waiting for a Safari frame.
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
