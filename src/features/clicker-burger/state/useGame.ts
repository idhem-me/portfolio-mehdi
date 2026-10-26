import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  act,
  tick,
  buildingLevel,
  type State,
  type Action,
} from "../engine/game";
import { load } from "../systems/save";
export function createGameStore(key: string) {
  let snapshot = {
    key,
    ...load(key),
    saved: true,
    levelNotice: null as number | null,
  };
  const listeners = new Set<() => void>();
  const publish = (next: typeof snapshot) => {
    snapshot = next;
    listeners.forEach((fn) => fn());
  };
  const update = (fn: (s: State) => State) => {
    const next = fn(snapshot.state);
    if (next === snapshot.state) return;
    const prior = buildingLevel(snapshot.state),
      level = buildingLevel(next);
    publish({
      ...snapshot,
      state: next,
      levelNotice: level > prior ? level : snapshot.levelNotice,
    });
  };
  const persist = () => {
    if (snapshot.error) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ ...snapshot.state, lastSaved: Date.now() }),
      );
      if (!snapshot.saved) publish({ ...snapshot, saved: true });
    } catch {
      if (snapshot.saved) publish({ ...snapshot, saved: false });
    }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    update,
    persist,
    dispatch: (a: Action) => update((s) => act(s, a)),
    advance: (seconds: number) =>
      update((s) => ({ ...tick(s, seconds), lastSaved: Date.now() })),
    replace: (s: State) => {
      publish({
        ...snapshot,
        state: s,
        error: "",
        gain: "0",
        seconds: 0,
        levelNotice: null,
      });
      persist();
    },
    allowSave: () => publish({ ...snapshot, error: "" }),
    dismissLevel: () => publish({ ...snapshot, levelNotice: null }),
  };
}
export function useGame(key: string) {
  const store = useMemo(() => createGameStore(key), [key]);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  useEffect(() => {
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(),
        seconds = Math.floor((now - last) / 1000);
      if (seconds > 0) {
        last += seconds * 1000;
        store.advance(seconds);
      }
    }, 250);
    const saver = setInterval(store.persist, 5000);
    window.addEventListener("pagehide", store.persist);
    return () => {
      clearInterval(timer);
      clearInterval(saver);
      window.removeEventListener("pagehide", store.persist);
      store.persist();
    };
  }, [store]);
  const update = useCallback(
    (fn: (s: State) => State) => store.update(fn),
    [store],
  );
  return {
    ...snapshot,
    update,
    dispatch: store.dispatch,
    replace: store.replace,
    persist: store.persist,
    allowSave: store.allowSave,
    dismissLevel: store.dismissLevel,
  };
}
