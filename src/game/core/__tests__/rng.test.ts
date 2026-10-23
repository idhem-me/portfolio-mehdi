import { describe, expect, it } from "vitest";
import { mulberry32 } from "../rng";
import { createInitialCells } from "../grid";

describe("mulberry32", () => {
  it("est déterministe", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produit des valeurs dans [0, 1)", () => {
    const r = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("carte initiale", () => {
  it("génère la même grille pour la même seed", () => {
    const a = createInitialCells();
    const b = createInitialCells();
    expect(a).toEqual(b);
  });
});
