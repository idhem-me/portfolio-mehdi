import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { componentCoverage, demoAnchors } from "../src/app/[locale]/(site)/playground/coverage";

test("production supports Aero while Liquid Glass stays experimental", () => {
  const output = execFileSync(process.execPath, [
    "--import", "tsx", "--input-type=module", "-e",
    `import { DESIGN_SYSTEMS, isDesignSystem } from './src/components/design-system/registry.ts';
     console.log(JSON.stringify({ ids: DESIGN_SYSTEMS.map(({id}) => id), aero: isDesignSystem('frutiger-aero'), glass: isDesignSystem('liquid-glass') }));`,
  ], { cwd: new URL("..", import.meta.url), env: { ...process.env, NODE_ENV: "production" }, encoding: "utf8" });
  assert.deepEqual(JSON.parse(output), {
    ids: ["mehdi", "fun", "frutiger-aero"], aero: true, glass: false,
  });
});

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
        assert.match(module, /^(provider|registry)$/);
      } else {
        assert.ok(validAnchors.has(anchor), `Missing demo anchor for ${module}`);
      }
    }
  }
});
