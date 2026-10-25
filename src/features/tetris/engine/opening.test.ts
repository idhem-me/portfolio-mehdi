import { test } from "node:test";
import assert from "node:assert/strict";
import { Game, emptyBoard } from "./game";
import { onboardingConfig, openingFor } from "./opening";
import { createPieceSource, PIECE_NAMES } from "./pieces";
import { claimOpening, resetOpening } from "../controls/onboarding";
import { silhouette } from "../render/silhouette";
test("reference opening permits a real four-line clear through normal actions", () => {
  const g = new Game(() => 0.4, onboardingConfig.sequence);
  let tetrises = 0;
  g.on((e) => {
    if (e.type === "tetris") tetrises++;
  });
  onboardingConfig.reference.forEach(({ x, rot }, index) => {
    assert.equal(g.current.piece, onboardingConfig.sequence[index]);
    for (let r = 0; r < rot; r++) g.action("cw");
    for (let i = 0; g.current.x !== x && i < 15; i++)
      g.action(g.current.x < x ? "right" : "left");
    assert.equal(g.current.x, x);
    g.action("hard");
    assert.equal(g.over, false);
  });
  assert.equal(g.lines, 4);
  assert.equal(tetrises, 1);
  assert.ok(g.score >= 800);
});
test("opening is selected only for absent storage and can be disabled", () => {
  assert.deepEqual(openingFor(null), onboardingConfig.sequence);
  assert.deepEqual(openingFor("true"), []);
  assert.deepEqual(openingFor("false"), []);
  assert.deepEqual(openingFor(null, false), []);
});
test("claim persists immediately and second game starts with standard 7-bag", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
  const first = claimOpening(storage);
  assert.equal(values.get(onboardingConfig.storageKey), "true");
  assert.deepEqual(first, onboardingConfig.sequence);
  const next = claimOpening(storage);
  assert.deepEqual(next, []);
  const g = new Game(() => 0.31, next);
  const names = [];
  for (let i = 0; i < 7; i++) {
    names.push(g.current.piece);
    g.action("hard");
    g.board = emptyBoard();
  }
  assert.deepEqual(names.sort(), [...PIECE_NAMES].sort());
  resetOpening(storage);
  assert.deepEqual(claimOpening(storage), onboardingConfig.sequence);
});
test("handoff avoids duplicate while preserving each standard 7-bag", () => {
  const source = createPieceSource(() => 0.3, onboardingConfig.sequence);
  const script = Array.from({ length: 10 }, () => source.next());
  assert.deepEqual(script, onboardingConfig.sequence);
  const first = Array.from({ length: 7 }, () => source.next());
  assert.notEqual(first[0], script[9]);
  assert.deepEqual(first.sort(), [...PIECE_NAMES].sort());
  assert.deepEqual(
    Array.from({ length: 7 }, () => source.next()).sort(),
    [...PIECE_NAMES].sort(),
  );
});
test("silhouette omits internal seams and preserves diagonal components", () => {
  const square = silhouette([
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]);
  assert.equal((square.match(/M/g) ?? []).length, 1);
  assert.equal((square.match(/Z/g) ?? []).length, 1);
  assert.ok(!square.includes("NaN"));
  const diagonal = silhouette([
    [0, 0],
    [1, 1],
  ]);
  assert.equal((diagonal.match(/M/g) ?? []).length, 2);
});
