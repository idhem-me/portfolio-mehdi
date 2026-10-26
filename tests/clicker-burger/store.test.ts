import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore } from "../../src/features/clicker-burger/state/useGame";
import { initial } from "../../src/features/clicker-burger/engine/game";
import { visibleMissions } from "../../src/features/clicker-burger/data/missions";
test("level popup is raised by earned progression, never by loading or importing a profile", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    },
  });
  try {
    const a = createGameStore("test-a");
    const imported = initial();
    imported.earned = "249";
    imported.stock = 1;
    a.replace(imported);
    assert.equal(a.getSnapshot().levelNotice, null);
    a.advance(1);
    assert.equal(a.getSnapshot().levelNotice, 2);
    a.dismissLevel();
    assert.equal(a.getSnapshot().levelNotice, null);
    a.persist();
    const loaded = createGameStore("test-a");
    assert.equal(loaded.getSnapshot().levelNotice, null);
    assert.equal(loaded.getSnapshot().state.earned, "253");
    const b = createGameStore("test-b");
    assert.equal(b.getSnapshot().state.money, "20");
    assert.equal(data.has("test-b"), false);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
test("mission history preserves older completed missions when a new earlier mission is added", () => {
  const s = initial();
  s.missionClaims = [
    "first-ten",
    "first-sales",
    "first-cook",
    "signature",
    "revenue",
    "franchise",
    "markets",
  ];
  const visible = visibleMissions(s);
  assert(visible.some((m) => m.id === "logistics"));
  assert(visible.some((m) => m.id === "markets"));
  assert.equal(
    visible.filter((m) => !s.missionClaims.includes(m.id)).length,
    1,
  );
});
