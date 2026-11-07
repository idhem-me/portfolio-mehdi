import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { componentCoverage, demoAnchors } from "../src/app/[locale]/(site)/playground/coverage";

test("each design system module has a Playground demo or an infrastructure exception", () => {
  const validAnchors = new Set<string>(Object.values(demoAnchors));
  assert.equal(validAnchors.size, Object.keys(demoAnchors).length, "Demo anchors must be unique");
  for (const [directory, entries] of Object.entries(componentCoverage)) {
    const files = readdirSync(new URL(`../src/components/${directory}/`, import.meta.url))
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => file.replace(/\.tsx?$/, ""))
      .sort();
    assert.deepEqual(Object.keys(entries).sort(), files, `Update Playground coverage for ${directory}`);
    for (const [module, anchor] of Object.entries(entries)) {
      if (anchor === null) {
        assert.equal(directory, "design-system");
        assert.match(module, /^(flags|provider)$/);
      } else {
        assert.ok(validAnchors.has(anchor), `Missing demo anchor for ${module}`);
      }
    }
  }
});
