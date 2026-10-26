import { useCallback, useMemo, useSyncExternalStore } from "react";
const EVENT = "clicker-burger-notices";
export function useNotices(key: string) {
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("storage", notify);
    window.addEventListener(EVENT, notify);
    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener(EVENT, notify);
    };
  }, []);
  const snapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) || "{}";
    } catch {
      return "{}";
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const seen = useMemo(() => {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, string[]>)
        : {};
    } catch {
      return {};
    }
  }, [raw]);
  const mark = useCallback(
    (group: string, ids: string[]) => {
      let previous: Record<string, string[]> = {};
      try {
        previous = JSON.parse(localStorage.getItem(key) || "{}");
        if (
          !previous ||
          typeof previous !== "object" ||
          Array.isArray(previous)
        )
          previous = {};
        const next = {
          ...previous,
          [group]: Array.from(
            new Set([
              ...(Array.isArray(previous[group]) ? previous[group] : []),
              ...ids,
            ]),
          ),
        };
        const serialized = JSON.stringify(next);
        if (serialized === localStorage.getItem(key)) return;
        localStorage.setItem(key, serialized);
        window.dispatchEvent(new Event(EVENT));
      } catch {
        /* Notices are optional. */
      }
    },
    [key],
  );
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* Notices are optional. */
    }
  }, [key]);
  return { seen, mark, clear };
}
