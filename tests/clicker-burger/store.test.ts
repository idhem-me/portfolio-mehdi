import test from "node:test";
import assert from "node:assert/strict";
import { createGameStore } from "../../src/features/clicker-burger/state/useGame";
import { initial, D } from "../../src/features/clicker-burger/engine/game";
import { visibleMissions } from "../../src/features/clicker-burger/data/missions";
function withStorage(run: (data: Map<string, string>) => void) {
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
    run(data);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("level popup follows a paid purchase, not revenue, loading or import", () => {
  withStorage((data) => {
    const a = createGameStore("test-a");
    const imported = initial();
    imported.earned = "249";
    imported.money = "5000";
    imported.stock = 1;
    a.replace(imported);
    assert.equal(a.getSnapshot().levelNotice, null);
    a.advance(1);
    assert.equal(a.getSnapshot().levelNotice, null);
    a.dispatch({ type: "level-up" });
    assert.equal(a.getSnapshot().levelNotice, 2);
    a.dismissLevel();
    assert.equal(a.getSnapshot().levelNotice, null);
    a.persist();
    const loaded = createGameStore("test-a");
    assert.equal(loaded.getSnapshot().levelNotice, null);
    assert(D(loaded.getSnapshot().state.earned).gte(249));
    assert(D(loaded.getSnapshot().state.earned).lte(257));
    const b = createGameStore("test-b");
    assert.equal(b.getSnapshot().state.money, "20");
    assert.equal(data.has("test-b"), false);
  });
});

test("import replace overwrites localStorage immediately without waiting for persist", () => {
  withStorage((data) => {
    const a = createGameStore("food-empire.save.v1");
    const old = initial();
    old.money = "111";
    old.earned = "222";
    a.replace(old);
    const imported = initial();
    imported.money = "95000";
    imported.earned = "185000";
    imported.research = ["recipe", "franchise", "ipo"];
    a.replace(imported);
    assert.equal(a.getSnapshot().state.money, "95000");
    const raw = data.get("food-empire.save.v1");
    assert(raw);
    assert.equal(JSON.parse(raw).money, "95000");
    assert.equal(JSON.parse(raw).earned, "185000");
    const reopened = createGameStore("food-empire.save.v1");
    assert.equal(reopened.getSnapshot().state.money, "95000");
    assert.deepEqual(reopened.getSnapshot().state.research, [
      "recipe",
      "franchise",
      "ipo",
    ]);
  });
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
