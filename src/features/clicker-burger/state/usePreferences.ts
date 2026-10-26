import { useCallback, useSyncExternalStore } from "react";
const KEY = "clicker-burger.level-popups";
const EVENT = "clicker-burger-preferences";
export function useLevelPopups() {
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("storage", notify);
    window.addEventListener(EVENT, notify);
    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener(EVENT, notify);
    };
  }, []);
  const read = useCallback(() => {
    try {
      return localStorage.getItem(KEY) !== "off";
    } catch {
      return true;
    }
  }, []);
  const enabled = useSyncExternalStore(subscribe, read, () => true);
  const setEnabled = useCallback((value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? "on" : "off");
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* Optional preference. */
    }
  }, []);
  return { enabled, setEnabled };
}
