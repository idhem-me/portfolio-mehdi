import { describe, expect, it } from "vitest";
import { formatCompact } from "../format";

describe("formatCompact", () => {
  it("gère k, M, Md et scientifique", () => {
    expect(formatCompact(42)).toBe("42");
    expect(formatCompact(1500)).toBe("1.5 k");
    expect(formatCompact(2_000_000)).toBe("2 M");
    expect(formatCompact(3_500_000_000)).toBe("3.5 Md");
    expect(formatCompact(1e15)).toMatch(/e\+?15/i);
  });
});
