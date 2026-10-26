import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  act,
  tick,
  buildingLevel,
  initial,
  type State,
  type Action,
} from "../engine/game";
import { load } from "../systems/save";

type Snapshot = {
  key: string | null;
  state: State;
  saved: boolean;
  error: string;
  gain: string;
  seconds: number;
  levelNotice: number | null;
};

const idleSnapshot: Snapshot = {
  key: null,
  state: initial(0),
  saved: true,
  error: "",
  gain: "0",
  seconds: 0,
  levelNotice: null,
};

function writeSave(key: string, state: State) {
  localStorage.setItem(
    key,
    JSON.stringify({ ...state, lastSaved: Date.now() }),
  );
}

export function createGameStore(key: string) {
  let snapshot: Snapshot = {
    key,
    ...load(key),
    saved: true,
    levelNotice: null,
  };
  const listeners = new Set<() => void>();
  const publish = (next: Snapshot) => {
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
    if (snapshot.error || !snapshot.key) return;
    try {
      writeSave(snapshot.key, snapshot.state);
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
      const next: Snapshot = {
        ...snapshot,
        state: s,
        error: "",
        gain: "0",
        seconds: 0,
        levelNotice: null,
        saved: true,
      };
      try {
        writeSave(key, s);
      } catch {
        next.saved = false;
      }
      publish(next);
      return next.saved;
    },
    allowSave: () => publish({ ...snapshot, error: "" }),
    dismissLevel: () => publish({ ...snapshot, levelNotice: null }),
  };
}

export function useGame(key: string | null) {
  const store = useMemo(
    () => (key ? createGameStore(key) : null),
    [key],
  );
  const snapshot = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => idleSnapshot),
    () => idleSnapshot,
  );
  useEffect(() => {
    if (!store) return;
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
    (fn: (s: State) => State) => store?.update(fn),
    [store],
  );
  return {
    ...snapshot,
    ready: key !== null,
    update,
    dispatch: store?.dispatch ?? ((_: Action) => {}),
    replace: store?.replace ?? ((_: State) => false),
    persist: store?.persist ?? (() => {}),
    allowSave: store?.allowSave ?? (() => {}),
    dismissLevel: store?.dismissLevel ?? (() => {}),
  };
}
